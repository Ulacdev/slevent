
import supabase from './database/db.js';

async function check() {
  const { data: orders } = await supabase.from('orders').select('*');
  const nullEventIdCount = orders?.filter(o => !o.eventId).length;
  console.log('Total orders:', orders?.length, 'Orders with null eventId:', nullEventIdCount);

  const { data: tx } = await supabase.from('paymentTransactions').select('*').limit(1);
  console.log('Transactions columns:', tx ? Object.keys(tx[0] || {}) : 'No data');

  process.exit(0);
}
check();
