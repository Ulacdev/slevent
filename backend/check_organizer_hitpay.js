import supabase from './database/db.js';
import { decryptString } from './utils/encryption.js';

async function checkOrganizerSettings() {
  const userId = '0946cfb0-d1c6-4146-bf64-3bc0c6a043d9';
  const { data: settings, error } = await supabase
    .from('settings')
    .select('key, value')
    .eq('user_id', userId)
    .in('key', ['hitpay_api_key', 'hitpay_enabled', 'hitpay_mode', 'hitpay_salt']);

  if (error) {
    console.log('Error fetching settings:', error);
    return;
  }

  console.log(`HitPay Settings for Organizer (${userId}):`);
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

checkOrganizerSettings();
