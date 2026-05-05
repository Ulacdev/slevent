
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkReviewsTable() {
    const { data, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.log('Reviews table does not exist or error:', error.message);
    } else {
        console.log('Reviews table exists. Row count:', data.length);
    }
}

checkReviewsTable();
