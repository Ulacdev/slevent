import supabase from './database/db.js';

async function run() {
  console.log('🚀 [Migration] Adding feedback_emails_sent_at to events...');
  const { error } = await supabase.rpc('execute_sql', {
    sql_query: 'ALTER TABLE events ADD COLUMN IF NOT EXISTS feedback_emails_sent_at TIMESTAMPTZ;'
  });

  if (error) {
    console.error('❌ [Migration] Failed:', error.message);
    // If RPC fails, it's likely because execute_sql is not defined.
    // In that case, we can't do much without a migration file or direct access.
    // But usually these environments have some way to run SQL.
  } else {
    console.log('✅ [Migration] Success!');
  }
  process.exit(0);
}

run();
