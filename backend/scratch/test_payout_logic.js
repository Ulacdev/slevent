import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mock function to simulate processOrderSuccess logic
async function testPayoutCalculation() {
    console.log('--- Testing Accurate Managed Payout Calculation ---\n');

    // 1. Create a dummy order mimicking a Managed Payout setup
    const orderId = randomUUID();
    const grossAmount = 100.00;
    const initialMetadata = {
        payout: {
            isManaged: true,
            platformFee: 5.00, // Pre-calculated 5%
            organizerPayout: 95.00, // Preliminary
            payoutDetails: {
                method: 'GCASH',
                accountNumber: '09171234567'
            }
        }
    };

    console.log('1. Creating Dummy Order...');
    const { error: insErr } = await supabase.from('orders').insert({
        orderId,
        eventId: '2895432e-8297-4602-ab9f-5e56659d27f8',
        totalAmount: grossAmount,
        currency: 'PHP',
        status: 'PENDING',
        metadata: initialMetadata
    });

    if (insErr) {
        console.error('Failed to create dummy order:', insErr);
        return;
    }

    console.log(`Order ${orderId} created with total 100.00 PHP.`);

    // 2. Simulate Webhook Success with HitPay Fee (e.g., 2.50 PHP)
    const hitpayFee = 2.50;
    console.log(`\n2. Simulating Webhook Success with HitPay Fee: ${hitpayFee} PHP...`);
    
    // FETCH THE ORDER (like the real code does)
    const { data: order } = await supabase.from('orders').select('*').eq('orderId', orderId).single();

    // EXECUTE THE LOGIC (Copied from paymentController.js)
    let finalMetadata = { ...(order.metadata || {}) };
    
    if (finalMetadata.payout?.isManaged) {
        const amount = Number(order.totalAmount);
        const platformFee = finalMetadata.payout.platformFee || Number((amount * 0.05).toFixed(2));
        const netPayout = Number((amount - platformFee - hitpayFee).toFixed(2));

        finalMetadata.payout = {
            ...finalMetadata.payout,
            gatewayFee: hitpayFee,
            platformFee,
            finalNetPayout: netPayout,
            updatedAt: new Date().toISOString()
        };

        console.log('Calculating:');
        console.log(` - Gross: ${amount}`);
        console.log(` - HitPay Fee: ${hitpayFee}`);
        console.log(` - StartupLab Fee: ${platformFee}`);
        console.log(` - FINAL ORGANIZER PAYOUT: ${netPayout}`);
    }

    // 3. Update DB
    await supabase.from('orders').update({ 
        status: 'PAID',
        metadata: finalMetadata
    }).eq('orderId', orderId);

    console.log('\n3. Database Updated. Verification:');
    
    // 4. Verify Final State
    const { data: verifiedOrder } = await supabase.from('orders').select('metadata, status').eq('orderId', orderId).single();
    
    console.log('Final Order Status:', verifiedOrder.status);
    console.log('Final Metadata Payout Object:', JSON.stringify(verifiedOrder.metadata.payout, null, 2));

    if (verifiedOrder.metadata.payout.finalNetPayout === 92.50) {
        console.log('\n✅ TEST SUCCESSFUL: The calculation (100 - 5.00 - 2.50 = 92.50) is accurate!');
    } else {
        console.log('\n❌ TEST FAILED: Calculation mismatch.');
    }

    // Cleanup
    await supabase.from('orders').delete().eq('orderId', orderId);
    console.log('\nTest cleanup complete.');
}

testPayoutCalculation();
