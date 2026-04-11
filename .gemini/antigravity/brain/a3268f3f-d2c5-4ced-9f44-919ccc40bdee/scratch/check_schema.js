import db from './backend/database/db.js';

async function checkSchema() {
  console.log('--- USERS TABLE SCHEMA ---');
  // We can't easily describe tables via Supabase client without raw SQL,
  // but we can try to fetch one record and see the keys.
  const { data, error } = await db.from('users').select('*').limit(1);
  if (error) console.error('Error:', error);
  else console.log('Sample record keys:', Object.keys(data[0] || {}));
  
  // Try an upsert and catch the error specifically
  const testId = '00000000-0000-4000-a000-000000000000';
  const { error: upsertErr } = await db.from('users').upsert({ userId: testId, email: 'test@example.com' }, { onConflict: 'userId' });
  console.log('Upsert by userId error:', upsertErr?.message || 'none');
  
  const { error: upsertErr2 } = await db.from('users').upsert({ id: testId, email: 'test@example.com' }, { onConflict: 'id' });
  console.log('Upsert by id error:', upsertErr2?.message || 'none');

  process.exit(0);
}

checkSchema();
