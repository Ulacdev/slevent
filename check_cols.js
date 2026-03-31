import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: './backend/.env' })

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !serviceKey) {
    console.error('Missing variables:', { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey })
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function check() {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
        console.error('Error fetching users:', error);
    } else if (data && data.length > 0) {
        console.log('--- USERS TABLE COLUMNS ---');
        console.log(Object.keys(data[0]));
        
        if (Object.keys(data[0]).includes('failed_login_attempts') && Object.keys(data[0]).includes('locked_until')) {
            console.log('\n✅ SUCCESS: Security columns (failed_login_attempts, locked_until) are present!');
        } else {
            console.log('\n❌ MISSING: Security columns NOT found.');
        }
    } else {
        console.log('No users found in table. Checking table structure via common column.');
        // If no data, we could try to insert/delete or just infer. 
        // But usually data[0] is enough if the table has data.
    }
}

check().then(() => process.exit(0));
