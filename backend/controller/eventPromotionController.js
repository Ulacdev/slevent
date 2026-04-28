import supabase from '../database/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { getEventLikeCountsMap } from './eventLikeController.js';

const DEFAULT_PROMOTION_DURATION_DAYS = 7;
const emptyQuotaResponse = () => ({
  limit: 0,
  used: 0,
  remaining: 0,
  durationDays: DEFAULT_PROMOTION_DURATION_DAYS,
  canPromote: false
});

/**
 * Toggle event promotion on/off
 * Creates a promoted_events record with expiration based on plan duration
 */
export const toggleEventPromotion = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { eventId } = req.params;
    const { eventIds, customExpiresAt } = req.body; // Support bulk and custom dates

    // Determine IDs to process
    const idsToProcess = eventId ? [eventId] : (eventIds || []);
    if (idsToProcess.length === 0) return res.status(400).json({ error: 'Event ID(s) required' });

    // Check authorization & Admin bypass
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('userId', userId)
      .maybeSingle();

    const isAdmin = 
      String(userData?.role || '').toUpperCase() === 'ADMIN' || 
      String(req.user?.role || '').toUpperCase() === 'ADMIN';

    // Fetch events to check ownership/organizer
    const { data: events, error: eventsErr } = await supabase
      .from('events')
      .select('eventId, createdBy, organizerId')
      .in('eventId', idsToProcess);

    if (eventsErr) throw eventsErr;
    if (!events || events.length === 0) return res.status(404).json({ error: 'Events not found' });

    const results = [];

    for (const event of events) {
      const createdByUser = event.createdBy === userId;
      const isEventOrganizer = event.organizerId === userId || (event.organizerId && event.organizerId.includes(userId));
      
      if (!isAdmin && !createdByUser && !isEventOrganizer) {
        results.push({ eventId: event.eventId, success: false, error: 'Not authorized' });
        continue;
      }

      // Get organizer's subscription and plan (for non-admins)
      let organizerId = event.organizerId;
      let promotionDurationDays = DEFAULT_PROMOTION_DURATION_DAYS;
      let maxPromotedEvents = isAdmin ? 999999 : 0;

      if (!isAdmin) {
        const { data: organizer, error: orgErr } = await supabase
          .from('organizers')
          .select('organizerId, currentPlanId')
          .eq('ownerUserId', userId)
          .maybeSingle();

        if (orgErr) throw orgErr;
        if (!organizer) {
           results.push({ eventId: event.eventId, success: false, error: 'Not an organizer' });
           continue;
        }
        organizerId = organizer.organizerId;

        if (!organizer.currentPlanId) {
          results.push({ eventId: event.eventId, success: false, error: 'Promotion not available on plan' });
          continue;
        }

        const { data: planFeatures, error: planErr } = await supabase
          .from('planFeatures')
          .select('key, value')
          .eq('planId', organizer.currentPlanId);

        if (planErr) throw planErr;

        (planFeatures || []).forEach(feat => {
          if (feat.key === 'max_promoted_events') {
            const parsed = Number.parseInt(feat.value, 10);
            if (Number.isFinite(parsed) && parsed >= 0) maxPromotedEvents = parsed;
          }
          if (feat.key === 'promotion_duration_days') {
            const parsed = Number.parseInt(feat.value, 10);
            if (Number.isFinite(parsed) && parsed > 0) promotionDurationDays = parsed;
          }
        });
      } else {
         organizerId = event.organizerId || null;
      }

      // Check if promotion exists
      let promoQuery = supabase
        .from('promoted_events')
        .select('promotion_id')
        .eq('eventId', event.eventId)
        .gte('expires_at', new Date().toISOString());

      if (organizerId) {
        promoQuery = promoQuery.eq('organizerId', organizerId);
      }
      
      const { data: existingPromo, error: checkErr } = await promoQuery.maybeSingle();

      if (existingPromo && !customExpiresAt) { // Only toggle off if no custom date is provided
        const { error: deleteErr } = await supabase
          .from('promoted_events')
          .delete()
          .eq('promotion_id', existingPromo.promotion_id);

        if (deleteErr) throw deleteErr;

        await logAudit({
          actionType: 'EVENT_PROMOTION_REMOVED',
          details: { eventId: event.eventId, organizerId: organizerId || 'system-admin' },
          req
        });

        results.push({ eventId: event.eventId, promoted: false, message: 'Event promotion removed' });
        continue;
      }

      // If custom date is provided, we might want to update or insert
      // Check promotion limit (skip for admins)
      if (!isAdmin && organizerId) {
        const { data: activePromos, error: countErr } = await supabase
          .from('promoted_events')
          .select('promotion_id')
          .eq('organizerId', organizerId)
          .gte('expires_at', new Date().toISOString());

        if (countErr && countErr.code !== 'PGRST116') throw countErr;
        const activePromoCount = (activePromos || []).length;

        if (maxPromotedEvents > 0 && activePromoCount >= maxPromotedEvents && !existingPromo) {
          results.push({ eventId: event.eventId, success: false, error: 'Limit reached' });
          continue;
        }
      }

      // Create or Update promotion
      const now = new Date();
      let expiresAt;
      if (customExpiresAt) {
        expiresAt = new Date(customExpiresAt);
      } else {
        expiresAt = new Date(now.getTime() + promotionDurationDays * 24 * 60 * 60 * 1000);
      }

      const promoData = {
        eventId: event.eventId,
        organizerId: organizerId || (isAdmin ? null : organizerId),
        created_by: userId,
        expires_at: expiresAt.toISOString(),
        duration_days: customExpiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : promotionDurationDays
      };

      let opError;
      let finalPromo;

      if (existingPromo) {
        const { data, error } = await supabase
          .from('promoted_events')
          .update({ expires_at: promoData.expires_at, duration_days: promoData.duration_days })
          .eq('promotion_id', existingPromo.promotion_id)
          .select('promotion_id, expires_at')
          .single();
        opError = error;
        finalPromo = data;
      } else {
        const { data, error } = await supabase
          .from('promoted_events')
          .insert({ ...promoData, createdAt: now.toISOString() })
          .select('promotion_id, expires_at')
          .single();
        opError = error;
        finalPromo = data;
      }

      if (opError) throw opError;

      await logAudit({
        actionType: existingPromo ? 'EVENT_PROMOTION_UPDATED' : 'EVENT_PROMOTION_CREATED',
        details: { eventId: event.eventId, organizerId: organizerId || 'system-admin', expiresAt },
        req
      });

      results.push({
        eventId: event.eventId,
        promoted: true,
        promotionId: finalPromo.promotion_id,
        expiresAt: finalPromo.expires_at,
        message: existingPromo ? 'Promotion extended' : `Event promoted until ${expiresAt.toDateString()}`
      });
    }

    // Return individual result if single ID, otherwise return array
    if (eventId && results.length === 1) {
       return res.json(results[0]);
    }
    return res.json({ success: true, results });

  } catch (error) {
    console.error('toggleEventPromotion error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to toggle promotion' });
  }
};

/**
 * Get promotion status for an event
 */
export const getEventPromotionStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!eventId) return res.status(400).json({ error: 'Event ID required' });

    const { data: promo, error: promoErr } = await supabase
      .from('promoted_events')
      .select('promotion_id, expires_at, createdAt')
      .eq('eventId', eventId)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (promoErr && promoErr.code !== 'PGRST116') throw promoErr;

    if (!promo) {
      return res.json({ promoted: false });
    }

    const now = new Date();
    const expiresAt = new Date(promo.expires_at);
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

    return res.json({
      promoted: true,
      promotionId: promo.promotion_id,
      expiresAt: promo.expires_at,
      remainingDays: Math.max(0, remainingDays),
      createdAt: promo.createdAt
    });
  } catch (error) {
    console.error('getEventPromotionStatus error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to get promotion status' });
  }
};

/**
 * Get all promoted events (for landing page)
 */
export const getPromotedEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const { data: promotedEventIds, error: promoErr } = await supabase
      .from('promoted_events')
      .select('eventId')
      .gte('expires_at', new Date().toISOString())
      .limit(limit);

    if (promoErr && promoErr.code !== 'PGRST116') throw promoErr;

    if (!promotedEventIds || promotedEventIds.length === 0) {
      return res.json({ events: [] });
    }

    const eventIds = promotedEventIds.map(p => p.eventId);

    // Get the events
    const { data: events, error: eventsErr } = await supabase
      .from('events')
      .select('*')
      .in('eventId', eventIds)
      .eq('status', 'PUBLISHED')
      .eq('is_archived', false);

    if (eventsErr) throw eventsErr;

    // Get ticket types for these events
    const { data: ticketTypes } = await supabase
      .from('ticketTypes')
      .select('*')
      .in('eventId', eventIds)
      .eq('status', true);

    const ttMap = new Map();
    (ticketTypes || []).forEach(tt => {
      const list = ttMap.get(tt.eventId) || [];
      list.push(tt);
      ttMap.set(tt.eventId, list);
    });

    // Get likes count
    const likeCountsMap = await getEventLikeCountsMap(eventIds);

    // Fetch registration counts
    let regCountMap = new Map();
    const { data: attendees } = await supabase
      .from('attendees')
      .select('eventId')
      .in('eventId', eventIds);
    (attendees || []).forEach(att => {
      regCountMap.set(att.eventId, (regCountMap.get(att.eventId) || 0) + 1);
    });

    // Performance Optimization: Batch fetch organizers instead of N+1 loop
    const organizerIds = [...new Set((events || []).map(e => e.organizerId).filter(Boolean))];
    let organizerMap = new Map();

    if (organizerIds.length > 0) {
      const { data: orgs } = await supabase
        .from('organizers')
        .select('organizerId, organizerName, profileImageUrl, bio, website, followersCount')
        .in('organizerId', organizerIds);
      
      (orgs || []).forEach(o => organizerMap.set(o.organizerId, o));
    }

    const eventsWithOrganizers = (events || []).map(event => ({
      ...event,
      ticketTypes: ttMap.get(event.eventId) || [],
      likesCount: likeCountsMap.get(event.eventId) || 0,
      registrationCount: regCountMap.get(event.eventId) || 0,
      organizer: organizerMap.get(event.organizerId) || null
    }));

    return res.json({ events: eventsWithOrganizers });
  } catch (error) {
    console.error('getPromotedEvents error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to get promoted events' });
  }
};

/**
 * Get promotion quota for organizer
 */
export const getPromotionQuota = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // Get organizer
    const { data: organizer, error: orgErr } = await supabase
      .from('organizers')
      .select('organizerId, currentPlanId')
      .eq('ownerUserId', userId)
      .maybeSingle();

    if (orgErr) throw orgErr;
    if (!organizer) return res.status(403).json({ error: 'Not an organizer' });
    if (!organizer.currentPlanId) return res.json(emptyQuotaResponse());

    // Get plan features
    const { data: planFeatures, error: planErr } = await supabase
      .from('planFeatures')
      .select('key, value')
      .eq('planId', organizer.currentPlanId);

    if (planErr) throw planErr;

    let maxPromotedEvents = 0;
    let promotionDurationDays = DEFAULT_PROMOTION_DURATION_DAYS;

    (planFeatures || []).forEach(feat => {
      if (feat.key === 'max_promoted_events') {
        const parsed = Number.parseInt(feat.value, 10);
        if (Number.isFinite(parsed) && parsed >= 0) maxPromotedEvents = parsed;
      }
      if (feat.key === 'promotion_duration_days') {
        const parsed = Number.parseInt(feat.value, 10);
        if (Number.isFinite(parsed) && parsed > 0) promotionDurationDays = parsed;
      }
    });

    // Count active promotions
    const { data: activePromos, error: countErr } = await supabase
      .from('promoted_events')
      .select('promotion_id')
      .eq('organizerId', organizer.organizerId)
      .gte('expires_at', new Date().toISOString());

    if (countErr && countErr.code === '42P01') {
      return res.json(emptyQuotaResponse());
    }
    if (countErr && countErr.code !== 'PGRST116') throw countErr;
    const used = (activePromos || []).length;

    return res.json({
      limit: maxPromotedEvents,
      used,
      remaining: maxPromotedEvents - used,
      durationDays: promotionDurationDays,
      canPromote: maxPromotedEvents > 0 && used < maxPromotedEvents
    });
  } catch (error) {
    console.error('getPromotionQuota error:', error);
    if (error?.code === '42P01') {
      return res.json(emptyQuotaResponse());
    }
    return res.status(500).json({ error: error?.message || 'Failed to get promotion quota' });
  }
};

/**
 * Get the current organizer's active promoted events with expiry data
 * GET /api/promotions/my-promoted-events
 */
export const getMyPromotedEvents = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // Get organizer
    const { data: organizer, error: orgErr } = await supabase
      .from('organizers')
      .select('organizerId')
      .eq('ownerUserId', userId)
      .maybeSingle();

    if (orgErr) throw orgErr;
    if (!organizer) return res.json({ promotedEvents: [] });

    // Get active promotions for this organizer
    const { data: promotions, error: promoErr } = await supabase
      .from('promoted_events')
      .select('promotion_id, eventId, createdAt, expires_at, duration_days')
      .eq('organizerId', organizer.organizerId)
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });

    if (promoErr && promoErr.code !== 'PGRST116') throw promoErr;
    if (!promotions || promotions.length === 0) return res.json({ promotedEvents: [] });

    // Get event details for these promotions
    const eventIds = promotions.map(p => p.eventId);
    const { data: events, error: eventsErr } = await supabase
      .from('events')
      .select('eventId, eventName, slug, imageUrl, startAt, status')
      .in('eventId', eventIds);

    if (eventsErr) throw eventsErr;

    const eventMap = new Map();
    (events || []).forEach(e => eventMap.set(e.eventId, e));

    const now = new Date();
    const promotedEvents = promotions.map(promo => {
      const event = eventMap.get(promo.eventId) || {};
      const expiresAt = new Date(promo.expires_at);
      const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

      return {
        promotionId: promo.promotion_id,
        eventId: promo.eventId,
        eventName: event.eventName || 'Unknown Event',
        slug: event.slug || '',
        imageUrl: event.imageUrl || null,
        startAt: event.startAt || null,
        eventStatus: event.status || 'UNKNOWN',
        createdAt: promo.createdAt,
        expiresAt: promo.expires_at,
        durationDays: promo.duration_days,
        remainingDays,
        remainingHours,
        remainingMs,
      };
    });

    return res.json({ promotedEvents });
  } catch (error) {
    console.error('getMyPromotedEvents error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to get promoted events' });
  }
};
