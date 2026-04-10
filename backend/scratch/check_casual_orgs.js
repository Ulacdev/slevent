import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCasualOrganizers() {
  console.log('--- Checking Casual Organizers & Managed Payouts ---\n');

  // 1. Find the "Casual" plan if it exists
  const { data: plans, error: planErr } = await supabase
    .from('plans')
    .select('*')
    .ilike('name', '%casual%');
  
  if (planErr) console.error('Error fetching plans:', planErr);
  console.log('Casual Plans found:', plans?.length || 0);
  plans?.forEach(p => console.log(`- Plan: ${p.name} (ID: ${p.planId})`));

  // 2. Find organizers who are either on a Casual plan or identified as "Casual"
  // First, let's just list organizers and their subscriptions
  const { data: orgs, error: orgErr } = await supabase
    .from('organizers')
    .select(`
      organizerId,
      organizerName,
      ownerUserId,
      organizersubscriptions (
        planId,
        status,
        plans (name)
      )
    `);

  if (orgErr) {
    console.error('Error fetching organizers:', orgErr);
    return;
  }

  const casualOrgs = orgs.filter(o => 
    o.organizersubscriptions?.some(s => s.plans?.name?.toLowerCase().includes('casual'))
  );

  console.log(`\nFound ${casualOrgs.length} Organizers on Casual Plan:`);

  for (const org of casualOrgs) {
    console.log(`\nOrganizer: ${org.organizerName} (ID: ${org.organizerId})`);
    console.log(`Owner User ID: ${org.ownerUserId}`);

    // Check settings for this owner
    const { data: settings, error: setErr } = await supabase
      .from('settings')
      .select('key, value')
      .eq('user_id', org.ownerUserId)
      .in('key', ['payout_is_managed', 'hitpay_enabled', 'hitpay_mode']);

    if (setErr) {
      console.error(`  Error fetching settings for ${org.ownerUserId}:`, setErr);
      continue;
    }

    const mappedSettings = {};
    settings?.forEach(s => mappedSettings[s.key] = s.value);

    console.log(`  Managed Payout: ${mappedSettings.payout_is_managed === 'true' ? 'YES ✅' : 'NO ❌'}`);
    console.log(`  HitPay Enabled: ${mappedSettings.hitpay_enabled === 'true' ? 'YES' : 'NO'}`);
    console.log(`  Mode: ${mappedSettings.hitpay_mode || 'N/A'}`);
  }

  // 3. Check for the specific account "StartupLab Managed Payouts" or similar
  console.log('\n--- Checking for "StartupLab Managed Payouts" Configuration ---');
  const { data: adminSettings } = await supabase
    .from('users')
    .select('userId, email')
    .eq('role', 'ADMIN');

  for (const admin of adminSettings || []) {
    const { data: adminSets } = await supabase
      .from('settings')
      .select('key, value')
      .eq('user_id', admin.userId)
      .ilike('key', 'hitpay%');
    
    console.log(`Admin (${admin.email}) HitPay Setup:`, adminSets?.length ? 'Configured' : 'NOT CONFIGURED');
  }
}

checkCasualOrganizers();
