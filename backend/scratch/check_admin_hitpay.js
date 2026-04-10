
import supabase from '../database/db.js';

async function checkAdminHitpay() {
  console.log('--- CHECKING ADMIN HITPAY CONFIG ---');
  
  try {
    // 1. Find all admins
    const { data: admins, error: adminErr } = await supabase
      .from('users')
      .select('userId, role, email')
      .eq('role', 'ADMIN');

    if (adminErr) throw adminErr;
    if (!admins || admins.length === 0) {
      console.log('❌ No admin users found in the system.');
      return;
    }

    console.log(`Found ${admins.length} admin(s). Checking settings...`);

    for (const admin of admins) {
      const { data: settings, error: setErr } = await supabase
        .from('settings')
        .select('key, value')
        .eq('user_id', admin.userId)
        .in('key', ['hitpay_mode', 'hitpay_enabled', 'hitpay_api_key']);

      if (setErr) {
        console.error(`Error fetching settings for admin ${admin.email}:`, setErr.message);
        continue;
      }

      const config = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
      
      console.log(`\nAdmin: ${admin.email} (ID: ${admin.userId})`);
      console.log(`- HitPay Enabled: ${config.hitpay_enabled === 'true' ? '✅ YES' : '❌ NO'}`);
      console.log(`- HitPay Mode: ${config.hitpay_mode === 'live' ? '🚀 LIVE' : '🧪 SANDBOX'}`);
      console.log(`- API Key Set: ${config.hitpay_api_key ? '✅ YES' : '❌ NO'}`);
    }

    console.log('\n--- FINAL VERDICT ---');
    const isAnyLive = admins.some(async (a) => {
        const { data } = await supabase.from('settings').select('value').eq('user_id', a.userId).eq('key', 'hitpay_mode').maybeSingle();
        return data?.value === 'live';
    });
    
    // Note: Live mode for Admin is critical for Managed Payouts in production.
  } catch (err) {
    console.error('Check failed:', err.message);
  }
}

checkAdminHitpay();
