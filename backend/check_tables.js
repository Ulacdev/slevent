import supabase from './database/db.js';

async function checkTables() {
    console.log('--- Checking Database Tables ---');
    
    // Check tables found in promotions/boost logic
    const tables = ['promotions', 'promoted_events', 'planFeatures', 'organizers', 'events'];
    
    for (const table of tables) {
        try {
            const { error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`❌ ${table}: Error ${error.code} - ${error.message}`);
            } else {
                console.log(`✅ ${table}: Exists`);
            }
        } catch (e) {
            console.log(`❌ ${table}: Threw exception - ${e.message}`);
        }
    }
}

checkTables();
