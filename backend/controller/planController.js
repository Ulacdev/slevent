import supabase from '../database/db.js';

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

const coerceLimitValue = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  if (/^unlimited$/i.test(raw)) return 'Unlimited';
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
};

const mapPlan = (row, featureRows = []) => {
  const features = {
    aiIntegration: false,
    branding: false,
    weddingSuppliers: false,
  };
  const limits = {
    users: 0,
    projects: 0,
    contacts: 0,
    accounts: 0,
    storage: 'N/A',
  };

  featureRows.forEach((item) => {
    if (!item) return;
    if (item.key === FEATURE_KEYS.aiIntegration) features.aiIntegration = toBoolean(item.value, false);
    if (item.key === FEATURE_KEYS.branding) features.branding = toBoolean(item.value, false);
    if (item.key === FEATURE_KEYS.weddingSuppliers) features.weddingSuppliers = toBoolean(item.value, false);
    if (item.key === LIMIT_KEYS.users) limits.users = coerceLimitValue(item.value);
    if (item.key === LIMIT_KEYS.projects) limits.projects = coerceLimitValue(item.value);
    if (item.key === LIMIT_KEYS.contacts) limits.contacts = coerceLimitValue(item.value);
    if (item.key === LIMIT_KEYS.accounts) limits.accounts = coerceLimitValue(item.value);
    if (item.key === LIMIT_KEYS.storage) limits.storage = String(item.value || 'N/A');
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
  };
};

export const listPublicPlans = async (_req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('isActive', true)
      .order('monthlyPrice', { ascending: true });

    if (error) throw error;
    if (!plans || plans.length === 0) return res.json({ plans: [] });

    const planIds = plans.map((item) => item.planId);
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

    const mapped = plans.map((item) => mapPlan(item, featureMap.get(item.planId) || []));
    return res.json({ plans: mapped });
  } catch (error) {
    console.error('listPublicPlans error:', error);
    return res.status(500).json({ error: error.message || 'Failed to load plans' });
  }
};
