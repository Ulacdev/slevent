import supabase from './database/db.js';

async function checkRecentTransactions() {
  console.log('\n--- Recent Subscription Attempts ---');
  const { data: subs, error: subErr } = await supabase
    .from('organizersubscriptions')
    .select('subscriptionId, status, hitPayPaymentId, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (subErr) console.error('Sub Error:', subErr);
  else {
    subs.forEach(s => {
      console.log(`SubID: ${s.subscriptionId}, Status: ${s.status}, HitPayID: ${s.hitPayPaymentId}, Created: ${s.created_at}`);
    });
  }

  console.log('\n--- Recent Payment Transactions (Checks Gateway) ---');
  const { data: txs, error: txErr } = await supabase
    .from('paymentTransactions')
    .select('paymentTransactionId, orderId, gateway, status, hitpayReferenceId, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (txErr) console.error('TX Error:', txErr);
  else {
    txs.forEach(t => {
      const gName = typeof t.gateway === 'string' ? t.gateway : (t.gateway?.name || 'unknown');
      console.log(`TXID: ${t.paymentTransactionId}, Gateway: ${gName}, Status: ${t.status}, Reference: ${t.hitpayReferenceId}, Created: ${t.created_at}`);
    });
  }
}

checkRecentTransactions();
