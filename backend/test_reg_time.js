
import supabase from './database/db.js';

async function testUpdate() {
    console.log('--- Dev Console Test: Event Registration Timing ---');
    
    // 1. Get a sample event
    const { data: event, error: fetchErr } = await supabase
        .from('events')
        .select('*')
        .limit(1)
        .single();
        
    if (fetchErr) {
        console.error('Fetch Error:', fetchErr);
        process.exit(1);
    }
    
    const eventId = event.eventId;
    console.log(`Testing with Event: ${event.eventName} (${eventId})`);
    
    // 2. Prepare test values
    // We'll set it to 08:30 AM and 11:45 PM for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const testOpenAt = `${dateStr}T08:30:00.000Z`;
    const testCloseAt = `${dateStr}T23:45:00.000Z`;
    
    console.log(`Updating to:\n  Open: ${testOpenAt}\n  Close: ${testCloseAt}`);
    
    // 3. Perform update
    const { data: updated, error: updateErr } = await supabase
        .from('events')
        .update({
            regOpenAt: testOpenAt,
            regCloseAt: testCloseAt,
            updated_at: new Date().toISOString()
        })
        .eq('eventId', eventId)
        .select('*')
        .single();
        
    if (updateErr) {
        console.error('Update Error:', updateErr);
        process.exit(1);
    }
    
    console.log('Update successful. Re-verifying...');
    
    // 4. Verify
    if (updated.regOpenAt === testOpenAt && updated.regCloseAt === testCloseAt) {
        console.log('✅ TEST PASSED: Database accepted and stored the timing changes correctly.');
    } else {
        console.log('❌ TEST FAILED: Values did not match!');
    console.log('  Found Open (Raw):', JSON.stringify(updated.regOpenAt));
    console.log('  Found Close (Raw):', JSON.stringify(updated.regCloseAt));
    }
    
    process.exit(0);
}

testUpdate();
