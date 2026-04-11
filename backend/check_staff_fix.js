import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const email = 'aganancaloy@gmail.com';
  console.log(`Checking data for: ${email}`);
  
  const { data: user, error: userError } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (userError) console.error('User Error:', userError);
  console.log('USER RECORD:', user);

  if (user) {
    const empId = user.employerId || user.employerid;
    console.log(`Resolved employerId: ${empId}`);
    
    if (empId) {
      const { data: org, error: orgError } = await supabase.from('organizers').select('*').eq('ownerUserId', empId).maybeSingle();
      if (orgError) console.error('Org Error:', orgError);
      console.log('ORGANIZER RECORD:', org);
    } else {
      console.log('No employerId found in user record.');
    }
  }

  const { data: invites, error: inviteError } = await supabase.from('invites').select('*').eq('email', email);
  if (inviteError) console.error('Invite Error:', inviteError);
  console.log('INVITES FOUND:', invites);
}

check();
