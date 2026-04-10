import supabase from './database/db.js';
import { decryptString } from './utils/encryption.js';

async function testPayoutLogic() {
  const testOrderId = '6b875dcb-de39-423a-a651-7e0c6c2ed893'; // Using your recent order
  console.log(`[Test] Running Simulation for Order: ${testOrderId}`);

  // 1. Fetch the Order & Metadata
  const { data: order } = await supabase.from('orders').select('*').eq('orderId', testOrderId).single();
  if (!order) {
    console.error('Order not found');
    return;
  }

  // 2. Encrypt/Decrypt keys for the Admin
  const adminEmail = 'rovickromasanta.startuplab@gmail.com';
  const { data: admin } = await supabase.from('users').select('userId').eq('email', adminEmail).single();
  const { data: settings } = await supabase.from('settings').select('key, value').eq('user_id', admin.userId);
  const mapped = {};
  settings.forEach(s => mapped[s.key] = s.value);

  const apiKey = decryptString(mapped['hitpay_api_key']);
  const mode = 'sandbox'; // Force sandbox for testing
  const hitpayApiUrl = 'https://api.sandbox.hit-pay.com';

  console.log(`[Test] Mode: ${mode}`);
  console.log(`[Test] Payout Details Found:`, order.metadata?.payout?.payoutDetails);
  console.log(`[Test] Net Amount to Send: ₱${order.metadata?.payout?.breakdown?.netOrganizerAmount}`);

  // 3. Simulate the Payout Request (using HitPay Transfers API structure)
  const details = order.metadata?.payout?.payoutDetails || {};
  const netAmount = order.metadata?.payout?.breakdown?.netOrganizerAmount || 0;

  const payoutMethodMap = {
    'gcash': 'gcash',
    'maya': 'paymaya',
    'bank_transfer': 'bank_transfer',
    'bank': 'bank_transfer'
  };

  const payload = {
    source_currency: 'php',
    payment_amount: Number(netAmount.toFixed(2)),
    beneficiary: {
      country: 'ph',
      transfer_method: payoutMethodMap[String(details.method).toLowerCase()] || 'gcash',
      transfer_type: 'local',
      currency: 'php',
      holder_type: 'individual',
      holder_name: details.accountName || 'Test User',
      account_number: details.accountNumber || '09123456789'
    }
  };

  console.log('[Test] Final JSON Payload to be sent to HitPay:');
  console.log(JSON.stringify(payload, null, 2));

  // 4. Trial API Call (Sandbox)
  try {
    console.log('[Test] Sending trial request to HitPay Sandbox (/v1/transfers)...');
    const response = await fetch(`${hitpayApiUrl}/v1/transfers`, {
      method: 'POST',
      headers: {
        'X-BUSINESS-API-KEY': apiKey,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`[Test] HitPay Status: ${response.status}`);
    console.log(`[Test] HitPay Response:`, JSON.stringify(data, null, 2));

    if (response.status === 201 || response.status === 200 || data.status === 'success') {
      console.log('✅ TEST SUCCESS: The payout system is ready.');
    } else {
      console.log('❌ TEST FAILED: HitPay rejected the request. This might be because Payouts API is not enabled yet for this key.');
    }
  } catch (err) {
    console.error('❌ TEST ERROR:', err.message);
  }
}

testPayoutLogic();
