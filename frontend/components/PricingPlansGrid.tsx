import React from 'react';
import { ICONS } from '../constants';
import { AdminPlan } from '../types';
import { Button, Card } from './Shared';
import { PlanBillingCycle, formatPlanCurrency, getPlanAmount, getPlanValueItems, sortPlansForDisplay } from '../utils/pricingPlans';

type PricingPlansGridProps = {
  plans: AdminPlan[];
  billingCycle: PlanBillingCycle;
  onBillingCycleChange?: (cycle: PlanBillingCycle) => void;
  showBillingToggle?: boolean;
};

export const PricingPlansGrid: React.FC<PricingPlansGridProps> = ({
  plans,
  billingCycle,
  onBillingCycleChange,
  showBillingToggle = true,
}) => {
  const visiblePlans = sortPlansForDisplay(plans);

  return (
    <>
      {showBillingToggle && onBillingCycleChange && (
        <div className="mb-8 flex justify-center">
          <div className="bg-[#F2F2F2] p-1 rounded-2xl border border-[#2E2E2F]/10 flex items-center">
            <button
              type="button"
              onClick={() => onBillingCycleChange('monthly')}
              className={`min-h-[32px] px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors ${billingCycle === 'monthly' ? 'bg-[#38BDF2] text-[#F2F2F2]' : 'bg-[#F2F2F2] text-[#2E2E2F] hover:bg-[#2E2E2F] hover:text-[#F2F2F2]'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => onBillingCycleChange('yearly')}
              className={`min-h-[32px] px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors ${billingCycle === 'yearly' ? 'bg-[#38BDF2] text-[#F2F2F2]' : 'bg-[#F2F2F2] text-[#2E2E2F] hover:bg-[#2E2E2F] hover:text-[#F2F2F2]'}`}
            >
              Yearly
            </button>
          </div>
        </div>
      )}

      {visiblePlans.length === 0 && (
        <Card className="p-6 mb-8 border-[#2E2E2F]/10">
          <p className="text-sm font-semibold text-[#2E2E2F]">No active plans available right now.</p>
        </Card>
      )}

      {visiblePlans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {visiblePlans.map((plan) => {
            const amount = getPlanAmount(plan, billingCycle);
            const items = getPlanValueItems(plan);
            const trialDays = Number(plan.trialDays || 0);

            return (
              <Card
                key={plan.planId}
                className={`flex flex-col p-8 bg-[#F2F2F2] border-2 relative ${plan.isRecommended
                  ? 'border-[#38BDF2] shadow-[0_30px_60px_-15px_rgba(56,189,242,0.3)] scale-[1.05] z-10'
                  : 'border-[#2E2E2F]/5'
                  } transition-all duration-300 hover:translate-y-[-4px]`}
              >
                {plan.isRecommended && (
                  <div className="mb-6 flex justify-center">
                    <span className="bg-[#38BDF2] text-white px-6 py-2 rounded-full font-black tracking-[0.2em] uppercase text-[12px] shadow-[0_10px_25px_-5px_rgba(56,189,242,0.5)] border border-white/20">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-8 mt-2">
                  <h3 className="text-xl font-black text-[#2E2E2F] tracking-tight mb-2">{plan.name}</h3>
                  <p className="text-sm text-[#2E2E2F]/60 leading-relaxed min-h-[40px]">
                    {plan.description || 'Subscription plan configured by the admin team.'}
                  </p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-black text-[#2E2E2F]">
                      {formatPlanCurrency(amount, plan.currency)}
                    </span>
                    <span className="text-sm font-bold text-[#2E2E2F]/40 uppercase tracking-widest">
                      / {billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {trialDays > 0 && (
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#38BDF2]">
                      {trialDays} day trial
                    </p>
                  )}
                </div>

                <Button
                  variant="primary"
                  className="w-full py-4 text-[12px] font-black tracking-[0.15em] mb-8 bg-[#2E2E2F] text-[#F2F2F2] hover:bg-[#38BDF2] hover:text-[#F2F2F2] border-none shadow-lg transition-all duration-300"
                >
                  {plan.isDefault ? 'Get Started' : 'Choose Plan'}
                </Button>

                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]/40 mb-6">
                    Output values:
                  </p>
                  <ul className="space-y-4">
                    {items.map((feature, idx) => (
                      <li key={`${plan.planId}-${idx}`} className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-[#38BDF2]/10 flex items-center justify-center shrink-0">
                          <ICONS.Check className="w-3 h-3 text-[#38BDF2] stroke-[3]" />
                        </div>
                        <span className="text-sm text-[#2E2E2F]/75 leading-tight font-medium">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
};
