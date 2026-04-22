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
  onDelete?: (plan: AdminPlan) => void;
  onToggleActive?: (plan: AdminPlan) => void;
  isAdmin?: boolean;
  actionLoadingPlanId?: string | null;
  currentPlanId?: string | null;
};

export const PricingPlansGrid: React.FC<PricingPlansGridProps> = ({
  plans,
  billingCycle,
  onBillingCycleChange,
  showBillingToggle = true,
  onPlanAction,
  onDelete,
  onToggleActive,
  isAdmin = false,
  actionLoadingPlanId = null,
  currentPlanId = null,
}) => {
  const visiblePlans = sortPlansForDisplay(plans);

  return (
    <>
      {showBillingToggle && onBillingCycleChange && (
        <div className="mb-12 flex justify-center">
          <div className="bg-[#F2F2F2] p-1.5 rounded-xl border border-[#2E2E2F]/10 flex items-center shadow-sm">
            <button
              type="button"
              onClick={() => onBillingCycleChange('monthly')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingCycle === 'monthly'
                ? 'bg-[#38BDF2] text-white shadow-lg shadow-[#38BDF2]/25'
                : 'text-[#2E2E2F] hover:text-[#2E2E2F] hover:bg-[#EAEAEA]'
                }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => onBillingCycleChange('yearly')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${billingCycle === 'yearly'
                ? 'bg-[#38BDF2] text-white shadow-lg shadow-[#38BDF2]/25'
                : 'text-[#2E2E2F] hover:text-[#2E2E2F] hover:bg-[#EAEAEA]'
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
          <p className="text-sm font-bold text-[#2E2E2F] uppercase tracking-widest">No active plans available right now.</p>
        </Card>
      )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {visiblePlans.map((plan) => {
          const amount = getPlanAmount(plan, billingCycle);
          const isCurrentPlan = currentPlanId === plan.planId;
          const isProcessing = actionLoadingPlanId === plan.planId;

          const allFeatures = [
            { 
              label: 'Custom Branding', 
              enabled: !!(plan.features?.enable_custom_branding || (plan.features as any)?.custom_branding), 
              icon: <ICONS.Layout className="w-4 h-4" /> 
            },
            { 
              label: 'Discount Codes', 
              enabled: !!(plan.features?.enable_discount_codes || (plan.features as any)?.discount_codes), 
              icon: <ICONS.Zap className="w-4 h-4" /> 
            },
            { 
              label: 'Advanced Reports', 
              enabled: !!(plan.features?.enable_advanced_reports || (plan.features as any)?.advanced_reports), 
              icon: <ICONS.Compass className="w-4 h-4" /> 
            },
            { 
              label: 'Priority Support', 
              enabled: !!(plan.features?.enable_priority_support || (plan.features as any)?.priority_support), 
              icon: <ICONS.Shield className="w-4 h-4" /> 
            },
            { 
              label: `${formatLimitValue(plan.limits?.max_staff_accounts || 0)} Staff Accounts`, 
              enabled: Number(plan.limits?.max_staff_accounts || 0) > 0, 
              icon: <ICONS.Users className="w-4 h-4" /> 
            },
            { 
              label: `${formatLimitValue(plan.limits?.max_attendees_per_month || plan.limits?.monthly_attendees || 0)} Monthly Attendees`, 
              enabled: Number(plan.limits?.max_attendees_per_month || plan.limits?.monthly_attendees || 0) > 0, 
              icon: <ICONS.TrendingUp className="w-4 h-4" /> 
            },
            { 
              label: `${formatLimitValue(plan.limits?.max_priced_events || 0)} Paid Events Support`, 
              enabled: Number(plan.limits?.max_priced_events || 0) > 0, 
              icon: <ICONS.Ticket className="w-4 h-4" /> 
            },
            { 
              label: `${formatLimitValue((plan as any)?.promotions?.max_promoted_events || 0)} Promoted Event Slots`, 
              enabled: Number((plan as any)?.promotions?.max_promoted_events || 0) > 0, 
              icon: <ICONS.Sparkles className="w-4 h-4" /> 
            },
            { 
              label: `${(plan as any)?.promotions?.promotion_duration_days || 7} Days Promotion Duration`, 
              enabled: Number((plan as any)?.promotions?.max_promoted_events || 0) > 0, 
              icon: <ICONS.Calendar className="w-4 h-4" /> 
            },
            { 
              label: `${formatLimitValue(plan.limits?.email_quota_per_day || 0)} Daily Email Quota`, 
              enabled: Number(plan.limits?.email_quota_per_day || 0) > 0, 
              icon: <ICONS.Mail className="w-4 h-4" /> 
            },
          ];

          return (
            <div key={plan.planId} className="relative group h-full transition-all duration-500 hover:scale-[1.01]">
              {!isCurrentPlan && plan.isRecommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                  <span className="bg-[#38BDF2] text-[#F2F2F2] px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl border border-white/20 flex items-center gap-1.5 whitespace-nowrap">
                    <ICONS.CheckCircle className="w-3.5 h-3.5" />
                    Recommended
                  </span>
                </div>
              )}
              <Card className={`h-full flex flex-col border border-[#2E2E2F]/10 rounded-2xl bg-[#F2F2F2] text-[#2E2E2F] transition-all duration-500 group-hover:shadow-xl group-hover:shadow-[#2E2E2F]/5 ${!isCurrentPlan && plan.isRecommended ? 'ring-2 ring-[#38BDF2] ring-offset-0' : ''}`}>
                <div className="p-8 flex-1 flex flex-col items-start text-left">
                  {/* Top: Name and Description */}
                  <div className="mb-4 w-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-2xl font-black tracking-tight text-[#2E2E2F]">{plan.name}</h3>
                      {isCurrentPlan && (
                        <span className="bg-[#38BDF2]/10 text-[#38BDF2] text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-[#38BDF2]/20 shadow-sm">ACTIVE</span>
                      )}
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="mb-4 w-full">
                    <div className="flex items-start gap-0.5">
                      <span className="text-sm font-black mt-1 text-[#2E2E2F] leading-none">₱</span>
                      <span className="text-5xl font-black tracking-tighter text-[#2E2E2F] leading-none">
                        {Number(amount || 0).toLocaleString()}
                      </span>
                      <div className="flex flex-col ml-2 mt-2">
                        <span className="text-[12px] font-black uppercase tracking-widest text-[#2E2E2F] leading-tight">
                          PHP /
                        </span>
                        <span className="text-[12px] font-black uppercase tracking-widest text-[#2E2E2F] leading-tight">
                          {billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      </div>
                    </div>
                    {billingCycle === 'yearly' && Number(amount) > 0 && (
                      <p className="text-[12px] font-bold mt-1.5 uppercase tracking-widest text-[#2E2E2F] italic">
                        Billed annually (₱{Number(plan.yearlyPrice).toLocaleString()} per year)
                      </p>
                    )}
                  </div>

                  <p className="text-[14px] font-medium text-[#2E2E2F] mb-8 leading-snug">
                    {plan.description || "The ideal solution for organizers looking to scale."}
                  </p>

                  {/* Footer Action */}
                  <div className="w-full mb-8">
                    <Button
                      onClick={() => onPlanAction?.(plan)}
                      disabled={isCurrentPlan || (actionLoadingPlanId !== null && actionLoadingPlanId !== plan.planId)}
                      className={`w-full py-2.5 rounded-xl font-black text-[14px] uppercase tracking-[0.2em] transition-all duration-300 ${isCurrentPlan
                        ? '!bg-black/5 !text-[#2E2E2F] border border-black/5 shadow-none hover:scale-100 active:scale-100'
                        : 'bg-[#38BDF2] text-white hover:bg-[#2E2E2F] shadow-lg shadow-[#38BDF2]/10 hover:shadow-[#2E2E2F]/10'
                        }`}
                    >
                      {isProcessing
                        ? 'Processing...'
                        : isCurrentPlan
                          ? 'Current Plan'
                          : isAdmin
                            ? 'Configure Plan'
                            : plan.monthlyPrice === 0 || (billingCycle === 'yearly' && plan.yearlyPrice === 0)
                              ? 'Get Started'
                              : `Upgrade`
                      }
                    </Button>
                  </div>

                  {/* Consolidated Features & Limits */}
                  <div className="flex flex-col gap-y-3.5 text-sm w-full">
                    {allFeatures.map((feature, idx) => (
                      <div key={idx} className={`flex items-start gap-3 transition-all duration-300 ${feature.enabled ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`shrink-0 w-3.5 h-3.5 flex items-center justify-center ${feature.enabled ? 'text-[#2E2E2F]' : 'text-[#2E2E2F]'}`}>
                          {feature.icon}
                        </div>
                        <span className={`text-[14px] font-medium tracking-tight leading-tight pt-0.5 ${feature.enabled ? 'text-[#2E2E2F]' : 'text-[#2E2E2F]'}`}>
                          {feature.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Specific Footer: Toggle & Delete */}
                {isAdmin && (
                  <div className="px-6 py-4 bg-black/5 border-t border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleActive?.(plan)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none ${plan.isActive ? 'bg-[#38BDF2]' : 'bg-[#2E2E2F]/20'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${plan.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${plan.isActive ? 'text-[#38BDF2]' : 'text-[#2E2E2F]'}`}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {!plan.isDefault && (
                      <button
                        onClick={() => onDelete?.(plan)}
                        className="p-1.5 text-[#2E2E2F] hover:text-red-500 transition-colors"
                        title="Delete Plan"
                      >
                        <ICONS.Trash className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </>
  );
};

