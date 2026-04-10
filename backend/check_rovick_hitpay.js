import supabase from './database/db.js';
import { decryptString } from './utils/encryption.js';

async function checkRovickSettings() {
  const userId = 'd6e6eeaa-c793-44bd-8698-c42044cb0fb1';
  const { data: settings, error } = await supabase
    .from('settings')
    .select('key, value')
    .eq('user_id', userId)
    .in('key', ['hitpay_api_key', 'hitpay_enabled', 'hitpay_mode', 'hitpay_salt']);

  if (error) {
    console.log('Error fetching settings:', error);
    return;
  }

  console.log(`HitPay Settings for Rovick (${userId}):`);
  settings.forEach(s => {
    let value = s.value;
    if (s.key === 'hitpay_api_key' || s.key === 'hitpay_salt') {
      try {
        value = decryptString(s.value);
        value = value ? value.substring(0, 5) + '...' : 'null';
      } catch (e) {
        value = '[DECRYPTION FAILED]';
      }
    }
    console.log(`- ${s.key}: ${value}`);
  });
}

checkRovickSettings();
