
import db from './database/db.js';

async function debugState() {
  console.log('--- Database Consistency Check ---');
  
  // 1. Fetch all users
  const { data: users, error: uErr } = await db.from('users').select('*');
  if (uErr) { console.error('Error users:', uErr); return; }
  
  // 2. Fetch all organizers
  const { data: organizers, error: oErr } = await db.from('organizers').select('*');
  if (oErr) { console.error('Error organizers:', oErr); return; }
  
  // 3. Fetch all events
  const { data: events, error: eErr } = await db.from('events').select('eventId, organizerId, createdBy, eventName');
  if (eErr) { console.error('Error events:', JSON.stringify(eErr, null, 2)); return; }

  console.log(`\nFound ${users.length} users, ${organizers.length} organizers, ${events.length} events.`);

  const userMap = {};
  users.forEach(u => {
    userMap[u.userId || u.id] = u;
  });

  console.log('\n--- Linkage Analysis ---');
  
  console.log('\n--- Event Analysis ---');
  events.forEach(e => {
    const creator = userMap[e.createdBy];
    const org = organizers.find(o => o.organizerId === e.organizerId);
    console.log(`[Event] ${e.eventName} (CreatedBy: ${creator ? creator.email : e.createdBy}, Organizer: ${org ? org.organizerName : 'NONE'})`);
  });

  // Check for duplicate emails again
  const emailCounts = {};
  users.forEach(u => {
    const email = u.email?.toLowerCase().trim();
    if (!emailCounts[email]) emailCounts[email] = [];
    emailCounts[email].push(u.userId || u.id);
  });

  console.log('\n--- Duplicate Email Check ---');
  Object.keys(emailCounts).forEach(email => {
    if (emailCounts[email].length > 1) {
      console.log(`Duplicate found: ${email} has IDs: ${emailCounts[email].join(', ')}`);
    }
  });

  console.log('\n--- End Analysis ---');
  process.exit(0);
}

debugState();
