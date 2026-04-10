import supabase from './database/db.js';

async function findSandbox() {
  const { data: settings, error } = await supabase
    .from('settings')
    .select('user_id, value')
    .eq('key', 'hitpay_mode')
    .eq('value', 'sandbox');

  if (error) {
    console.log('Error searching sandbox:', error);
    return;
  }

  if (!settings || settings.length === 0) {
    console.log('No users have HitPay mode set to sandbox.');
    return;
  }

  console.log(`Found ${settings.length} sandbox accounts:`);
  for (const s of settings) {
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('userId', s.user_id)
      .single();
    console.log(`- ${user ? user.email : 'Unknown'} (${s.user_id})`);
  }
}

findSandbox();
