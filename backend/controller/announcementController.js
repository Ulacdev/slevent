import supabase from '../database/db.js';
import { logAudit } from '../utils/auditLogger.js';

export const listAnnouncements = async (req, res) => {
  try {
    const { target } = req.query; // optional filtering by target audience
    let query = supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (target) {
      query = query.eq('target_audience', target);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, type, target_audience, is_published, scheduled_at } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const payload = {
      title,
      content,
      type: type || 'INFO',
      target_audience: target_audience || 'ALL',
      is_published: is_published ?? true,
      scheduled_at: scheduled_at || null,
      author_id: req.user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('announcements')
      .insert(payload)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      actionType: 'ANNOUNCEMENT_CREATED',
      details: { announcementId: data?.id, title: data?.title },
      req
    });

    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;
    delete updates.author_id;
    delete updates.created_at;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Announcement not found' });

    await logAudit({
      actionType: 'ANNOUNCEMENT_UPDATED',
      details: { announcementId: id, updates },
      req
    });

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      actionType: 'ANNOUNCEMENT_DELETED',
      details: { announcementId: id },
      req
    });

    return res.json({ message: 'Announcement deleted permanently' });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};
