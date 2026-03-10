
import supabase from './database/db.js';

async function check() {
  const { data: tt1, error: err1 } = await supabase.from('ticketTypes').select('*').limit(1);
  console.log('ticketTypes:', tt1 ? 'Exists' : 'Missing', err1?.message || '');

  const { data: tt2, error: err2 } = await supabase.from('ticket_types').select('*').limit(1);
  console.log('ticket_types:', tt2 ? 'Exists' : 'Missing', err2?.message || '');
  
  process.exit(0);
}
check();
