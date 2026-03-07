import { AdminPlan } from '../types';

export type PlanBillingCycle = 'monthly' | 'yearly';

const isUnlimited = (value: number | string) => /^unlimited$/i.test(String(value ?? '').trim());

export const formatLimitValue = (value: number | string): string => {
  if (isUnlimited(value)) return 'Unlimited';

  if (typeof value === 'number') return value.toLocaleString();

  const raw = String(value ?? '').trim();
  if (!raw) return '0';
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw).toLocaleString();
  return raw;
};

export const formatPlanCurrency = (amount: number, currencyCode: string): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'PHP',
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `PHP ${amount.toLocaleString()}`;
  }
};

export const getPlanAmount = (plan: AdminPlan, billingCycle: PlanBillingCycle): number => {
  if (billingCycle === 'yearly') return Number(plan.yearlyPrice || 0);
  return Number(plan.monthlyPrice || 0);
};

export const getPlanValueItems = (plan: AdminPlan): string[] => [
  `Users: ${formatLimitValue(plan.limits?.users ?? 0)}`,
  `Projects: ${formatLimitValue(plan.limits?.projects ?? 0)}`,
  `Contacts: ${formatLimitValue(plan.limits?.contacts ?? 0)}`,
  `Accounts: ${formatLimitValue(plan.limits?.accounts ?? 0)}`,
  `Storage: ${String(plan.limits?.storage || 'N/A')}`,
  `AI Integration: ${plan.features?.aiIntegration ? 'Included' : 'Not included'}`,
  `Branding: ${plan.features?.branding ? 'Included' : 'Not included'}`,
  `Wedding Suppliers: ${plan.features?.weddingSuppliers ? 'Included' : 'Not included'}`,
];

export const sortPlansForDisplay = (plans: AdminPlan[]): AdminPlan[] => {
  return [...plans].sort((a, b) => {
    if (!!a.isDefault !== !!b.isDefault) return a.isDefault ? -1 : 1;
    return Number(a.monthlyPrice || 0) - Number(b.monthlyPrice || 0);
  });
};
