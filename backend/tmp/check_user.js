import { config } from 'dotenv';
config(); // Load variables from .env if present

import supabase from '../database/db.js';

async function checkUser() {
    const userId = 'd6e6eeaa-c793-44bd-8698-c42044cb0fb1';
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (!data) {
        console.log('User not found');
        return;
    }

    console.log('User Data:', JSON.stringify(data, null, 2));
}

checkUser();
