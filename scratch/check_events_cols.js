import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching events:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in events table:', Object.keys(data[0]));
  } else {
    console.log('No events found, but table exists.');
  }
}

checkSchema();
