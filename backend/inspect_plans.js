
import supabase from './database/db.js';

async function check() {
  const { data: plans, error } = await supabase.from('plans').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Plans:', JSON.stringify(plans, null, 2));
  }
  process.exit(0);
}
check();
