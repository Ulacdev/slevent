import supabase from '../database/db.js';

const DEFAULT_FEATURES = {
  aiIntegration: false,
  branding: false,
  weddingSuppliers: false,
};

const DEFAULT_LIMITS = {
  users: 1,
  projects: 1,
  contacts: 50,
  accounts: 25,
  storage: '1 GB',
};

const FEATURE_KEYS = {
  aiIntegration: 'feature_aiIntegration',
  branding: 'feature_branding',
  weddingSuppliers: 'feature_weddingSuppliers',
};

const LIMIT_KEYS = {
  users: 'limit_users',
  projects: 'limit_projects',
  contacts: 'limit_contacts',
  accounts: 'limit_accounts',
  storage: 'limit_storage',
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const slugify = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeStorage = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return DEFAULT_LIMITS.storage;
  return /\d/.test(raw) && !/[a-z]/i.test(raw) ? `${raw} GB` : raw;
};

const normalizePlanInput = (body = {}) => {
  const normalizedName = String(body.name || '').trim();
  const normalizedDescription = String(body.description || '').trim();
  const normalizedMonthlyPrice = Math.max(0, toNumber(body.monthlyPrice, 0));
  const normalizedYearlyPrice = Math.max(0, toNumber(body.yearlyPrice, 0));
  const normalizedTrialDays = Math.max(0, Math.floor(toNumber(body.trialDays, 0)));
  const normalizedCurrency = String(body.currency || 'PHP').trim().toUpperCase() || 'PHP';
  const normalizedBillingInterval =
    String(body.billingInterval || 'monthly').trim().toLowerCase() === 'yearly' ? 'yearly' : 'monthly';

  const features = {
    aiIntegration: toBoolean(body?.features?.aiIntegration, DEFAULT_FEATURES.aiIntegration),
    branding: toBoolean(body?.features?.branding, DEFAULT_FEATURES.branding),
    weddingSuppliers: toBoolean(body?.features?.weddingSuppliers, DEFAULT_FEATURES.weddingSuppliers),
  };

  const limits = {
    users: body?.limits?.users ?? DEFAULT_LIMITS.users,
    projects: body?.limits?.projects ?? DEFAULT_LIMITS.projects,
    contacts: body?.limits?.contacts ?? DEFAULT_LIMITS.contacts,
    accounts: body?.limits?.accounts ?? DEFAULT_LIMITS.accounts,
    storage: normalizeStorage(body?.limits?.storage ?? DEFAULT_LIMITS.storage),
  };

  return {
    plan: {
      name: normalizedName,
      description: normalizedDescription || null,
      monthlyPrice: normalizedMonthlyPrice,
      yearlyPrice: normalizedYearlyPrice,
      priceAmount: normalizedBillingInterval === 'yearly' ? normalizedYearlyPrice : normalizedMonthlyPrice,
      currency: normalizedCurrency,
      billingInterval: normalizedBillingInterval,
      trialDays: normalizedTrialDays,
      isDefault: toBoolean(body.isDefault, false),
      isRecommended: toBoolean(body.isRecommended, false),
      isActive: toBoolean(body.isActive, true),
    },
    features,
    limits,
  };
};

const buildFeatureRows = (planId, features, limits) => [
  { planId, key: FEATURE_KEYS.aiIntegration, value: String(Boolean(features.aiIntegration)) },
  { planId, key: FEATURE_KEYS.branding, value: String(Boolean(features.branding)) },
  { planId, key: FEATURE_KEYS.weddingSuppliers, value: String(Boolean(features.weddingSuppliers)) },
  { planId, key: LIMIT_KEYS.users, value: String(limits.users ?? DEFAULT_LIMITS.users) },
  { planId, key: LIMIT_KEYS.projects, value: String(limits.projects ?? DEFAULT_LIMITS.projects) },
  { planId, key: LIMIT_KEYS.contacts, value: String(limits.contacts ?? DEFAULT_LIMITS.contacts) },
  { planId, key: LIMIT_KEYS.accounts, value: String(limits.accounts ?? DEFAULT_LIMITS.accounts) },
  { planId, key: LIMIT_KEYS.storage, value: normalizeStorage(limits.storage) },
];

const coerceLimitValue = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  if (/^unlimited$/i.test(raw)) return 'Unlimited';
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
};

const buildPlanResponse = (row, featureRows = []) => {
  const features = { ...DEFAULT_FEATURES };
  const limits = { ...DEFAULT_LIMITS };

  featureRows.forEach((item) => {
    if (!item) return;
    if (item.key === FEATURE_KEYS.aiIntegration) features.aiIntegration = toBoolean(item.value, false);
    if (item.key === FEATURE_KEYS.branding) features.branding = toBoolean(item.value, false);
    if (item.key === FEATURE_KEYS.weddingSuppliers) features.weddingSuppliers = toBoolean(item.value, false);
    if (item.key === LIMIT_KEYS.users) limits.users = coerceLimitValue(item.value);
    if (item.key === LIMIT_KEYS.projects) limits.projects = coerceLimitValue(item.value);
    if (item.key === LIMIT_KEYS.contacts) limits.contacts = coerceLimitValue(item.value);
    if (item.key === LIMIT_KEYS.accounts) limits.accounts = coerceLimitValue(item.value);
    if (item.key === LIMIT_KEYS.storage) limits.storage = String(item.value || DEFAULT_LIMITS.storage);
  });

  return {
    planId: row.planId,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    monthlyPrice: toNumber(row.monthlyPrice, 0),
    yearlyPrice: toNumber(row.yearlyPrice, 0),
    currency: row.currency || 'PHP',
    billingInterval: row.billingInterval || 'monthly',
    trialDays: Math.max(0, Math.floor(toNumber(row.trialDays, 0))),
    isDefault: !!row.isDefault,
    isRecommended: !!row.isRecommended,
    isActive: !!row.isActive,
    features,
    limits,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const fetchPlansWithFeatures = async () => {
  const { data: rows, error } = await supabase
    .from('plans')
    .select('*')
    .order('isDefault', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const planIds = rows.map((row) => row.planId);
  const { data: featureRows, error: featureError } = await supabase
    .from('planFeatures')
    .select('planId, key, value')
    .in('planId', planIds);

  if (featureError) throw featureError;

  const featureMap = new Map();
  (featureRows || []).forEach((item) => {
    if (!featureMap.has(item.planId)) featureMap.set(item.planId, []);
    featureMap.get(item.planId).push(item);
  });

  return rows.map((row) => buildPlanResponse(row, featureMap.get(row.planId) || []));
};

const clearExistingDefaultIfNeeded = async (isDefault, excludePlanId = null) => {
  if (!isDefault) return;
  let query = supabase
    .from('plans')
    .update({ isDefault: false, updated_at: new Date().toISOString() })
    .eq('isDefault', true);

  if (excludePlanId) query = query.neq('planId', excludePlanId);
  const { error } = await query;
  if (error) throw error;
};

const createUniqueSlug = async (name, preferredSlug = null) => {
  const base = slugify(preferredSlug || name) || `plan-${Date.now()}`;
  let candidate = base;
  for (let index = 0; index < 5; index += 1) {
    const { data, error } = await supabase
      .from('plans')
      .select('planId')
      .eq('slug', candidate)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return candidate;
    candidate = `${base}-${Date.now()}-${index + 1}`;
  }
  return `${base}-${Date.now()}`;
};

export const listAdminPlans = async (_req, res) => {
  try {
    const plans = await fetchPlansWithFeatures();
    return res.json({ plans });
  } catch (error) {
    console.error('listAdminPlans error:', error);
    return res.status(500).json({ error: error.message || 'Failed to load plans' });
  }
};

export const createAdminPlan = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { plan, features, limits } = normalizePlanInput(req.body);
    if (!plan.name) return res.status(400).json({ error: 'Plan name is required.' });

    await clearExistingDefaultIfNeeded(plan.isDefault);

    const slug = await createUniqueSlug(plan.name, req.body?.slug);
    const now = new Date().toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from('plans')
      .insert({
        name: plan.name,
        slug,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        priceAmount: plan.priceAmount,
        currency: plan.currency,
        billingInterval: plan.billingInterval,
        trialDays: plan.trialDays,
        isDefault: plan.isDefault,
        isRecommended: plan.isRecommended,
        isActive: plan.isActive,
        createdBy: userId,
        updated_at: now,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    const featureRows = buildFeatureRows(inserted.planId, features, limits);
    const { error: featureError } = await supabase
      .from('planFeatures')
      .upsert(featureRows, { onConflict: 'planId,key' });

    if (featureError) throw featureError;

    const responsePlan = buildPlanResponse(inserted, featureRows);
    return res.status(201).json({ plan: responsePlan });
  } catch (error) {
    console.error('createAdminPlan error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create plan' });
  }
};

export const updateAdminPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    if (!planId) return res.status(400).json({ error: 'Plan ID is required.' });

    const { data: existing, error: lookupError } = await supabase
      .from('plans')
      .select('*')
      .eq('planId', planId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) return res.status(404).json({ error: 'Plan not found.' });

    const { plan, features, limits } = normalizePlanInput({ ...existing, ...req.body });
    if (!plan.name) return res.status(400).json({ error: 'Plan name is required.' });

    await clearExistingDefaultIfNeeded(plan.isDefault, planId);
    const slug = req.body?.slug ? slugify(req.body.slug) : existing.slug;

    const { data: updated, error: updateError } = await supabase
      .from('plans')
      .update({
        name: plan.name,
        slug: slug || existing.slug,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        priceAmount: plan.priceAmount,
        currency: plan.currency,
        billingInterval: plan.billingInterval,
        trialDays: plan.trialDays,
        isDefault: plan.isDefault,
        isRecommended: plan.isRecommended,
        isActive: plan.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('planId', planId)
      .select('*')
      .single();
    if (updateError) throw updateError;

    const featureRows = buildFeatureRows(planId, features, limits);
    const { error: featureError } = await supabase
      .from('planFeatures')
      .upsert(featureRows, { onConflict: 'planId,key' });
    if (featureError) throw featureError;

    return res.json({ plan: buildPlanResponse(updated, featureRows) });
  } catch (error) {
    console.error('updateAdminPlan error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update plan' });
  }
};

export const updateAdminPlanStatus = async (req, res) => {
  try {
    const { planId } = req.params;
    const { isActive } = req.body || {};

    if (!planId) return res.status(400).json({ error: 'Plan ID is required.' });
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be boolean.' });

    const { data: updated, error } = await supabase
      .from('plans')
      .update({ isActive, updated_at: new Date().toISOString() })
      .eq('planId', planId)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!updated) return res.status(404).json({ error: 'Plan not found.' });

    return res.json({ planId, isActive: updated.isActive });
  } catch (error) {
    console.error('updateAdminPlanStatus error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update plan status' });
  }
};

export const deleteAdminPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    if (!planId) return res.status(400).json({ error: 'Plan ID is required.' });

    const { data: existing, error: lookupError } = await supabase
      .from('plans')
      .select('planId, isDefault')
      .eq('planId', planId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) return res.status(404).json({ error: 'Plan not found.' });
    if (existing.isDefault) return res.status(400).json({ error: 'Default plan cannot be deleted.' });

    const { error: deleteError } = await supabase
      .from('plans')
      .delete()
      .eq('planId', planId);
    if (deleteError) throw deleteError;

    return res.json({ success: true });
  } catch (error) {
    console.error('deleteAdminPlan error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete plan' });
  }
};
