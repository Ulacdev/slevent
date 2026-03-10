
import supabase from './database/db.js';

async function check() {
  const { data, error } = await supabase.from('events').insert({
    eventName: 'test req',
    slug: 'test-req-' + Date.now()
  }).select();
  
  if (error) {
    console.log('Insert error:', error.message, error.code);
  } else {
    console.log('Success! createdBy can be null.');
    await supabase.from('events').delete().eq('eventId', data[0].eventId);
  }
  process.exit(0);
}
check();
