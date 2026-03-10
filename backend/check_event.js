
import supabase from './database/db.js';

async function check() {
  const { data, error } = await supabase.from('events').select('*').eq('slug', 'event-church').limit(1);
  console.log('Event by slug:', data);
  if (error) console.error('Error fetching by slug:', error);
  
  const { data: all } = await supabase.from('events').select('eventId, eventName, slug');
  console.log('All events:', all);
  
  process.exit(0);
}
check();
