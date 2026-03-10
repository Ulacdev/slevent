
import supabase from './database/db.js';

async function check() {
  const { count, error } = await supabase.from('auditLogs').select('*', { count: 'exact', head: true });
  console.log('Total auditLogs count:', count, error);
  process.exit(0);
}
check();
