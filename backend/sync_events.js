
import db from './database/db.js';

async function syncAndFix() {
  console.log('--- Aggressive Event Re-Linkings ---');
  
  const { data: orgs } = await db.from('organizers').select('*');
  const { data: users } = await db.from('users').select('*');
  const { data: events } = await db.from('events').select('*');

  let fixCount = 0;
  for (const u of users) {
    const email = u.email?.toLowerCase().trim();
    if (!email) continue;

    const org = orgs.find(o => o.ownerUserId === u.userId || o.ownerUserId === u.id);
    if (!org) continue;

    // Find all events that BELONG to this user but aren't correctly linked
    const userEvents = events.filter(e => 
      e.createdBy === u.userId || 
      e.createdBy === u.id || 
      (typeof e.createdBy === 'string' && e.createdBy.toLowerCase().trim() === email)
    );

    for (const e of userEvents) {
      if (e.organizerId !== org.organizerId || e.createdBy !== u.userId) {
        console.log(`🔗 Re-linking "${e.eventName}" to Organizer "${org.organizerName}" (${email})`);
        await db.from('events').update({ 
          organizerId: org.organizerId,
          createdBy: u.userId 
        }).eq('eventId', e.eventId);
        fixCount++;
      }
    }
  }

  console.log(`\n--- Completed: Fixed ${fixCount} event linkages ---`);
  process.exit(0);
}

syncAndFix();
