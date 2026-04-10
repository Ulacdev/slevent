import supabase from './database/db.js';
import { decryptString } from './utils/encryption.js';

async function checkSettings() {
  try {
    const { data: adminUser } = await supabase
      .from('users')
      .select('userId')
      .eq('role', 'ADMIN')
      .limit(1)
      .maybeSingle();

    if (!adminUser) {
      console.log('Admin user not found');
      return;
    }

    console.log(`Checking settings for admin user ID: ${adminUser.userId}`);

    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value')
      .eq('user_id', adminUser.userId);

    if (error) {
      console.log('Error fetching settings:', error);
      return;
    }

    if (!settings || settings.length === 0) {
      console.log('No settings found for this user');
      return;
    }

    console.log(`Found ${settings.length} settings:`);
    settings.forEach(s => {
      console.log(`- ${s.key}`);
    });

    const hitpayKeys = ['hitpay_api_key', 'hitpay_enabled', 'hitpay_mode', 'hitpay_salt'];
    const hitpaySettings = settings.filter(s => hitpayKeys.includes(s.key));

    console.log('\nHitPay Details:');
    hitpaySettings.forEach(s => {
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
  } catch (err) {
    console.error('An error occurred:', err);
  }
}

checkSettings();
