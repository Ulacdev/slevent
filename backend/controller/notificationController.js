import {
  listNotificationsForUser,
  markNotificationReadForUser,
  markAllNotificationsReadForUser,
  isNotificationsSchemaError,
  NOTIFICATIONS_NOT_INITIALIZED_MESSAGE,
} from '../utils/notificationService.js';
import supabase from '../database/db.js';

export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const limit = Number(req.query?.limit || 25);
    const notifications = await listNotificationsForUser(userId, limit);

    // If user is Admin/Staff, also fetch recent EVENT_REPORT/SUPPORT_TICKET 
    // that might be assigned to a different admin ID (e.g. the first admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('userId', userId)
      .maybeSingle();

    if (userData?.role === 'ADMIN' || userData?.role === 'STAFF') {
      const { data: adminIssues } = await supabase
        .from('notifications')
        .select('*')
        .in('type', ['EVENT_REPORT', 'SUPPORT_TICKET', 'ADMIN_ALERT'])
        .neq('recipient_user_id', userId) // Avoid duplicates from listNotificationsForUser
        .order('created_at', { ascending: false })
        .limit(10);

      if (adminIssues && adminIssues.length > 0) {
        // Merge and sort
        const merged = [...notifications, ...adminIssues.map(n => ({
          notificationId: n.notification_id,
          recipientUserId: n.recipient_user_id,
          actorUserId: n.actor_user_id,
          eventId: n.event_id,
          organizerId: n.organizer_id,
          type: n.type,
          title: n.title,
          message: n.message,
          metadata: n.metadata || {},
          isRead: !!n.is_read,
          createdAt: n.created_at,
          readAt: n.read_at || null,
        }))];
        
        // Sort by date and take limit
        const sorted = merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
        const unreadCount = sorted.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);
        return res.json({ notifications: sorted, unreadCount });
      }
    }

    const unreadCount = notifications.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);
    return res.json({ notifications, unreadCount });
  } catch (err) {
    if (isNotificationsSchemaError(err)) {
      return res.status(503).json({ error: NOTIFICATIONS_NOT_INITIALIZED_MESSAGE });
    }
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const markMyNotificationRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const notificationId = req.params?.id;
    if (!notificationId) return res.status(400).json({ error: 'notificationId is required' });

    // 1. Get user role to check if they have admin privileges
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('userId', userId)
      .maybeSingle();

    const isAdmin = userData?.role === 'ADMIN' || userData?.role === 'STAFF';

    // 2. Perform the update
    let query = supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('notification_id', notificationId);

    // If NOT an admin, enforce ownership. Admins can mark shared alerts as read.
    if (!isAdmin) {
      query = query.eq('recipient_user_id', userId);
    } else {
      // Admins: only allow marking shared types from other recipients
      // This prevents admins from accidentally marking unrelated user-to-user messages as read
      // if they somehow got the ID, but lets them clear platform alerts.
      query = query.or(`recipient_user_id.eq.${userId},type.in.("EVENT_REPORT","SUPPORT_TICKET","ADMIN_ALERT")`);
    }

    const { data, error } = await query.select('*').maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Notification not found' });
    
    // Normalize response for the frontend
    const result = {
      notificationId: data.notification_id,
      recipientUserId: data.recipient_user_id,
      actorUserId: data.actor_user_id,
      eventId: data.event_id,
      organizerId: data.organizer_id,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata || {},
      isRead: !!data.is_read,
      createdAt: data.created_at,
      readAt: data.read_at || null,
    };

    return res.json(result);
  } catch (err) {
    if (isNotificationsSchemaError(err)) {
      return res.status(503).json({ error: NOTIFICATIONS_NOT_INITIALIZED_MESSAGE });
    }
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const markAllMyNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await markAllNotificationsReadForUser(userId);
    return res.json({ success: true });
  } catch (err) {
    if (isNotificationsSchemaError(err)) {
      return res.status(503).json({ error: NOTIFICATIONS_NOT_INITIALIZED_MESSAGE });
    }
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};
