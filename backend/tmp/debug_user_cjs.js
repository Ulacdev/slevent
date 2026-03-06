const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env
const envFile = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
} else {
    console.log('.env not found at', envFile);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing SUPABASE_URL or SUPABASE_KEY in env', { supabaseUrl, hasKey: !!supabaseKey });
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const userId = 'd6e6eeaa-c793-44bd-8698-c42044cb0fb1';
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (!data) {
        const res2 = await supabase.from('users').select('*').eq('userId', userId).maybeSingle();
        if (res2.data) {
            console.log('Found via userId:', JSON.stringify(res2.data, null, 2));
        } else {
            console.log('User not found in users table.');
        }
    } else {
        console.log('Found via id:', JSON.stringify(data, null, 2));
    }
}

check();
