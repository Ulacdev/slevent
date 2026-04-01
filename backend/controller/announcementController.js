import supabase from '../database/db.js';
import { logAudit } from '../utils/auditLogger.js';

export const listAnnouncements = async (req, res) => {
  try {
    const { target, public: isPublic } = req.query; // optional filtering by target audience
    let query = supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (target) {
      if (isPublic === 'true' && target !== 'ALL') {
        query = query.in('target_audience', ['ALL', target]);
      } else {
        query = query.eq('target_audience', target);
      }
    }

    // Filter by published, scheduled, and not expired for public-facing list
    if (isPublic === 'true') {
      const now = new Date().toISOString();
      // Basic published filter
      query = query.eq('is_published', true);
      
      // We can also let the frontend handle the granular date filtering
      // to avoid Supabase 'or' string complexities if it's the cause
      // of the empty results.
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
    const { title, content, type, target_audience, is_published, scheduled_at, expires_at } = req.body;
    
    if (!title || !content || !scheduled_at || !expires_at) {
      return res.status(400).json({ error: 'Title, content, scheduled date, and expiry date are required' });
    }

    const payload = {
      title,
      content,
      type: type || 'INFO',
      target_audience: target_audience || 'ALL',
      is_published: is_published ?? true,
      scheduled_at: scheduled_at || null,
      expires_at: expires_at || null,
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
    
    // Ensure required timestamp fields are not cleared
    if (updates.scheduled_at === '' || updates.scheduled_at === null) {
      return res.status(400).json({ error: 'Scheduled date is required' });
    }
    if (updates.expires_at === '' || updates.expires_at === null) {
      return res.status(400).json({ error: 'Expiry date is required' });
    }
    
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
