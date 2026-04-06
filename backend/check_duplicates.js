import db from './database/db.js';
import fs from 'fs';

async function checkDuplicates() {
  const { data: users, error } = await db.from('users').select('*');
  let output = '';
  if (error) {
    output = 'Error fetching users: ' + JSON.stringify(error);
  } else {
    const emailMap = {};
    users.forEach(u => {
      const email = u.email?.toLowerCase().trim();
      if (!emailMap[email]) emailMap[email] = [];
      emailMap[email].push(u);
    });

    output += '--- Duplicate Emails (users table) ---\n';
    let duplicatesFound = false;
    for (const [email, userList] of Object.entries(emailMap)) {
      if (userList.length > 1) {
        duplicatesFound = true;
        output += `Email: ${email}\n`;
        userList.forEach(u => {
          output += `  - userId: ${u.userId}, Name: ${u.name}, Role: ${u.role}, Created: ${u.created_at}\n`;
        });
      }
    }
    if (!duplicatesFound) output += 'None found.\n';

    output += '\n--- Admin Users ---\n';
    users.filter(u => u.role === 'ADMIN').forEach(u => {
      output += `- ${u.name} (${u.email}): ${u.userId}\n`;
    });
  }

  fs.writeFileSync('duplicates_report.txt', output);
  console.log('Report written to duplicates_report.txt');
}

checkDuplicates();
