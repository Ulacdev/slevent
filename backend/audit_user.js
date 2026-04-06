import db from './database/db.js';
import fs from 'fs';

async function auditUser(email) {
  email = email.toLowerCase().trim();
  let output = `--- Audit for ${email} ---\n`;

  // 1. Find User
  const { data: user, error: userError } = await db.from('users').select('*').eq('email', email).maybeSingle();
  if (userError) {
    output += 'Error fetching user: ' + JSON.stringify(userError) + '\n';
  } else if (!user) {
    output += 'User not found in public.users\n';
  } else {
    output += `User DB ID: ${user.userId || user.id}, Role: ${user.role}\n`;

    // 2. Find Organizer
    const { data: orgs, error: orgError } = await db.from('organizers').select('*').eq('ownerUserId', user.userId || user.id);
    if (orgError) output += 'Error fetching organizers: ' + JSON.stringify(orgError) + '\n';
    output += `Organizers found: ${orgs?.length || 0}\n`;
    orgs?.forEach(o => output += `  - OrganizerId: ${o.organizerId}, Name: ${o.organizerName}\n`);

    // 3. Find Events by createdBy
    const { data: eventsByCreator, error: eventsError } = await db.from('events').select('*').eq('createdBy', user.userId || user.id);
    if (eventsError) output += 'Error fetching events by creator: ' + JSON.stringify(eventsError) + '\n';
    output += `Events by createdBy (${user.userId || user.id}): ${eventsByCreator?.length || 0}\n`;
    eventsByCreator?.forEach(e => output += `  - EventId: ${e.eventId}, Name: ${e.eventName}, Status: ${e.status}, OrgID: ${e.organizerId}\n`);

    // 4. Find Events by Organizer
    if (orgs?.length > 0) {
      const orgIds = orgs.map(o => o.organizerId);
      const { data: eventsByOrg, error: orgEventsError } = await db.from('events').select('*').in('organizerId', orgIds);
      if (orgEventsError) output += 'Error fetching events by organizer: ' + JSON.stringify(orgEventsError) + '\n';
      output += `Events by Organizer (${orgIds.join(', ')}): ${eventsByOrg?.length || 0}\n`;
      eventsByOrg?.forEach(e => {
          if (!eventsByCreator?.find(ec => ec.eventId === e.eventId)) {
              output += `  - [ORPHANED BY CREATOR] EventId: ${e.eventId}, Name: ${e.eventName}, CreatedBy: ${e.createdBy}\n`;
          }
      });
    }
  }

  fs.writeFileSync('audit_report.txt', output);
  console.log('Report written to audit_report.txt');
}

const targetEmail = process.argv[2] || 'ubeeeyk@gmail.com';
auditUser(targetEmail);
