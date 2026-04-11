import db from './backend/database/db.js';

async function checkUser() {
  const id = '057c7add-9e26-45aa-8db9-ef704b54e42b';
  console.log(`Checking user: ${id}`);
  const { data, error } = await db.from('users').select('*').or(`userId.eq.${id},id.eq.${id}`);
  if (error) console.error('Error:', error);
  else console.log('Found:', JSON.stringify(data));
  process.exit(0);
}

checkUser();
