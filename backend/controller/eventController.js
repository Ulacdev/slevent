import supabase from '../database/db.js';
import { enrichEventsWithOrganizer } from '../utils/organizerData.js';
import { getEventLikeCountsMap } from './eventLikeController.js';
import crypto from 'crypto';

// Helper to get real profile picture from email using unavatar
const getEmailProfileUrl = (email, name = '') => {
  const cleanEmail = email.trim().toLowerCase();

  // Gmail-like palette for fallback
  const colors = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
    '#ff5722', '#795548', '#9e9e9e', '#607d8b'
  ];

  // Deterministic color based on email string
  let hash = 0;
  for (let i = 0; i < cleanEmail.length; i++) {
    hash = cleanEmail.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];

  const seed = (name || cleanEmail).split(' ')[0] || 'Attendee';
  const fallback = encodeURIComponent(`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${color.replace('#', '')}&textColor=ffffff&fontWeight=900`);

  // Unavatar will return a real profile pic from Google, Gravatar, Twitter, or GitHub for that email.
  return `https://unavatar.io/${cleanEmail}?fallback=${fallback}`;
};

// Utility: filter events by registration window if provided
function withinRegistrationWindow(event) {
  const now = new Date();
  const open = event.regOpenAt ? new Date(event.regOpenAt) : null;
  const close = event.regCloseAt ? new Date(event.regCloseAt) : null;
  if (open && now < open) return false;
  if (close && now > close) return false;
  return true;
}

// Utility: filter ticket types by sales window if provided
function withinSalesWindow(tt) {
  const now = new Date();
  const start = tt.salesStartAt ? new Date(tt.salesStartAt) : null;
  const end = tt.salesEndAt ? new Date(tt.salesEndAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

// Utility: group ticketTypes by eventId
function attachTicketTypes(events, ticketTypes) {
  const map = new Map();
  for (const tt of ticketTypes) {
    const list = map.get(tt.eventId) || [];
    list.push(tt);
    map.set(tt.eventId, list);
  }
  return events.map(e => ({ ...e, ticketTypes: map.get(e.eventId) || [] }));
}

const UUID_V4_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fetchEventByIdentifier(identifier) {
  const bySlug = await supabase
    .from('events')
    .select('*')
    .eq('slug', identifier)
    .limit(1);

  if (bySlug.error) return { error: bySlug.error, event: null };
  const slugEvent = (bySlug.data || [])[0];
  if (slugEvent) return { error: null, event: slugEvent };

  if (!UUID_V4_LIKE.test(identifier)) return { error: null, event: null };

  const byId = await supabase
    .from('events')
    .select('*')
    .eq('eventId', identifier)
    .limit(1);

  if (byId.error) return { error: byId.error, event: null };
  return { error: null, event: (byId.data || [])[0] || null };
}

export const listLiveEvents = async (req, res) => {
  try {
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'PUBLISHED')
      .eq('is_archived', false)
      .order('startAt', { ascending: false });

    if (eventsError) return res.status(500).json({ error: eventsError.message });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const filteredEvents = (events || []).filter(e => {
      if (!e.streaming_url || e.streaming_url.trim() === '') return false;
      return true;
    });

    const enrichedEvents = await enrichEventsWithOrganizer(filteredEvents);
    return res.json({ success: true, data: enrichedEvents });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const listEvents = async (req, res) => {
  try {
    const statusStr = req.query.status ? req.query.status.toString() : 'PUBLISHED,LIVE';
    const statuses = statusStr.split(',');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').toString().trim();
    const location = (req.query.location || '').toString().trim();
    const organizerId = (req.query.organizerId || '').toString().trim();

    // Advanced filters
    const category = req.query.category;
    const price = req.query.price; // 'free' | 'paid'
    const format = req.query.format; // 'online' | 'in-person'
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const sortBy = req.query.sortBy;

    // 1) Fetch candidate events
    let query = supabase.from('events').select('*').eq('is_archived', false);
    if (statuses.length > 0) query = query.in('status', statuses);
    if (organizerId) query = query.eq('organizerId', organizerId);

    if (search) {
      query = query.or(`eventName.ilike.%${search}%,locationText.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (location) {
      if (location === 'Online Events') {
        query = query.in('locationType', ['ONLINE', 'HYBRID']);
      } else {
        query = query.ilike('locationText', `%${location}%`);
      }
    }

    if (format === 'online') {
      query = query.in('locationType', ['ONLINE', 'HYBRID']);
    } else if (format === 'in-person') {
      query = query.eq('locationType', 'IN_PERSON');
    }

    const { data: events, error: eventsError } = await query;
    if (eventsError) return res.status(500).json({ error: eventsError.message });

    // 2) Fetch ticket types for all candidate events (required for price filtering and return)
    const allEventIds = (events || []).map(e => e.eventId);
    let allTicketTypes = [];
    if (allEventIds.length > 0) {
      const { data: ttData } = await supabase
        .from('ticketTypes')
        .select('*')
        .eq('status', true)
        .in('eventId', allEventIds);
      allTicketTypes = ttData || [];
    }
    const ttMap = new Map();
    allTicketTypes.forEach(tt => {
      const list = ttMap.get(tt.eventId) || [];
      list.push(tt);
      ttMap.set(tt.eventId, list);
    });

    // 3) Apply JS-side filters (Date, Price, Category)
    let filtered = events || [];

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(e => new Date(e.startAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(e => new Date(e.startAt) <= end);
    }

    if (price === 'free' || price === 'paid') {
      filtered = filtered.filter(e => {
        const etts = ttMap.get(e.eventId) || [];
        const minPrice = etts.length ? Math.min(...etts.map(t => t.priceAmount)) : 0;
        return price === 'free' ? minPrice === 0 : minPrice > 0;
      });
    }

    // Category filtering (Keyword based - simplistic replicate of frontend logic)
    if (category && category !== 'all') {
      // Replicate some keywords for common categories if needed, or better:
      // The frontend could pass keywords in search, but search is already used.
      // For now, we'll just check if the category name itself appears in the event text if it's a specific category.
      const catLower = category.toLowerCase();
      filtered = filtered.filter(e => {
        const source = `${e.eventName} ${e.description} ${e.locationText}`.toLowerCase();
        // This is a minimal implementation of the frontend's keyword system
        return source.includes(catLower);
      });
    }

    // 4) Rank and Paginate
    const filteredEventIds = filtered.map(e => e.eventId);
    const allLikeCountMap = await getEventLikeCountsMap(filteredEventIds);

    let ranked = [...filtered].sort((a, b) => {
      if (sortBy === 'trending') {
        const likeDiff = (allLikeCountMap.get(b.eventId) || 0) - (allLikeCountMap.get(a.eventId) || 0);
        if (likeDiff !== 0) return likeDiff;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }

      if (sortBy === 'date_soon') return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      if (sortBy === 'newest' || sortBy === 'relevance' || !sortBy) {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }

      const likeDiff = (allLikeCountMap.get(b.eventId) || 0) - (allLikeCountMap.get(a.eventId) || 0);
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    const total = ranked.length;
    const totalPages = total ? Math.ceil(total / limit) : 1;
    const pagedEvents = ranked.slice(offset, offset + limit);

    if (pagedEvents.length === 0) {
      return res.json({ events: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    // 5) Build final response objects
    const eventIdsForPage = pagedEvents.map(e => e.eventId);
    // Already have ticket types in ttMap, so we can just use those.

    // Fetch registration counts for page
    let regCountMap = new Map();
    const { data: attendees } = await supabase
      .from('attendees')
      .select('eventId')
      .in('eventId', eventIdsForPage);
    (attendees || []).forEach(att => {
      regCountMap.set(att.eventId, (regCountMap.get(att.eventId) || 0) + 1);
    });

    // Fetch promotion status for events on this page
    const { data: pagePromotedData } = await supabase
      .from('promoted_events')
      .select('*')
      .in('eventId', eventIdsForPage)
      .gte('expires_at', new Date().toISOString());

    const pagePromotedMap = new Map();
    (pagePromotedData || []).forEach(p => pagePromotedMap.set(p.eventId, p));

    // Fetch attendee avatars for the page (Real-time integration)
    // We fetch attendees and their associated user images if available
    let attendeeAvatarsMap = new Map();
    const { data: pageAttendees } = await supabase
      .from('attendees')
      .select('eventId, email, name')
      .in('eventId', eventIdsForPage)
      .order('createdAt', { ascending: false });

    if (pageAttendees && pageAttendees.length > 0) {
      const allAttendeeEmails = [...new Set(pageAttendees.map(a => a.email))];
      const { data: usersWithImages } = await supabase
        .from('users')
        .select('email, imageUrl')
        .in('email', allAttendeeEmails);

      const userImageMap = new Map();
      (usersWithImages || []).forEach(u => {
        if (u.imageUrl) userImageMap.set(u.email, u.imageUrl);
      });

      pageAttendees.forEach(att => {
        const avatars = attendeeAvatarsMap.get(att.eventId) || [];
        if (avatars.length < 4) {
          const avatarUrl = userImageMap.get(att.email) || getEmailProfileUrl(att.email, att.name);
          avatars.push(avatarUrl);
          attendeeAvatarsMap.set(att.eventId, avatars);
        }
      });
    }

    const withTicketTypes = pagedEvents.map(e => {
      const usableTTs = ttMap.get(e.eventId) || [];
      return {
        ...e,
        is_promoted: !!pagePromotedMap.has(e.eventId),
        promotionEndDate: pagePromotedMap.get(e.eventId)?.expires_at || null,
        ticketTypes: usableTTs,
        registrationCount: regCountMap.get(e.eventId) || 0,
        likesCount: allLikeCountMap.get(e.eventId) || 0,
        attendeeAvatars: attendeeAvatarsMap.get(e.eventId) || [],
      };
    });

    const enrichedEvents = await enrichEventsWithOrganizer(withTicketTypes);

    return res.json({
      events: enrichedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const getEventBySlug = async (req, res) => {
  try {
    const identifier = req.params.slug || req.params.id || req.params.identifier;

    // 1) Fetch event by slug first, then by eventId if identifier looks like UUID.
    console.log(`🔍 [Event Slug] Fetching identifier: ${identifier}`);
    const { event, error: eventError } = await fetchEventByIdentifier(identifier);
    if (eventError) {
      console.error('❌ [Event Slug] Fetch identifier error:', eventError);
      return res.status(500).json({ error: eventError.message });
    }
    if (!event) {
      console.log(`⚠️ [Event Slug] Event not found: ${identifier}`);
      return res.status(404).json({ error: 'Event not found' });
    }
    console.log(`✅ [Event Slug] Found event: ${event.eventId} (${event.eventName})`);

    // 2) Fetch ticket types for this event
    const { data: ticketTypes, error: ttError } = await supabase
      .from('ticketTypes')
      .select('*')
      .eq('status', true)
      .eq('eventId', event.eventId);

    if (ttError) {
      console.error('❌ [Event Slug] Ticket types error:', ttError);
      return res.status(500).json({ error: ttError.message });
    }

    // 3) Fetch promotion data
    const { data: promotion } = await supabase
      .from('promoted_events')
      .select('*')
      .eq('eventId', event.eventId)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    // 4) Attach tickets and return
    // Note: we no longer strictly filter by sales window here so they show up in UI
    // The frontend or registration logic handles the actual validity of the sale.
    const usableTicketTypes = ticketTypes || [];

    console.log(`🔍 [Event Slug] Fetching like counts...`);
    const likeCounts = await getEventLikeCountsMap([event.eventId]);

    console.log(`🔍 [Event Slug] Enriching with organizer...`);
    const [enrichedEvent] = await enrichEventsWithOrganizer([{
      ...event,
      is_promoted: !!promotion,
      promotionEndDate: promotion?.expires_at || null,
      ticketTypes: usableTicketTypes,
      likesCount: likeCounts.get(event.eventId) || 0,
    }]);

    console.log(`✅ [Event Slug] Success: ${identifier}`);
    return res.json(enrichedEvent || {
      ...event,
      ticketTypes: usableTicketTypes,
      likesCount: likeCounts.get(event.eventId) || 0,
    });
  } catch (err) {
    console.error('❌ [Event Slug] Error:', err);
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

/**
 * GET /api/events/feed - Returns mixed promoted + regular events
 * Query params: page, limit, location, search, category
 */
export const getEventsFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').toString().trim();
    const location = (req.query.location || '').toString().trim();

    // Build base query for active, published events
    let query = supabase.from('events').select('*').eq('is_archived', false).eq('status', 'PUBLISHED');

    if (search) {
      query = query.or(`eventName.ilike.%${search}%,locationText.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (location && location !== 'Online Events') {
      query = query.ilike('locationText', `%${location}%`);
    } else if (location === 'Online Events') {
      query = query.in('locationType', ['ONLINE', 'HYBRID']);
    }

    // Fetch events ordered by promoted first, then by start date
    const { data: allEvents, error: eventsErr } = await query
      .order('startAt', { ascending: true });

    if (eventsErr) throw eventsErr;

    // Get promotion data for all events
    const eventIds = (allEvents || []).map(e => e.eventId);
    let promotedEventsMap = new Map();

    if (eventIds.length > 0) {
      const { data: promotedData } = await supabase
        .from('promoted_events')
        .select('*')
        .in('eventId', eventIds)
        .gte('expires_at', new Date().toISOString());

      (promotedData || []).forEach(p => {
        promotedEventsMap.set(p.eventId, p);
      });
    }

    // Enrich events with promotion data
    const enrichedEvents = (allEvents || []).map(event => ({
      ...event,
      is_promoted: !!promotedEventsMap.has(event.eventId),
      promotionEndDate: promotedEventsMap.get(event.eventId)?.expires_at || null,
    }));

    // Sort: promoted first, then by start date
    enrichedEvents.sort((a, b) => {
      if (a.is_promoted !== b.is_promoted) {
        return a.is_promoted ? -1 : 1; // promoted first
      }
      return new Date(a.startAt) - new Date(b.startAt);
    });

    // Apply pagination
    const paginatedEvents = enrichedEvents.slice(offset, offset + limit);

    // Get ticket types for matching events
    const { data: ticketTypes } = await supabase
      .from('ticketTypes')
      .select('*')
      .in('eventId', eventIds)
      .eq('status', true);

    const ttMapForFeed = new Map();
    (ticketTypes || []).forEach(tt => {
      const list = ttMapForFeed.get(tt.eventId) || [];
      list.push(tt);
      ttMapForFeed.set(tt.eventId, list);
    });

    // Enrich with organizer data
    const enrichedWithOrganizer = await enrichEventsWithOrganizer(paginatedEvents);

    // Get likes count
    const paginatedEventIds = (paginatedEvents || []).map(e => e.eventId);
    const likeCountsMap = await getEventLikeCountsMap(paginatedEventIds);

    // Fetch registration counts
    let regCountMap = new Map();
    const { data: attendees } = await supabase
      .from('attendees')
      .select('eventId')
      .in('eventId', paginatedEventIds);
    (attendees || []).forEach(att => {
      regCountMap.set(att.eventId, (regCountMap.get(att.eventId) || 0) + 1);
    });

    // Fetch attendee avatars for feed
    let attendeeAvatarsMapFeed = new Map();
    const { data: feedAttendees } = await supabase
      .from('attendees')
      .select('eventId, email, name')
      .in('eventId', paginatedEventIds)
      .order('createdAt', { ascending: false });

    if (feedAttendees && feedAttendees.length > 0) {
      const allEmails = [...new Set(feedAttendees.map(a => a.email))];
      const { data: usersImages } = await supabase
        .from('users')
        .select('email, imageUrl')
        .in('email', allEmails);

      const imgMap = new Map();
      (usersImages || []).forEach(u => {
        if (u.imageUrl) imgMap.set(u.email, u.imageUrl);
      });

      feedAttendees.forEach(att => {
        const avatars = attendeeAvatarsMapFeed.get(att.eventId) || [];
        if (avatars.length < 4) {
          const avatarUrl = imgMap.get(att.email) || getEmailProfileUrl(att.email, att.name);
          avatars.push(avatarUrl);
          attendeeAvatarsMapFeed.set(att.eventId, avatars);
        }
      });
    }

    const finalEvents = enrichedWithOrganizer.map(e => ({
      ...e,
      ticketTypes: ttMapForFeed.get(e.eventId) || [],
      likesCount: likeCountsMap.get(e.eventId) || 0,
      registrationCount: regCountMap.get(e.eventId) || 0,
      attendeeAvatars: attendeeAvatarsMapFeed.get(e.eventId) || [],
    }));

    return res.json({
      events: finalEvents,
      pagination: {
        page,
        limit,
        total: enrichedEvents.length,
        totalPages: Math.ceil(enrichedEvents.length / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch events feed' });
  }
};

/**
 * GET /api/events/:id/details - Returns event details with promotion + review data
 */
export const getEventDetails = async (req, res) => {
  try {
    const eventId = req.params.id;
    if (!eventId) return res.status(400).json({ error: 'Event ID required' });

    // Fetch event
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('*')
      .eq('eventId', eventId)
      .maybeSingle();

    if (eventErr) throw eventErr;
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Fetch promotion data
    const { data: promotion } = await supabase
      .from('promoted_events')
      .select('*')
      .eq('eventId', eventId)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    // Fetch reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('eventId', eventId)
      .order('created_at', { ascending: false });

    // Calculate rating
    const avgRating = reviews && reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : 0;

    // Fetch organizer data
    const { data: organizer } = await supabase
      .from('organizers')
      .select('*')
      .eq('organizerId', event.organizerId)
      .maybeSingle();

    // Fetch analytics for social proof
    const { data: analytics } = await supabase
      .from('event_analytics')
      .select('*')
      .eq('eventId', eventId)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    const viewsWeek = (analytics || []).reduce((sum, a) => sum + (a.views || 0), 0);

    // Fetch total orders for this event
    const { data: orders } = await supabase
      .from('orders')
      .select('orderId')
      .eq('eventId', eventId)
      .eq('status', 'completed');

    // Like count
    const { data: likes } = await supabase
      .from('event_likes')
      .select('likeId')
      .eq('eventId', eventId);

    // Enrich event with all data
    const enrichedEvent = {
      ...event,
      is_promoted: !!promotion,
      promotionEndDate: promotion?.expires_at || null,
      organizer,
      reviews: (reviews || []).slice(0, 10), // Top 10 reviews
      avgRating: parseFloat(avgRating),
      reviewCount: reviews?.length || 0,
      viewsThisWeek: viewsWeek,
      totalOrders: orders?.length || 0,
      likesCount: likes?.length || 0,
    };

    return res.json(enrichedEvent);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch event details' });
  }
};
