
import supabase from './database/db.js';

async function check() {
  const { data: orgs, error } = await supabase.from('organizers').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Organizers columns:', JSON.stringify(Object.keys(orgs[0] || {}), null, 2));
  }
  process.exit(0);
}
check();
