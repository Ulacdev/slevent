import supabase from './database/db.js';
import { runEventFeedbackReminders } from './utils/eventFeedbackReminders.js';
import dotenv from 'dotenv';

dotenv.config();

async function testFeedbackFlow() {
  console.log('🚀 Starting Feedback Flow Test...');

  // 1. Find the Water Baptism event
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .ilike('eventName', '%Water Baptism%')
    .limit(1);

  if (error || !events || events.length === 0) {
    console.error('❌ No events found to test with.');
    return;
  }

  const testEvent = events[0];
  console.log(`📌 Testing with event: ${testEvent.eventName} (${testEvent.eventId})`);

  // 2. Prepare the event (Set endAt to 5 mins ago, reset sent flag)
  const fiveMinsAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  
  const { error: updateError } = await supabase
    .from('events')
    .update({ 
      endAt: fiveMinsAgo,
      feedback_emails_sent_at: null 
    })
    .eq('eventId', testEvent.eventId);

  if (updateError) {
    console.error('❌ Failed to update test event:', updateError.message);
    return;
  }

  console.log('✅ Event updated to "Just Ended" state.');

  // 3. Ensure there is at least one attendee for this event
  const { data: attendees } = await supabase
    .from('attendees')
    .select('*')
    .eq('eventId', testEvent.eventId)
    .limit(1);

  if (!attendees || attendees.length === 0) {
    console.log('💡 No attendees found for this event. Adding a test attendee...');
    await supabase.from('attendees').insert({
        eventId: testEvent.eventId,
        name: 'Test Attendee',
        email: 'test@example.com',
        consent: true,
        orderId: 'test-order' // Might need a real order ID if FK exists
    });
  }

  // 4. Trigger the reminders logic
  console.log('⚡ Triggering runEventFeedbackReminders()...');
  await runEventFeedbackReminders();

  console.log('🏁 Test completed. Check the logs above for "Sending emails to..." message.');
}

testFeedbackFlow().catch(console.error);
