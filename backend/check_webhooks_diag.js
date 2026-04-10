import supabase from './database/db.js';

async function checkWebhooks() {
    console.log('[Diagnostic] Checking for recent Webhook Events...');
    const { data: webhooks, error } = await supabase
        .from('webhookEvents')
        .select('*')
        .order('receivedAt', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching webhooks:', error);
        return;
    }

    if (!webhooks || webhooks.length === 0) {
        console.log('No webhook events found in the database.');
    } else {
        console.log(`Found ${webhooks.length} recent webhook events:`);
        webhooks.forEach(w => {
            console.log(`- ID: ${w.webhookEventsId} | ID: ${w.externalId} | Status: ${w.processingStatus} | Type: ${w.eventType} | Received: ${w.receivedAt}`);
            if (w.processingStatus === 'FAILED') {
                // Log payload or error if available (check your schema)
            }
        });
    }

    console.log('\n[Diagnostic] Checking for recent Payment Transactions...');
    const { data: txs, error: txErr } = await supabase
        .from('paymentTransactions')
        .select('*, orders(status, buyerEmail)')
        .order('created_at', { ascending: false })
        .limit(10);

    if (txErr) {
        console.error('Error fetching transactions:', txErr);
        return;
    }

    txs.forEach(tx => {
        console.log(`- TX ID: ${tx.paymentTransactionId} | OrderId: ${tx.orderId} | Status: ${tx.status} | Order Status: ${tx.orders?.status} | User: ${tx.orders?.buyerEmail}`);
    });
}

checkWebhooks();
