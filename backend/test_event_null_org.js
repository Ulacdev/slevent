
import supabase from './database/db.js';

async function test() {
  const userId = '9302f1d4-f966-4881-a811-6541dab36edc';
  const { data, error } = await supabase.from('events').insert({
    eventName: 'Test Null Organizer 2',
    createdBy: userId,
    organizerId: null
  }).select();
  
  if (error) {
    console.log('Error inserting null organizerId:', error.message, error.code);
  } else {
    console.log('Success! organizerId can be null.');
    await supabase.from('events').delete().eq('eventId', data[0].eventId);
  }
  process.exit(0);
}
test();
