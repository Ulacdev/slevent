import supabase from './database/db.js';
import { decryptString } from './utils/encryption.js';

async function checkAllHitPay() {
  const { data: settings, error } = await supabase
    .from('settings')
    .select('*')
    .ilike('key', 'hitpay_%');

  if (error) {
    console.log('Error searching HitPay:', error);
    return;
  }

  if (!settings || settings.length === 0) {
    console.log('No HitPay settings found.');
    return;
  }

  const users = {};
  for (const s of settings) {
    if (!users[s.user_id]) {
        const { data: user } = await supabase
          .from('users')
          .select('email')
          .eq('userId', s.user_id)
          .single();
        users[s.user_id] = user ? user.email : 'Unknown';
    }
  }

  console.log(`Found ${settings.length} HitPay setting records for ${Object.keys(users).length} users:`);
  
  for (const userId of Object.keys(users)) {
    console.log(`\nUser: ${users[userId]} (${userId})`);
    const userSettings = settings.filter(s => s.user_id === userId);
    userSettings.forEach(s => {
      let value = s.value;
      if (s.key === 'hitpay_api_key' || s.key === 'hitpay_salt') {
        try {
          value = decryptString(s.value);
          value = value ? value.substring(0, 10) + '...' : 'null';
        } catch (e) {
          value = '[DECRYPTION FAILED]';
        }
      }
      console.log(`  - ${s.key}: ${value}`);
    });
  }
}

checkAllHitPay();
