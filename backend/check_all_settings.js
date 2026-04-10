import supabase from './database/db.js';

async function checkAllSettings() {
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value, user_id');

    if (error) {
      console.log('Error fetching settings:', error);
      return;
    }

    if (!settings || settings.length === 0) {
      console.log('No settings found in the entire table');
      return;
    }

    console.log(`Found ${settings.length} total settings records:`);
    settings.forEach(s => {
      console.log(`- Key: ${s.key}, UserID: ${s.user_id}`);
    });
  } catch (err) {
    console.error('An error occurred:', err);
  }
}

checkAllSettings();
