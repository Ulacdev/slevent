import supabase from '../database/db.js';

async function checkSchema() {
  console.log('Checking eventLikes...');
  const { data: likes, error: likesErr } = await supabase
    .from('eventLikes')
    .select('*')
    .limit(1);
  if (likesErr) console.error('eventLikes error:', likesErr);
  else console.log('eventLikes sample:', likes);

  console.log('\nChecking organizerFollowers...');
  const { data: followers, error: followersErr } = await supabase
    .from('organizerFollowers')
    .select('*')
    .limit(1);
  if (followersErr) console.error('organizerFollowers error:', followersErr);
  else console.log('organizerFollowers sample:', followers);
}

checkSchema();
