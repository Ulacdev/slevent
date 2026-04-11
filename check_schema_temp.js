import db from './backend/database/db.js';

async function checkSchema() {
  console.log('--- USERS TABLE SCHEMA ---');
  try {
    const { data, error } = await db.from('users').select('*').limit(1);
    if (error) console.error('Error:', error);
    else console.log('Sample record keys:', Object.keys(data[0] || {}));
    
    // Try an upsert and catch the error specifically
    const testId = '00000000-0000-4000-a000-000000000000';
    console.log('Testing upsert by userId...');
    const res1 = await db.from('users').upsert({ userId: testId, email: 'test@example.com' }, { onConflict: 'userId' });
    console.log('Upsert by userId result:', res1.error?.message || 'SUCCESS');
    
    console.log('Testing upsert by id...');
    const res2 = await db.from('users').upsert({ id: testId, email: 'test@example.com' }, { onConflict: 'id' });
    console.log('Upsert by id result:', res2.error?.message || 'SUCCESS');
  } catch (e) {
    console.error('Fatal Script Error:', e);
  }

  process.exit(0);
}

checkSchema();
