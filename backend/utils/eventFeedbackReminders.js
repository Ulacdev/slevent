import supabase from '../database/db.js';
import { notifyUserByPreference } from './notificationService.js';

const DEFAULT_CHECK_INTERVAL_MS = 15 * 60_000; // 15 minutes

export const runEventFeedbackReminders = async () => {
  const now = new Date();
  console.log(`[FeedbackReminders] Checking for ended events at`, now.toISOString());

  try {
    // 1. Find events that ended recently and haven't sent feedback emails yet
    // We look for events that ended in the past, but not more than 24 hours ago (to avoid old data)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600_000);

    const { data: endedEvents, error: eventErr } = await supabase
      .from('events')
      .select('eventId, eventName, slug, organizerId, endAt')
      .is('feedback_emails_sent_at', null)
      .lt('endAt', now.toISOString())
      .gt('endAt', twentyFourHoursAgo.toISOString());

    if (eventErr) {
      console.error('[FeedbackReminders] Failed to fetch ended events:', eventErr.message);
      return;
    }

    if (!endedEvents || endedEvents.length === 0) {
      return;
    }

    console.log(`[FeedbackReminders] Found ${endedEvents.length} events needing feedback emails.`);

    for (const event of endedEvents) {
      // 2. Fetch all unique attendees for this event
      const { data: attendees, error: attErr } = await supabase
        .from('attendees')
        .select('name, email')
        .eq('eventId', event.eventId);

      if (attErr) {
        console.error(`[FeedbackReminders] Failed to fetch attendees for event ${event.eventId}:`, attErr.message);
        continue;
      }

      if (!attendees || attendees.length === 0) {
        // Mark as sent even if no attendees to avoid re-checking
        await supabase.from('events').update({ feedback_emails_sent_at: now.toISOString() }).eq('eventId', event.eventId);
        continue;
      }

      console.log(`[FeedbackReminders] Sending emails to ${attendees.length} attendees for "${event.eventName}"`);

      const emailPromises = attendees.map(attendee => {
        return notifyUserByPreference({
          name: attendee.name,
          recipientFallbackEmail: attendee.email,
          eventId: event.eventId,
          organizerId: event.organizerId,
          type: 'EVENT_FEEDBACK', // New type
          title: `How was "${event.eventName}"?`,
          message: `We hope you enjoyed the event! The organizer would love to hear your feedback.`,
          metadata: {
            eventName: event.eventName,
            actionLabel: 'RATE EVENT',
            // Link to the specific review page
            actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/events/${event.slug}/reviews?attended=true&attendeeId=${attendee.attendeeId}`,
            tag: 'FEEDBACK REQUEST',
            typeIcon: '⭐'
          }
        }).catch(err => console.error(`[FeedbackReminders] Failed to send to ${attendee.email}:`, err.message));
      });

      await Promise.all(emailPromises);

      // 3. Mark event as feedback sent
      await supabase
        .from('events')
        .update({ feedback_emails_sent_at: now.toISOString() })
        .eq('eventId', event.eventId);
    }

  } catch (err) {
    console.error('[FeedbackReminders] Unexpected error:', err.message);
  }
};

export const startEventFeedbackReminders = () => {
  const intervalMs = Number(process.env.FEEDBACK_CHECK_INTERVAL_MS) || DEFAULT_CHECK_INTERVAL_MS;
  
  const scheduleNextRun = () => {
    setTimeout(async () => {
      await runEventFeedbackReminders();
      scheduleNextRun();
    }, intervalMs);
  };

  scheduleNextRun();
};
