import React from 'react';
import { ICONS } from '../constants';
import { AdminPlan } from '../types';
import { Button, Card } from './Shared';
import { PlanBillingCycle, formatPlanCurrency, getPlanAmount, sortPlansForDisplay, formatLimitValue } from '../utils/pricingPlans';

type PricingPlansGridProps = {
  plans: AdminPlan[];
  billingCycle: PlanBillingCycle;
  onBillingCycleChange?: (cycle: PlanBillingCycle) => void;
  showBillingToggle?: boolean;
  onPlanAction?: (plan: AdminPlan) => void;
  actionLoadingPlanId?: string | null;
  currentPlanId?: string | null;
};

export const PricingPlansGrid: React.FC<PricingPlansGridProps> = ({
  plans,
  billingCycle,
  onBillingCycleChange,
  showBillingToggle = true,
  onPlanAction,
  actionLoadingPlanId = null,
  currentPlanId = null,
}) => {
  const visiblePlans = sortPlansForDisplay(plans);

  return (
    <>
      {showBillingToggle && onBillingCycleChange && (
        <div className="mb-12 flex justify-center">
          <div className="bg-[#F2F2F2] p-1.5 rounded-2xl border border-[#2E2E2F]/10 flex items-center shadow-sm">
            <button
              type="button"
              onClick={() => onBillingCycleChange('monthly')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingCycle === 'monthly'
                ? 'bg-[#38BDF2] text-white shadow-lg shadow-[#38BDF2]/25'
                : 'text-[#2E2E2F]/60 hover:text-[#2E2E2F] hover:bg-[#EAEAEA]'
                }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => onBillingCycleChange('yearly')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${billingCycle === 'yearly'
                ? 'bg-[#38BDF2] text-white shadow-lg shadow-[#38BDF2]/25'
                : 'text-[#2E2E2F]/60 hover:text-[#2E2E2F] hover:bg-[#EAEAEA]'
                }`}
            >
              Yearly
              <span className={`text-[8px] px-2 py-0.5 rounded-full ${billingCycle === 'yearly' ? 'bg-white/20 text-white' : 'bg-[#38BDF2]/10 text-[#38BDF2]'}`}>Save 20%</span>
            </button>
          </div>
        </div>
      )}

      {visiblePlans.length === 0 && (
        <Card className="p-10 text-center border-[#2E2E2F]/10 bg-[#F2F2F2]">
          <p className="text-sm font-bold text-[#2E2E2F]/40 uppercase tracking-widest">No active plans available right now.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-10">
        {visiblePlans.map((plan) => {
          const amount = getPlanAmount(plan, billingCycle);
          const isCurrentPlan = currentPlanId === plan.planId;
          const isProcessing = actionLoadingPlanId === plan.planId;

          const features = [
            { label: 'Custom Branding', enabled: (plan.features as any)?.enable_custom_branding || (plan.features as any)?.custom_branding },
            { label: 'Discount Codes', enabled: (plan.features as any)?.discount_codes || (plan.features as any)?.enable_discount_codes },
            { label: 'Advanced Reports', enabled: (plan.features as any)?.advanced_reports || (plan.features as any)?.enable_advanced_reports },
            { label: 'Priority Support', enabled: (plan.features as any)?.priority_support || (plan.features as any)?.enable_priority_support },
          ];

          const limits = [
            { label: 'Promoted Event Slots', val: (plan as any)?.promotions?.max_promoted_events || 0, icon: <ICONS.TrendingUp /> },
            { label: 'Promoted Event Duration', val: ((plan as any)?.promotions?.promotion_duration_days || 0) + ' days', icon: <ICONS.Calendar /> },
            { label: 'Staff Accounts', val: plan.limits?.max_staff_accounts || 0, icon: <ICONS.Users /> },
            { label: 'Monthly Attendees', val: plan.limits?.monthly_attendees || plan.limits?.max_attendees_per_month || 0, icon: <ICONS.Users /> },
            { label: 'Paid Events Limit', val: plan.limits?.max_priced_events || 0, icon: <ICONS.Zap /> },
            { label: 'Daily Email Quota', val: (plan.limits?.email_quota_per_day || 0) + ' emails/day', icon: <ICONS.Mail /> },
          ];

          return (
            <div key={plan.planId} className="relative group h-full pt-4 mt-[-1rem]">
              {!isCurrentPlan && plan.isRecommended && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 animate-in slide-in-from-top-4 duration-700">
                  <span className="bg-[#38BDF2] text-white px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-[#38BDF2]/30 border border-white/20 flex items-center gap-2 whitespace-nowrap">
                    <ICONS.CheckCircle className="w-3.5 h-3.5" />
                    Recommended
                  </span>
                </div>
              )}
              <Card className={`h-full flex flex-col border-[#2E2E2F]/10 rounded-[2rem] bg-[#F2F2F2] transition-all duration-500 hover:shadow-2xl hover:shadow-[#2E2E2F]/10 ${!isCurrentPlan && plan.isRecommended ? 'ring-2 ring-[#38BDF2] ring-offset-4 ring-offset-[#F2F2F2]' : ''}`}>
                <div className="p-8 flex-1 flex flex-col">
                  {/* Top: Name and Description */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-3xl font-black text-[#2E2E2F] tracking-tighter uppercase">{plan.name}</h3>
                      {isCurrentPlan && (
                        <span className="bg-[#38BDF2] text-white text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm">ACTIVE</span>
                      )}
                    </div>
                    <p className="text-sm text-[#2E2E2F]/60 font-medium leading-tight">
                      {plan.description || "The ideal solution for organizers looking to scale their event portfolio."}
                    </p>
                  </div>

                  {/* Price Section */}
                  <div className="mb-8 p-6 bg-[#F2F2F2]/30 rounded-3xl border border-[#2E2E2F]/5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-[#2E2E2F] tracking-tighter">
                        ₱{Number(amount || 0).toLocaleString()}
                      </span>
                      <span className="text-[11px] font-black text-[#2E2E2F]/40 uppercase tracking-widest">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && Number(amount) > 0 && (
                      <p className="text-[10px] font-bold text-[#2E2E2F]/40 mt-1 uppercase tracking-widest">
                        Billed annually (₱{Number(plan.yearlyPrice).toLocaleString()} per year)
                      </p>
                    )}
                    {plan.trialDays > 0 && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-[#38BDF2]/10 rounded-full">
                        <ICONS.Zap className="w-3 h-3 text-[#38BDF2]" />
                        <span className="text-[9px] font-black text-[#38BDF2] uppercase tracking-widest">{plan.trialDays} Day Free Trial</span>
                      </div>
                    )}
                  </div>

                  {/* Consolidated Features & Limits - Dynamic Grid for compactness */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-10 text-[#2E2E2F]">
                    {[
                      { label: `${formatLimitValue(plan.limits?.max_priced_events || 0)} Max Paid Events`, enabled: true },
                      { label: `${formatLimitValue(plan.limits?.max_attendees_per_month || plan.limits?.monthly_attendees || 0)} Monthly Attendees`, enabled: true },
                      { label: `${formatLimitValue(plan.limits?.max_staff_accounts || 0)} Max Staff Accounts`, enabled: true },
                      { label: `${formatLimitValue((plan as any)?.promotions?.max_promoted_events || 0)} Max Promoted Event Slots`, enabled: true },
                      { label: `${formatLimitValue((plan as any)?.promotions?.promotion_duration_days || 0)} Promoted Event Duration (Days)`, enabled: true },
                      { label: `${formatLimitValue(plan.limits?.email_quota_per_day || 0)} Daily Email Quota`, enabled: true },
                      { label: 'Custom Branding', enabled: (plan.features as any)?.enable_custom_branding || (plan.features as any)?.custom_branding },
                      { label: 'Discount Codes', enabled: (plan.features as any)?.discount_codes || (plan.features as any)?.enable_discount_codes },
                      { label: 'Advanced Reports', enabled: (plan.features as any)?.enable_advanced_reports || (plan.features as any)?.advanced_reports },
                      { label: 'Priority Support', enabled: (plan.features as any)?.enable_priority_support || (plan.features as any)?.priority_support },
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 group/feat">
                        <div className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${feature.enabled ? 'bg-[#38BDF2]/20 text-[#38BDF2]' : 'bg-[#2E2E2F]/5 text-[#2E2E2F]/20'}`}>
                          {feature.enabled ? <ICONS.Check className="w-2.5 h-2.5" strokeWidth={5} /> : <ICONS.XCircle className="w-2.5 h-2.5 opacity-20" />}
                        </div>
                        <span className={`text-[11px] font-bold tracking-tight leading-tight transition-colors ${feature.enabled ? 'text-[#2E2E2F]' : 'text-[#2E2E2F]/30'}`}>
                          {feature.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer Action */}
                  <div className="mt-auto">
                    <Button
                      onClick={() => onPlanAction?.(plan)}
                      disabled={isCurrentPlan || (actionLoadingPlanId !== null && actionLoadingPlanId !== plan.planId)}
                      className={`w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 shadow-lg ${isCurrentPlan
                        ? '!bg-[#F2F2F2] !text-[#2E2E2F]/40 border border-[#2E2E2F]/5 shadow-none'
                        : 'bg-[#38BDF2] text-white hover:bg-[#2E2E2F] shadow-[#38BDF2]/20 hover:shadow-none'
                        }`}
                    >
                      {isProcessing
                        ? 'Processing...'
                        : isCurrentPlan
                          ? 'Current Plan'
                          : plan.monthlyPrice === 0 || (billingCycle === 'yearly' && plan.yearlyPrice === 0)
                            ? 'Get Started Free'
                            : `Go ${plan.name}`
                      }
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </>
  );
};
