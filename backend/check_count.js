
import supabase from './database/db.js';

async function check() {
  const { count, error } = await supabase.from('events').select('*', { count: 'exact', head: true });
  console.log('Total events count:', count, error);
  process.exit(0);
}
check();
