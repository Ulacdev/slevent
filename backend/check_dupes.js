
import db from './database/db.js';

async function checkDuplicates() {
  const { data, error } = await db
    .from('users')
    .select('email, userId');
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('--- User List ---');
  data.forEach(user => {
    console.log(`- ${user.email} (${user.userId})`);
  });
  
  const counts = {};
  data.forEach(user => {
    const email = user.email ? user.email.toLowerCase().trim() : 'null';
    if (!counts[email]) counts[email] = [];
    counts[email].push(user.userId);
  });

  console.log('--- Duplicate Email Check ---');
  Object.keys(counts).forEach(email => {
    if (counts[email].length > 1) {
      console.log(`${email}: ${counts[email].length} different IDs: ${counts[email].join(', ')}`);
    }
  });
  console.log('--- End Check ---');
  process.exit(0);
}

checkDuplicates();
