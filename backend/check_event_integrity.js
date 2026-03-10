
import supabase from './database/db.js';

async function check() {
  const { data: event, error: eErr } = await supabase.from('events').select('*').eq('slug', 'event-church').single();
  if (eErr) {
    console.error('Event error:', eErr);
    process.exit(1);
  }
  
  console.log('Event organizerId:', event.organizerId);
  console.log('Event createdBy:', event.createdBy);

  if (event.organizerId) {
    const { data: org, error: oErr } = await supabase.from('organizers').select('*').eq('organizerId', event.organizerId).maybeSingle();
    console.log('Organizer exists:', !!org, oErr || '');
  }
  
  if (event.createdBy) {
    const { data: user, error: uErr } = await supabase.from('users').select('*').eq('userId', event.createdBy).maybeSingle();
    console.log('Creator exists:', !!user, uErr || '');
  }

  process.exit(0);
}
check();
