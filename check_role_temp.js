import db from './backend/database/db.js';

async function checkUserRole() {
  const id = '057c7add-9e26-45aa-8db9-ef704b54e42b';
  const { data, error } = await db.from('users').select('userId, role, email').eq('userId', id).maybeSingle();
  if (error) console.error('Error:', error);
  else console.log('User Role:', data);
  process.exit(0);
}

checkUserRole();
