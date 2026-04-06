import db from './database/db.js';
import fs from 'fs';

async function mapAllEvents() {
    const { data: users, error: uError } = await db.from('users').select('*');
    const { data: events, error: eError } = await db.from('events').select('*');

    let output = '--- ALL EVENTS MAP (Manual Map) ---\n';
    if (uError) output += 'User Error: ' + JSON.stringify(uError) + '\n';
    if (eError) output += 'Event Error: ' + JSON.stringify(eError) + '\n';

    if (events) {
        const userMap = {};
        users?.forEach(u => userMap[u.userId || u.id] = u.email);

        events.forEach(e => {
            output += `- [${e.eventId}] ${e.eventName}\n`;
            output += `  CreatedBy: ${e.createdBy} (${userMap[e.createdBy] || 'MISSING USER'})\n`;
        });
    }
    fs.writeFileSync('events_map.txt', output);
    console.log('Report written to events_map.txt');
}

mapAllEvents();
