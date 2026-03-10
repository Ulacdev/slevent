
import supabase from './database/db.js';

async function check() {
  const { data, error } = await supabase.rpc('get_tables'); // If rpc works
  if (error) {
     const { data: tables } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
     console.log('Tables:', tables);
  } else {
     console.log('Tables:', data);
  }
  process.exit(0);
}
check();
