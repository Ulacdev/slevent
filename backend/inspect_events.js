
import supabase from './database/db.js';

async function check() {
  const { data: events, error } = await supabase.from('events').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Events columns:', JSON.stringify(Object.keys(events[0] || {}), null, 2));
  }
  process.exit(0);
}
check();
