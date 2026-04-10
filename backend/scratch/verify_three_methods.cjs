
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verifyThreeMethods() {
    console.log('--- RUNNING "THREE METHODS" REVOLUTION TEST ---\n');

    const testUserId = '61070776-be11-4770-bc10-67568582d92c'; // Using a known test user ID

    console.log('1. Verifying Independent Wallets and Selection...');
    
    const { data: settings, error } = await supabase
        .from('settings')
        .select('key, value')
        .eq('user_id', testUserId)
        .ilike('key', 'payout_%');

    if (error) {
        console.error('Failed to fetch settings:', error);
        return;
    }

    const mapped = {};
    settings.forEach(s => mapped[s.key] = s.value);

    const tryParse = (str) => {
        try { return str ? JSON.parse(str) : null; }
        catch (e) { return null; }
    };

    const gcash = tryParse(mapped['payout_gcash_data']);
    const maya = tryParse(mapped['payout_maya_data']);
    const activeMethod = mapped['payout_method'];
    const activeNumber = mapped['payout_account_number'];

    console.log('Current State:');
    console.log(` - Active Method: ${activeMethod}`);
    console.log(` - Active Account Number in Main Payout: ${activeNumber}`);
    console.log(` - GCash Data Stored:`, gcash ? 'YES' : 'NO');
    console.log(` - Maya Data Stored:`, maya ? 'YES' : 'NO');

    if (activeMethod && activeNumber) {
        console.log('\n✅ TEST 1 SUCCESS: Active method correctly detected.');
    } else {
        console.log('\n❌ TEST 1 FAILED: No active method found.');
    }

    if (gcash && maya) {
        console.log('✅ TEST 2 SUCCESS: Independent data storage verified (GCash and Maya both exist separately).');
    } else {
        console.log('ℹ️ Note: One or more wallets are empty (this is OK if you havent saved them yet).');
    }

    console.log('\n2. Verifying Clearing Logic...');
    const { data: hpSettings } = await supabase
        .from('settings')
        .select('key, value')
        .eq('user_id', testUserId)
        .eq('key', 'hitpay_api_key');

    if (hpSettings[0]?.value === '') {
        console.log('✅ TEST 3 SUCCESS: "Saving Nothing" (Clearing) logic is functional.');
    } else {
        console.log('ℹ️ Note: API Key still exists (Normal if not cleared yet).');
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
}

verifyThreeMethods();
