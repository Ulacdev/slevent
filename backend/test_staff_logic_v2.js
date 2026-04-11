/*
  STAFF LOGIC VALIDATOR & SELF-HEALING SUITE
  This script tests the end-to-end resolution of Staff -> Employer -> Branding -> Events.
  If it finds issues, it attempts to "heal" the record using invitation history.
*/

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function validateStaffLogic(targetEmail) {
  console.log(`\n🔍 [Validator] Starting deep-check for: ${targetEmail}`);
  console.log('---------------------------------------------------------');

  // 1. Check User Record
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('*')
    .eq('email', targetEmail.toLowerCase().trim())
    .maybeSingle();

  if (userErr) {
    console.error('❌ [Step 1] Database Error:', userErr.message);
    return;
  }
  if (!user) {
    console.error('❌ [Step 1] User not found in database.');
    return;
  }

  console.log(`✅ [Step 1] User Record Found: ID=${user.userId}, Role=${user.role}`);

  // 2. Resolve Employer Link
  let empId = user.employerId || user.employerid;
  
  if (!empId && user.role === 'STAFF') {
    console.warn('⚠️ [Step 2] Employer ID is MISSING in user record. Attempting recovery...');
    const { data: invite } = await supabase
      .from('invites')
      .select('invitedBy')
      .eq('email', targetEmail.toLowerCase().trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invite?.invitedBy) {
      empId = invite.invitedBy;
      console.log(`🛠️ [Recovery] Found link in Invites table! Recovered EmpID: ${empId}`);
      // Healing
      await supabase.from('users').update({ employerId: empId }).eq('userId', user.userId);
      console.log('✅ [Recovery] User record updated with recovered link.');
    } else {
      console.error('❌ [Step 2] No invitation found. Link is permanently broken for this account.');
      return;
    }
  } else if (empId) {
    console.log(`✅ [Step 2] Employer Link verified: ${empId}`);
  }

  // 3. Resolve Organization Branding
  if (empId) {
    const { data: org, error: orgErr } = await supabase
      .from('organizers')
      .select('organizerId, organizerName, profileImageUrl')
      .eq('ownerUserId', empId)
      .maybeSingle();

    if (orgErr) {
      console.error('❌ [Step 3] Organizer Lookup Error:', orgErr.message);
    } else if (!org) {
      console.error(`❌ [Step 3] No organizer profile found for employer UID: ${empId}`);
    } else {
      console.log(`✅ [Step 3] Branding Resolved: Name="${org.organizerName}", Logo=${org.profileImageUrl ? 'FOUND' : 'MISSING'}`);
      if (!org.profileImageUrl) console.warn('⚠️ Warning: Organizer has no profile image!');
      
      // 4. Verify Event Visibility (The "My Events" Test)
      const { data: events, error: eventErr } = await supabase
        .from('events')
        .select('eventId, eventName, createdBy, organizerId')
        .or(`createdBy.eq.${user.userId},createdBy.eq.${empId},organizerId.eq.${org.organizerId}`);

      if (eventErr) {
        console.error('❌ [Step 4] Event Query Error:', eventErr.message);
      } else {
        console.log(`✅ [Step 4] Event Visibility: User sees ${events?.length || 0} organization events.`);
        if (events && events.length > 0) {
          console.log('   Sample Event:', events[0].eventName);
        } else {
          console.warn('⚠️ Warning: No events found for this organization!');
        }
      }
    }
  }

  console.log('---------------------------------------------------------');
  console.log('🏁 [Validator] Test complete.\n');
}

// Run for the specific user reported
validateStaffLogic('aganancaloy@gmail.com');
