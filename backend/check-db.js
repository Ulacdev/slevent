import supabase from './database/db.js';

async function checkTable() {
    console.log('--- Database Verification ---');
    try {
        const { error } = await supabase.from('search_history').select('*').limit(1);
        if (error) {
            if (error.code === '42P01') {
                console.error('❌ Table "search_history" does NOT exist.');
                console.log('\nPlease run the following SQL in your Supabase SQL Editor:');
                console.log(`
CREATE TABLE search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
                `);
            } else {
                console.error('❌ Error checking table:', error.message);
            }
        } else {
            console.log('✅ Table "search_history" is ready!');
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err.message);
    }
    process.exit();
}

checkTable();
