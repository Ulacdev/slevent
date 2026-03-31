import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

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
        const columns = Object.keys(data[0]);
        console.log('--- ALL COLUMNS ---');
        columns.forEach(c => console.log(`- ${c}`));
    } else {
        console.log('No users found in table.');
    }
}

check().then(() => process.exit(0));
