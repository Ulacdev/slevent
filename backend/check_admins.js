import supabase from './database/db.js';

async function checkAdmins() {
  const { data: admins, error } = await supabase
    .from('users')
    .select('userId, email, role')
    .eq('role', 'ADMIN');

  if (error) {
    console.log('Error fetching admins:', error);
    return;
  }

  console.log('Admin Users:');
  admins.forEach(a => console.log(`- ${a.email} (${a.userId})`));
}

checkAdmins();
