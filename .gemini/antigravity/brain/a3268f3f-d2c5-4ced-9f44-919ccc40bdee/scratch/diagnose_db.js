import db from './backend/database/db.js';

async function diagnose() {
  console.log('--- START DIAGNOSTIC ---');
  
  try {
    // 1. Check Organizers
    const { data: orgs, error: orgErr } = await db.from('organizers').select('ownerUserId, organizerName');
    if (orgErr) console.error('Error fetching orgs:', orgErr);
    else console.log('Organizers found:', orgs);
    
    // 2. Check Staff User
    const staffEmail = 'aganancaloy@gmail.com';
    const { data: user, error: userErr } = await db.from('users').select('*').eq('email', staffEmail).maybeSingle();
    if (userErr) console.error('Error fetching user:', userErr);
    else {
       if (user) {
         console.log('Staff User found:', {
           userId: user.userId || user.id,
           role: user.role,
           employerId: user.employerId || user.employerid
         });
       } else {
         console.log('Staff user NOT found by email:', staffEmail);
       }
    }
    
    // 3. Check Invites
    const { data: invites, error: inviteErr } = await db.from('invites').select('*').eq('email', staffEmail);
    if (inviteErr) console.error('Error fetching invites:', inviteErr);
    else console.log('Invitations for email:', invites);

  } catch (e) {
    console.error('Fatal Error:', e);
  }

  console.log('--- END DIAGNOSTIC ---');
  process.exit(0);
}

diagnose();
