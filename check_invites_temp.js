import db from './backend/database/db.js';

async function checkInvites() {
  console.log('--- ALL INVITES ---');
  const { data, error } = await db.from('invites').select('*');
  if (error) console.error('Error:', error);
  else console.log('Invites:', JSON.stringify(data));
  process.exit(0);
}

checkInvites();
