import supabase from '../database/db.js';
import crypto from 'crypto';
import path from 'path';
import { getOrCreateOrganizerForUser } from '../utils/organizerData.js';

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
    .select('eventId, createdBy')
    .eq('eventId', eventId)
    .maybeSingle();

  if (error) return { error, status: 500 };
  if (!event) return { status: 404, message: 'Event not found' };
  if (event.createdBy !== userId) return { status: 403, message: 'Forbidden' };
  return { status: 200, event };
}

export const listAdminEvents = async (req, res) => {
  try {
    const search = (req.query?.search || '').toString().trim();

    // 1) Build set of admin/staff creator IDs from users table
    const { data: userRows, error: userErr } = await supabase
      .from('users')
      .select('userId, role');
    if (userErr) return res.status(500).json({ error: userErr.message });

    const adminRoleIds = new Set(
      (userRows || [])
        .filter((u) => ADMIN_ROLES.includes(String(u.role || '').toUpperCase()))
        .map((u) => u.userId)
        .filter(Boolean)
    );

    // 2) Query events and then enforce creator-role filtering in code
    let query = supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`eventName.ilike.%${search}%,locationText.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: events, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const filtered = (events || []).filter((event) => adminRoleIds.has(event.createdBy));
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
      .select('*')
      .eq('createdBy', userId)
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
      streamingPlatform
    } = req.body || {};

    if (!eventName) return res.status(400).json({ error: 'eventName is required' });

    let organizerId = null;
    if (req.user?.id) {
      try {
        const organizer = await getOrCreateOrganizerForUser(req.user.id);
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
      organizerId,
      createdBy: req.user?.id || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
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
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('eventId', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Event not found' });

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('eventId', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const publishEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('events')
      .update({ status: 'PUBLISHED', updated_at: new Date().toISOString() })
      .eq('eventId', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Event not found' });
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
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};
