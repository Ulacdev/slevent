
import supabase from './database/db.js';
import { randomUUID } from 'crypto';

async function test() {
  const userId = '3e0f7608-8e62-4b2a-9e1e-bc9cc45e902b'; // A dummy or real userId
  const orderId = randomUUID();
  
  const { data, error } = await supabase.from('orders').insert({
    orderId: orderId,
    userId: userId,
    eventId: null, // Test if eventId can be null
    buyerName: 'Plan Test',
    buyerEmail: 'plan@test.com',
    totalAmount: 0,
    currency: 'PHP',
    status: 'PAID',
    metadata: { type: 'PLAN_TEST' }
  }).select();

  console.log('Result:', data, 'Error:', error);
  if (data) {
     await supabase.from('orders').delete().eq('orderId', orderId);
     console.log('Cleaned up');
  }
  process.exit(0);
}
test();
