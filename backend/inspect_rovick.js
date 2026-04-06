import db from './database/db.js';

async function inspect() {
  const email = 'rovickromasanta.startuplab@gmail.com';
  console.log(`Inspecting ${email}`);

  // 0. Check Supabase Auth
  console.log('\n--- Supabase Auth Check ---');
  const { data: { users: authUsers }, error: authError } = await db.auth.admin.listUsers();
  if (authError) {
    console.error('Auth error:', authError);
  } else {
    const matches = authUsers.filter(u => u.email?.toLowerCase().trim() === email.toLowerCase());
    console.log(`Found ${matches.length} auth identities:`);
    matches.forEach(m => {
       console.log(`- ${m.id} (${m.email}) provider: ${m.app_metadata?.provider || 'password'}`);
    });
  }

  // 1. Fetch DB user
  console.log('\n--- DB Users Check ---');
  const { data: dbUsersData } = await db.from('users').select('*').eq('email', email);
  console.log(`Found ${dbUsersData?.length || 0} users in 'users' table:`);
  (dbUsersData || []).forEach(u => {
     console.log(`- ${u.userId} (${u.email}) role: ${u.role}`);
  });
  
  const user = (dbUsersData || [])[0];
  if (user) {
    const { data: org } = await db.from('organizers').select('*').eq('ownerUserId', user.userId || user.id).maybeSingle();
    console.log('Organizer:', JSON.stringify(org, null, 2));

    const { data: events } = await db.from('events').select('*');
    const myEvents = events.filter(e => 
       e.createdBy === user.userId || 
       e.createdBy === user.id || 
       (typeof e.createdBy === 'string' && e.createdBy.toLowerCase() === email.toLowerCase())
    );
    console.log(`Found ${myEvents.length} events for Rovick:`);
    myEvents.forEach(e => {
       console.log(`- ${e.eventName} (id: ${e.eventId}, creator: ${e.createdBy}, orgId: ${e.organizerId})`);
    });
  }
  process.exit(0);
}

inspect();
