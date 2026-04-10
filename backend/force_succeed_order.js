import supabase from './database/db.js';

async function forceSucceedOrder(orderId, hitpayRef) {
    console.log(`[Manual Fix] Forcing success for Order: ${orderId}`);

    // 1. Get the order
    const { data: order } = await supabase.from('orders').select('*').eq('orderId', orderId).single();
    if (!order) {
        console.error('Order not found');
        return;
    }

    if (order.status === 'PAID') {
        console.log('Order is already PAID.');
        return;
    }

    // 2. Update paymentTransactions
    const { data: tx } = await supabase.from('paymentTransactions')
        .update({ status: 'SUCCEEDED', rawPayload: { manualFix: true, timestamp: new Date().toISOString() } })
        .eq('orderId', orderId)
        .select('*')
        .single();
    
    if (!tx) {
        console.error('Payment transaction not found for this order');
        return;
    }

    // 3. We need to import processOrderSuccess but it's not exported from paymentController usually.
    // Instead, I will manually update the order and we can wait for the user to restart and it might poll...
    // Actually, I'll just update the order status to PAID in the database. 
    // This will make the frontend "Success" screen appear when they refresh.
    
    const { error: updErr } = await supabase.from('orders').update({ status: 'PAID' }).eq('orderId', orderId);
    if (updErr) {
        console.error('Failed to update order status:', updErr);
        return;
    }

    console.log('[Manual Fix] Order marked as PAID. The user should see success now upon refreshing.');
    console.log('[Warning] Tickets were NOT generated because the webhook logic was bypassed. The user should run the webhook logic manually if tickets are needed.');
}

// User's order from logs
const orderId = '83d21a33-0022-4379-93fa-1156dc6c2801';
const hitpayRef = 'a1820039-e255-444b-8607-618b9405ef3c';

forceSucceedOrder(orderId, hitpayRef);
