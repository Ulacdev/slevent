import supabase from './database/db.js';
import { decryptString } from './utils/encryption.js';

async function testHitPay() {
    const adminEmail = 'rovickromasanta.startuplab@gmail.com';
    console.log(`[Diagnostic] Testing HitPay connection for Admin: ${adminEmail}`);

    const { data: user } = await supabase.from('users').select('userId').eq('email', adminEmail).single();
    if (!user) {
        console.error('Admin user not found');
        return;
    }

    const { data: settings } = await supabase.from('settings').select('key, value').eq('user_id', user.userId);
    const mapped = {};
    settings.forEach(s => mapped[s.key] = s.value);

    const apiKeyEnc = mapped['hitpay_api_key'];
    const saltEnc = mapped['hitpay_salt'];
    const mode = mapped['hitpay_mode'] || 'sandbox';

    if (!apiKeyEnc || !saltEnc) {
        console.error('HitPay keys not found in settings for this user');
        return;
    }

    const apiKey = decryptString(apiKeyEnc);
    const salt = decryptString(saltEnc);
    const hitpayApiUrl = mode === 'live' ? 'https://api.hit-pay.com' : 'https://api.sandbox.hit-pay.com';

    console.log(`[Diagnostic] Using Mode: ${mode}`);
    console.log(`[Diagnostic] Target URL: ${hitpayApiUrl}`);
    console.log(`[Diagnostic] API Key Prefix: ${apiKey.substring(0, 5)}...`);

    const start = Date.now();
    try {
        console.log('[Diagnostic] Sending POST request to HitPay...');
        const payload = new URLSearchParams();
        payload.set('amount', '1.00');
        payload.set('currency', 'PHP');
        payload.set('reference_number', `DIAG-${Date.now()}`);
        payload.set('purpose', 'Diagnostic Test');

        const response = await fetch(`${hitpayApiUrl}/v1/payment-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-BUSINESS-API-KEY': apiKey,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: payload.toString()
        });

        const end = Date.now();
        console.log(`[Diagnostic] Response received in ${end - start}ms`);
        console.log(`[Diagnostic] Status: ${response.status} ${response.statusText}`);
        
        const data = await response.json();
        console.log(`[Diagnostic] Response Data:`, JSON.stringify(data, null, 2));

    } catch (err) {
        const end = Date.now();
        console.error(`[Diagnostic] Request failed after ${end - start}ms:`, err);
    }
}

testHitPay();
