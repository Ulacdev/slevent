import db from './database/db.js';
import fs from 'fs';

async function listAllUsers() {
    const { data: users, error } = await db.from('users').select('*');
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }
    let output = '--- ALL USERS ---\n';
    users.forEach(u => {
        output += `- ${u.name} (${u.email}) [ID: ${u.userId || u.id}] Role: ${u.role}\n`;
    });
    fs.writeFileSync('all_users.txt', output);
    console.log('Report written to all_users.txt');
}

listAllUsers();
