import supabase from '../database/db.js';
import crypto from 'crypto';
import path from 'path';
import { getOrCreateOrganizerForUser, getOrganizerByOwnerUserId } from '../utils/organizerData.js';
import { logAudit } from '../utils/auditLogger.js';
import { checkPlanLimits } from '../utils/planValidator.js';
import { notifyUserByPreference, getAdminSmtpConfig } from '../utils/notificationService.js';
import { notifySubscribers } from './newsletterController.js';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'startuplab-business-ticketing';
const ADMIN_ROLES = ['ADMIN', 'STAFF'];

function slugify(text = '') {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureEventOwnership(eventId, userId) {
  const { data: event, error } = await supabase
    .from('events')
    .select('eventId, createdBy, status')
    .eq('eventId', eventId)
    .maybeSingle();

  if (error) return { error, status: 500 };
  if (!event) return { status: 404, message: 'Event not found' };
  if (event.createdBy !== userId) return { status: 403, message: 'Forbidden' };
  return { status: 200, event };
}

function toUpperStatus(value) {
  return String(value || '').trim().toUpperCase();
}

async function resolveOrganizerReadinessForUser(userId) {
  try {
    const organizer = await getOrganizerByOwnerUserId(userId);
    if (!organizer?.organizerId) {
      return {
        ok: false,
        status: 409,
        error: 'Complete your organization profile before creating events.',
        code: 'ORG_PROFILE_REQUIRED',
      };
    }

    const organizerName = String(organizer.organizerName || '').trim();
    if (!organizerName) {
      return {
        ok: false,
        status: 409,
        error: 'Organization profile is incomplete. Add an organization name before creating events.',
        code: 'ORG_PROFILE_INCOMPLETE',
      };
    }

    console.log(`🔍 [AdminEvent] Organizer readiness for ${userId}:`, organizer ? 'Found' : 'Missing');
    return { ok: true, organizer };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error?.message || 'Failed to resolve organizer profile',
      code: 'ORG_PROFILE_LOOKUP_FAILED',
    };
  }
}

async function hasTicketTypesConfigured(eventId) {
  const { data, error } = await supabase
    .from('ticketTypes')
    .select('ticketTypeId')
    .eq('eventId', eventId)
    .limit(1);

  if (error) {
    throw error;
  }
  return Array.isArray(data) && data.length > 0;
}

async function resolvePersonalProfileReadiness(userId) {
  const lookupByColumn = async (columnName) => (
    supabase
      .from('users')
      .select('name')
      .eq(columnName, userId)
      .maybeSingle()
  );

  let { data, error } = await lookupByColumn('userId');
  if ((!data && !error) || (error && String(error?.message || '').includes('column "userId"'))) {
    const fallback = await lookupByColumn('id');
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return {
      ok: false,
      status: 500,
      error: error.message || 'Failed to resolve account profile',
      code: 'USER_PROFILE_LOOKUP_FAILED',
    };
  }

  const profileName = String(data?.name || '').trim();
  if (!profileName) {
    return {
      ok: false,
      status: 409,
      error: 'Complete your personal profile before creating events.',
      code: 'USER_PROFILE_REQUIRED',
    };
  }

  return { ok: true };
}

export const listAdminEvents = async (req, res) => {
  try {
    const search = (req.query?.search || '').toString().trim();

    // 1) Build set of allowed creator IDs based on requester role
    const { data: userRows, error: userErr } = await supabase
      .from('users')
      .select('userId, role, employerId');
    if (userErr) return res.status(500).json({ error: userErr.message });

    const requesterId = req.user?.id;
    const requester = userRows.find((u) => String(u.userId) === String(requesterId));
    const requesterRole = String(requester?.role || req.user?.role || '').toUpperCase();

    const allowedCreatorIds = new Set();

    if (requesterRole === 'STAFF') {
      // Staff sees their own events, events from their employer, and events from organizers they invited
      allowedCreatorIds.add(requesterId);
      if (requester?.employerId) {
        allowedCreatorIds.add(String(requester.employerId));
      }
      for (const u of userRows) {
        const empId = String(u.employerId || '');
        if (empId === String(requesterId)) {
          allowedCreatorIds.add(String(u.userId));
        }
      }
    } else {
      // Default Admin behavior: see all ADMIN and STAFF events
      for (const u of userRows) {
        if (ADMIN_ROLES.includes(String(u.role || '').toUpperCase())) {
          allowedCreatorIds.add(String(u.userId || u.id));
        }
      }
    }

    // 2) Query events
    let query = supabase
      .from('events')
      .select('*, ticketTypes(*)')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`eventName.ilike.%${search}%,locationText.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: events, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // 3) Fetch report counts for these events
    const { data: reportNotifs, error: reportErr } = await supabase
      .from('notifications')
      .select('notification_id, metadata')
      .eq('type', 'EVENT_REPORT')
      .is('deleted_at', null);
    
    if (!reportErr && reportNotifs) {
      const reportMap = {};
      reportNotifs.forEach(n => {
        const eventId = n.metadata?.eventId;
        if (eventId) {
          reportMap[eventId] = (reportMap[eventId] || 0) + 1;
        }
      });
      events.forEach(e => {
        e.reportCount = reportMap[e.eventId] || 0;
      });
    }

    // 4) Enforce creator-role filtering for STAFF; ADMINs see EVERYTHING
    if (requesterRole === 'ADMIN') {
      return res.json(events || []);
    }

    const filtered = (events || []).filter((event) => allowedCreatorIds.has(String(event.createdBy)));
    return res.json(filtered);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

// ─── USER-SPECIFIC: only events created by the authenticated user ───
export const listUserEvents = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const search = (req.query?.search || '').toString().trim();
    let query = supabase
      .from('events')
      .select('*, ticketTypes(*)')
      .eq('createdBy', userId)
      .eq('is_archived', false) // Exclude archived events
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`eventName.ilike.%${search}%,locationText.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};


export const createUserEvent = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const profileCheck = await resolvePersonalProfileReadiness(userId);
  if (!profileCheck.ok) {
    return res.status(profileCheck.status).json({ error: profileCheck.error, code: profileCheck.code });
  }

  const organizerCheck = await resolveOrganizerReadinessForUser(userId);
  if (!organizerCheck.ok) {
    return res.status(organizerCheck.status).json({ error: organizerCheck.error, code: organizerCheck.code });
  }

  const requestedStatus = toUpperStatus(req.body?.status);
  if (requestedStatus === 'PUBLISHED') {
    return res.status(422).json({
      error: 'Create the event as Draft first. Add at least one ticket before publishing.',
      code: 'TICKET_REQUIRED_BEFORE_PUBLISH',
    });
  }

  // Limit checks are bypassed on creation to allow drafting. 
  // Limits will be enforced when attempting to PUBLISH the event.
  console.log(`✅ [Event Create] Bypassing plan limits for initial creation for organizer: ${organizerCheck.organizer.organizerId}`);


  req.enforceExistingOrganizer = true;
  return createEvent(req, res);
};

export const updateUserEvent = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const ownership = await ensureEventOwnership(id, userId);
    if (ownership.status !== 200) {
      if (ownership.error) return res.status(500).json({ error: ownership.error.message });
      return res.status(ownership.status).json({ error: ownership.message });
    }

    // 3. Check Capacity Limit on Update
    const requestedCapacity = req.body?.capacityTotal ? Number(req.body.capacityTotal) : 0;
    if (requestedCapacity > (ownership.event?.capacityTotal || 0)) {
      const organizerCheck = await resolveOrganizerReadinessForUser(userId);
      if (organizerCheck.ok) {
        const capacityLimit = await checkPlanLimits(organizerCheck.organizer.organizerId, 'max_attendees_per_event', requestedCapacity);
        if (!capacityLimit.allowed) {
          return res.status(403).json({
            error: capacityLimit.message,
            code: 'PLAN_LIMIT_REACHED',
            limit: capacityLimit.limit
          });
        }
      }
    }

    const requestedStatus = toUpperStatus(req.body?.status);
    const currentStatus = toUpperStatus(ownership.event?.status);
    const isPublishTransition = requestedStatus === 'PUBLISHED' && currentStatus !== 'PUBLISHED';

    // 4. Check Discount Codes Limit
    if (req.body?.enableDiscountCodes === true) {
      const organizerCheck = await resolveOrganizerReadinessForUser(userId);
      if (organizerCheck.ok) {
        const discountLimit = await checkPlanLimits(organizerCheck.organizer.organizerId, 'discount_codes');
        if (!discountLimit.allowed) {
          return res.status(403).json({
            error: discountLimit.message,
            code: 'PLAN_LIMIT_REACHED'
          });
        }
      }
    }

    if (isPublishTransition) {
      const organizerCheck = await resolveOrganizerReadinessForUser(userId);
      if (!organizerCheck.ok) {
        return res.status(organizerCheck.status).json({ error: organizerCheck.error, code: organizerCheck.code });
      }

      try {
        // --- Plan Limit Enforcement ---
        // 1. Check Max Events Limit (Active)
        const eventLimit = await checkPlanLimits(organizerCheck.organizer.organizerId, 'max_events', 1, { excludeId: id });
        if (!eventLimit.allowed) {
          return res.status(403).json({
            error: eventLimit.message,
            code: 'PLAN_LIMIT_REACHED',
            limit: eventLimit.limit,
            current: eventLimit.current
          });
        }

        // 1b. Check Max Total Events Limit (Lifetime)
        const totalEventLimit = await checkPlanLimits(organizerCheck.organizer.organizerId, 'max_total_events', 1, { excludeId: id });
        if (!totalEventLimit.allowed) {
          return res.status(403).json({
            error: totalEventLimit.message,
            code: 'PLAN_LIMIT_REACHED',
            limit: totalEventLimit.limit,
            current: totalEventLimit.current
          });
        }

        const hasTickets = await hasTicketTypesConfigured(id);
        if (!hasTickets) {
          return res.status(422).json({
            error: 'Add at least one ticket type before publishing this event.',
            code: 'TICKET_REQUIRED_BEFORE_PUBLISH',
          });
        }
      } catch (ticketError) {
        return res.status(500).json({ error: ticketError?.message || 'Failed to verify setup' });
      }
    }

    return updateEvent(req, res);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const deleteUserEvent = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const ownership = await ensureEventOwnership(id, userId);
    if (ownership.status !== 200) {
      if (ownership.error) return res.status(500).json({ error: ownership.error.message });
      return res.status(ownership.status).json({ error: ownership.message });
    }

    return archiveEvent(req, res);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const deleteUserEventPermanently = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const ownership = await ensureEventOwnership(id, userId);
    if (ownership.status !== 200) {
      if (ownership.error) return res.status(500).json({ error: ownership.error.message });
      return res.status(ownership.status).json({ error: ownership.message });
    }

    return deleteEvent(req, res);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const uploadEventImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Image file is required' });
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed' });
    }

    const ext = path.extname(file.originalname || '') || '.png';
    const fileName = `${crypto.randomUUID()}${ext}`;
    const filePath = `images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) return res.status(500).json({ error: 'Failed to generate public URL' });

    const eventId = req.body?.eventId;
    let event = null;
    if (eventId) {
      const { data, error } = await supabase
        .from('events')
        .update({ imageUrl: publicUrl, updated_at: new Date().toISOString() })
        .eq('eventId', eventId)
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      event = data;
    }

    return res.json({ publicUrl, path: filePath, event });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Image upload failed' });
  }
};

export const uploadUserEventImage = async (req, res) => {
  try {
    const userId = req.user?.id;
    const eventId = req.body?.eventId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    if (eventId) {
      const ownership = await ensureEventOwnership(eventId, userId);
      if (ownership.status !== 200) {
        if (ownership.error) return res.status(500).json({ error: ownership.error.message });
        return res.status(ownership.status).json({ error: ownership.message });
      }
    }

    return uploadEventImage(req, res);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Image upload failed' });
  }
};

export const getAdminEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('eventId', id)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Event not found' });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const createEvent = async (req, res) => {
  try {
    const {
      eventName,
      slug,
      description,
      startAt,
      endAt,
      timezone,
      locationType,
      locationText,
      capacityTotal,
      regOpenAt,
      regCloseAt,
      status = 'DRAFT',
      imageUrl,
      streamingPlatform,
      streaming_url,
      enableDiscountCodes,
      brandColor
    } = req.body || {};

    if (!eventName) return res.status(400).json({ error: 'eventName is required' });

    let organizerId = null;
    const enforceExistingOrganizer = req.enforceExistingOrganizer === true;
    if (req.user?.id) {
      try {
        const organizer = enforceExistingOrganizer
          ? await getOrganizerByOwnerUserId(req.user.id)
          : await getOrCreateOrganizerForUser(req.user.id);
        if (enforceExistingOrganizer && !organizer?.organizerId) {
          return res.status(409).json({
            error: 'Complete your organization profile before creating events.',
            code: 'ORG_PROFILE_REQUIRED',
          });
        }
        organizerId = organizer?.organizerId || null;
      } catch (organizerError) {
        return res.status(500).json({ error: organizerError?.message || 'Failed to resolve organizer profile' });
      }
    }

    const payload = {
      eventName,
      slug: slug && slug.length ? slug : slugify(eventName),
      description: description || null,
      startAt: startAt || null,
      endAt: endAt || null,
      timezone: timezone || null,
      locationType: locationType || null,
      locationText: locationText || null,
      capacityTotal: Number.isFinite(Number(capacityTotal)) ? Number(capacityTotal) : null,
      regOpenAt: regOpenAt || null,
      regCloseAt: regCloseAt || null,
      status,
      imageUrl: imageUrl || null,
      streamingPlatform: streamingPlatform || null,
      streaming_url: streaming_url || null,
      enableDiscountCodes: !!enableDiscountCodes,
      brandColor: brandColor || null,
      organizerId,
      createdBy: req.user?.id || null,
      updated_at: new Date().toISOString()
    };

    console.log('🚀 [Event Create] Payload:', JSON.stringify(payload, null, 2));
    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('❌ [Event Create] Database error:', error);
      if (error.code === '23505' && error.message?.includes('events_slug_key')) {
        // Retry with a unique suffix if it's a slug collision
        const uniqueSuffix = Math.random().toString(36).substring(2, 6);
        payload.slug = `${payload.slug}-${uniqueSuffix}`;

        const retry = await supabase
          .from('events')
          .insert(payload)
          .select('*')
          .single();

        if (!retry.error) return res.status(201).json(retry.data);
      }
      return res.status(500).json({ error: error.message });
    }

    await logAudit({
      actionType: 'EVENT_CREATED',
      details: { eventId: data?.eventId, eventName: data?.eventName },
      req
    });

    // Notify newsletter subscribers if published immediately
    if (data?.status === 'PUBLISHED') {
      notifySubscribers({
        title: `✨ New Event: ${data.eventName}`,
        message: data.description || 'A new event has been launched! Check it out and register now.',
        subject: `New Event: ${data.eventName}`,
        actionUrl: `${process.env.FRONTEND_URL || 'https://events.moonshotdigital.com.ph'}/events/${data.slug}`
      }).catch(err => console.error('Newsletter notify err:', err));
    }

    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.createdBy;
    delete updates.eventId;
    delete updates.created_at;
    delete updates.organizerId;

    if (updates.capacityTotal !== undefined) {
      updates.capacityTotal = Number.isFinite(Number(updates.capacityTotal))
        ? Number(updates.capacityTotal)
        : null;
    }
    if (updates.eventName && !updates.slug) {
      updates.slug = slugify(updates.eventName);
    }

    // Get previous status for notification transition
    const { data: oldEvent } = await supabase.from('events').select('status').eq('eventId', id).maybeSingle();
    const isPublishTransition = updates.status === 'PUBLISHED' && oldEvent?.status !== 'PUBLISHED';

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('eventId', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505' && error.message?.includes('events_slug_key')) {
        return res.status(409).json({
          error: 'An event with this name already creates a conflicting web address (slug). Please try a slightly different name.',
          code: 'SLUG_ALREADY_EXISTS'
        });
      }
      return res.status(500).json({ error: error.message });
    }
    if (!data) return res.status(404).json({ error: 'Event not found' });

    await logAudit({
      actionType: 'EVENT_UPDATED',
      details: { eventId: data?.eventId, eventName: data?.eventName, updates },
      req
    });

    // Notify newsletter subscribers if just published 
    if (isPublishTransition) {
       notifySubscribers({
            title: `✨ New Event: ${data.eventName}`,
            message: data.description || 'A new event has been launched! Check it out and register now.',
            subject: `New Event: ${data.eventName}`,
            actionUrl: `${process.env.FRONTEND_URL || 'https://events.moonshotdigital.com.ph'}/events/${data.slug}`
       }).catch(err => console.error('Newsletter notify err:', err));
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const resolveEventReports = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    if (!id) return res.status(400).json({ error: 'Event ID is required' });

    console.log(`🛡️ [AdminEvent] Resolving reports for event: ${id} by admin: ${userId}`);

    // Select specifically the reports for THIS event to avoid fetching the entire notifications table
    const { data: reports, error: fetchErr } = await supabase
      .from('notifications')
      .select('notification_id, metadata')
      .eq('type', 'EVENT_REPORT')
      .is('deleted_at', null);

    if (fetchErr) {
      console.error(`❌ [AdminEvent] Fetch reports error:`, fetchErr);
      return res.status(500).json({ error: fetchErr.message });
    }

    // Since metadata filtering is complex in JS client for JSONB, we still filter in memory 
    // but we can at least be certain about the data we're working with.
    const reportIds = (reports || [])
      .filter(n => String(n.metadata?.eventId) === String(id))
      .map(n => n.notification_id);

    if (reportIds.length === 0) {
      console.log(`ℹ️ [AdminEvent] No active reports found for event: ${id}`);
      return res.json({ success: true, count: 0, message: 'No active reports found for this event.' });
    }

    // Soft delete these reports and mark resolution details
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('notifications')
      .update({ 
        deleted_at: now,
        is_read: true, // Also mark as read when resolved
        read_at: now,
        metadata: { 
          // Take metadata from the first report if available
          ...(reports.find(r => r.notification_id === reportIds[0])?.metadata || {}), 
          resolvedBy: userId, 
          resolvedAt: now,
          status: 'resolved'
        }
      })
      .in('notification_id', reportIds);

    if (updateErr) {
      console.error(`❌ [AdminEvent] Update reports error:`, updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    console.log(`✅ [AdminEvent] Resolved ${reportIds.length} reports for event: ${id}`);

    await logAudit({
      actionType: 'EVENT_REPORTS_RESOLVED',
      details: { eventId: id, count: reportIds.length, resolvedBy: userId },
      req
    });

    return res.json({ success: true, count: reportIds.length });
  } catch (err) {
    console.error(`❌ [AdminEvent] Resolve reports crash:`, err);
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    // Security Check: Ensure either creator OR admin (Admins handled by route middleware usually)
    // Here we focus on the hard delete aspect.
    
    // Hard delete - remove all related data first
    await supabase.from('tickets').delete().eq('eventId', id);
    await supabase.from('ticketTypes').delete().eq('eventId', id);
    await supabase.from('orders').delete().eq('eventId', id);
    await supabase.from('event_likes').delete().eq('eventId', id);

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('eventId', id);

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      actionType: 'EVENT_PERMANENTLY_DELETED',
      details: { eventId: id },
      req
    });

    return res.status(200).json({ message: 'Event permanently deleted from system', permanent: true });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const archiveEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    const { data, error } = await supabase
      .from('events')
      .update({
        is_archived: true,
        deleted_at: new Date().toISOString(),
        archived_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('eventId', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Event not found' });

    await logAudit({
      actionType: 'EVENT_ARCHIVED',
      details: { eventId: id, archivedBy: userId },
      req
    });

    return res.status(200).json({ message: 'Event moved to archive', archived: true, event: data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const restoreEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Security Check: Only admins can restore moderated events
    const { data: event, error: fetchErr } = await supabase
      .from('events')
      .select('archived_by, createdBy')
      .eq('eventId', id)
      .single();

    if (fetchErr || !event) return res.status(404).json({ error: 'Event not found' });

    const { data: adminRows } = await supabase.from('users').select('userId').in('role', ADMIN_ROLES);
    const adminIds = new Set((adminRows || []).map(a => String(a.userId)));

    const isModerated = event.archived_by && adminIds.has(String(event.archived_by)) && String(event.archived_by) !== String(event.createdBy);
    const requesterRole = String(req.user?.role || '').toUpperCase();

    if (isModerated && requesterRole !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'This event was removed by a platform administrator and cannot be restored by the organizer.' 
      });
    }

    const { data: restored, error } = await supabase
      .from('events')
      .update({
        is_archived: false,
        deleted_at: null,
        archived_by: null,
        updated_at: new Date().toISOString()
      })
      .eq('eventId', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!restored) return res.status(404).json({ error: 'Event not found' });

    await logAudit({
      actionType: 'EVENT_RESTORED',
      details: { eventId: id, restoredBy: userId },
      req
    });

    return res.status(200).json({ message: 'Event restored successfully', event: data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const listArchivedEvents = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get organizer's events that are archived
    let query = supabase
      .from('events')
      .select('*, ticketTypes(*)', { count: 'exact' })
      .eq('createdBy', userId)
      .eq('is_archived', true)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // SECURITY: Filter out moderated events (those archived by an admin)
    const { data: admins } = await supabase.from('users').select('userId').in('role', ADMIN_ROLES);
    const adminIds = new Set((admins || []).map(a => String(a.userId)));
    
    const filteredResults = (events || []).filter(e => {
        // If archived_by is an admin and not the owner himself, it's moderated
        const isModerated = e.archived_by && adminIds.has(String(e.archived_by)) && String(e.archived_by) !== String(userId);
        return !isModerated;
    });

    return res.status(200).json({
      events: filteredResults,
      total: count || 0,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const publishEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: event } = await supabase.from('events').select('organizerId, eventName').eq('eventId', id).single();
    if (event?.organizerId) {
      const eventLimit = await checkPlanLimits(event.organizerId, 'max_events', 1, { excludeId: id });
      if (!eventLimit.allowed) {
        return res.status(403).json({
          error: eventLimit.message,
          code: 'PLAN_LIMIT_REACHED'
        });
      }

      // Check if event has paid tickets, and if so, validate paid event limit
      const { data: ticketTypes } = await supabase
        .from('ticketTypes')
        .select('ticketTypeId')
        .eq('eventId', id)
        .gt('priceAmount', 0)
        .limit(1);

      if (ticketTypes && ticketTypes.length > 0) {
        const pricedEventLimit = await checkPlanLimits(event.organizerId, 'max_priced_events', 1, { excludeId: id });
        if (!pricedEventLimit.allowed) {
          return res.status(403).json({
            error: pricedEventLimit.message,
            code: 'PAID_EVENT_LIMIT_REACHED'
          });
        }
      }
    }

    const { data, error } = await supabase
      .from('events')
      .update({ status: 'PUBLISHED', updated_at: new Date().toISOString() })
      .eq('eventId', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Event not found' });

    await logAudit({
      actionType: 'EVENT_PUBLISHED',
      details: { eventId: data?.eventId, eventName: data?.eventName },
      req
    });

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const closeEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('events')
      .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
      .eq('eventId', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Event not found' });

    await logAudit({
      actionType: 'EVENT_CLOSED',
      details: { eventId: data?.eventId, eventName: data?.eventName },
      req
    });

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const ownership = await ensureEventOwnership(id, userId);
    if (ownership.status !== 200) {
      return res.status(ownership.status).json({ error: ownership.message });
    }

    const { data: event, error: updErr } = await supabase
      .from('events')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('eventId', id)
      .select('*')
      .single();

    if (updErr) return res.status(500).json({ error: updErr.message });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Mark all tickets as CANCELLED for this event
    await supabase
      .from('tickets')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('eventId', id);

    // ─── Automated Cancellation Emails ───
    const { data: tickets } = await supabase
      .from('tickets')
      .select('attendeeId')
      .eq('eventId', id);

    if (tickets && tickets.length > 0) {
      const attendeeIds = [...new Set(tickets.map(t => t.attendeeId))];
      const { data: attendees } = await supabase
        .from('attendees')
        .select('name, email')
        .in('attendeeId', attendeeIds);

      if (attendees && attendees.length > 0) {
        const emailPromises = attendees.map(attendee => 
          notifyUserByPreference({
            recipientFallbackEmail: attendee.email,
            organizerId: event.organizerId,
            actorUserId: userId,
            eventId: id,
            type: 'TICKET_CANCELLED',
            title: `Event Cancelled: ${event.eventName}`,
            message: `We regret to inform you that the event "${event.eventName}" has been cancelled by the organizer.`,
            metadata: {
              eventName: event.eventName,
              typeIcon: '🚫',
              tag: 'CANCELLED'
            }
          })
        );
        await Promise.allSettled(emailPromises);
      }
    }

    await logAudit({
      actionType: 'EVENT_CANCELLED',
      details: { eventId: event.eventId, eventName: event.eventName },
      req
    });

    return res.json({ success: true, message: 'Event cancelled and attendees notified.', event });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const sendBulkNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body;
    const userId = req.user?.id;

    if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required' });

    const ownership = await ensureEventOwnership(id, userId);
    if (ownership.status !== 200) {
      return res.status(ownership.status).json({ error: ownership.message });
    }

    const event = ownership.event;

    const { data: tickets } = await supabase
      .from('tickets')
      .select('attendeeId')
      .eq('eventId', id);

    if (!tickets || tickets.length === 0) {
      return res.status(400).json({ error: 'No attendees found for this event.' });
    }

    const attendeeIds = [...new Set(tickets.map(t => t.attendeeId))];
    const { data: attendees } = await supabase
      .from('attendees')
      .select('name, email')
      .in('attendeeId', attendeeIds);

    if (!attendees || attendees.length === 0) {
      return res.status(400).json({ error: 'No attendees found for this event.' });
    }

    const emailPromises = attendees.map(attendee => 
      notifyUserByPreference({
        recipientFallbackEmail: attendee.email,
        organizerId: event.organizerId,
        actorUserId: userId,
        eventId: id,
        type: 'EVENT_UPDATE',
        title: subject,
        message: message,
        metadata: {
          eventName: event.eventName,
          typeIcon: '🔔',
          tag: 'ANNOUNCEMENT'
        }
      })
    );

    await Promise.allSettled(emailPromises);

    await logAudit({
      actionType: 'BULK_NOTIFICATION_SENT',
      details: { eventId: id, subject, recipientCount: attendees.length },
      req
    });

    return res.json({ success: true, message: `Notification sent to ${attendees.length} attendees.` });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};
