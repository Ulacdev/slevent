import supabase from './database/db.js';

async function checkUser() {
  const userId = '0946cfb0-d1c6-4146-bf64-3bc0c6a043d9';
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('userId', userId)
    .single();

  if (error) {
    console.log('Error fetching user:', error);
    return;
  }

  console.log(`User details for ${userId}:`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Role: ${user.role}`);
}

checkUser();
