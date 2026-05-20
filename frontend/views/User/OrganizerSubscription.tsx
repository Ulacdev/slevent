import React, { useEffect, useState } from 'react';
import { ICONS } from '../../constants';
import { apiService } from '../../services/apiService';
import { useToast } from '../../context/ToastContext';
import { AdminPlan } from '../../types';
import { Button, Card, PageLoader } from '../../components/Shared';
import { PricingPlansGrid } from '../../components/PricingPlansGrid';

type CurrentSubscription = {
  subscription: any;
  plan: AdminPlan;
  billingInterval: string;
  status: string;
  endDate: string;
};

export const OrganizerSubscription: React.FC = () => {
  const { showToast } = useToast();
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subData, plansData] = await Promise.all([
        apiService.getCurrentSubscription(),
        apiService.getSubscriptionPlans()
      ]);

      if (subData.subscription) {
        setCurrentSubscription({
          subscription: subData.subscription,
          plan: subData.subscription.plan,
          billingInterval: subData.subscription.billingInterval,
          status: subData.subscription.status,
          endDate: subData.subscription.endDate
        });
      }

      setAvailablePlans(plansData);
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: AdminPlan) => {
    try {
      setSubscribing(plan.planId);
      const result = await apiService.createSubscription(plan.planId, billingCycle);

      if (result.free) {
        showToast('success', `Successfully subscribed to ${plan.name}!`);
        await loadData();
      } else if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      }
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to create subscription');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!currentSubscription?.subscription?.subscriptionId) return;
    if (!window.confirm('Are you sure you want to cancel your subscription? This will immediately revoke your plan features.')) return;

    try {
      await apiService.cancelSubscription(currentSubscription.subscription.subscriptionId);
      showToast('success', 'Subscription has been cancelled and features have been revoked.');
      setCurrentSubscription(null);
      await loadData();
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to cancel subscription');
    }
  };

  if (loading) {
    return <PageLoader variant="page" label="Loading subscription..." />;
  }

  return (
    <div className="min-h-screen bg-background pb-20 dashboard-main-content space-y-8 px-2 sm:px-4">
      {/* Header */}
      <div className="pt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-4xl lg:text-[2.5rem] font-black text-[#2E2E2F] dark:text-white tracking-tight uppercase">Subscription</h1>
          <p className="mt-2 text-xs sm:text-sm font-bold text-[#2E2E2F]/50 dark:text-white/50 max-w-md">Manage your plan and billing</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-2 sm:px-0 mt-8">
        {/* Current Plan */}
        {currentSubscription && (
          <Card className="mb-8 p-4 sm:p-8 rounded-xl border-2 border-sidebar-border bg-surface shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-[#38BDF8] uppercase tracking-widest mb-2">Current Plan</p>
                <h2 className="text-2xl font-black text-[#2E2E2F] dark:text-white mb-1">{currentSubscription.plan.name}</h2>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentSubscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {currentSubscription.status === 'active' ? 'Active' : currentSubscription.status}
                  </span>
                  <span className="text-xs sm:text-sm text-[#2E2E2F] dark:text-white">
                    {currentSubscription.billingInterval === 'yearly' ? 'Yearly' : 'Monthly'} billing
                  </span>
                </div>
                {currentSubscription.endDate && (
                  <p className="text-xs sm:text-sm text-[#2E2E2F] dark:text-white mt-2">
                    {currentSubscription.subscription.cancelAtPeriodEnd
                      ? `Cancels on ${new Date(currentSubscription.endDate).toLocaleDateString()}`
                      : `Renews on ${new Date(currentSubscription.endDate).toLocaleDateString()}`
                    }
                  </p>
                )}
              </div>
              {!currentSubscription.subscription.cancelAtPeriodEnd && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="w-full sm:w-auto !border-red-300 !text-red-500 hover:!bg-red-50 text-[10px] py-2 px-4 h-10 rounded-xl font-bold uppercase tracking-wider"
                >
                  Cancel Subscription
                </Button>
              )}
            </div>

            {/* Current Plan Features */}
            <div className="mt-8 pt-8 border-t-2 border-sidebar-border">
              <div className="space-y-10">
                {/* Plan Features */}
                <div>
                  <p className="text-xs font-black text-[#2E2E2F] dark:text-white uppercase tracking-[0.2em] mb-4 ml-1">Plan Features</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Custom Branding', enabled: (currentSubscription.plan.features as any)?.enable_custom_branding || (currentSubscription.plan.features as any)?.custom_branding },
                      { label: 'Discount Codes', enabled: (currentSubscription.plan.features as any)?.enable_discount_codes || (currentSubscription.plan.features as any)?.discount_codes },
                      { label: 'Advanced Reports', enabled: (currentSubscription.plan.features as any)?.enable_advanced_reports || (currentSubscription.plan.features as any)?.advanced_reports },
                      { label: 'Priority Support', enabled: (currentSubscription.plan.features as any)?.enable_priority_support || (currentSubscription.plan.features as any)?.priority_support },
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-background border-2 border-sidebar-border group/feat transition-all hover:border-[#38BDF2]/30 hover:shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#2E2E2F] dark:text-white">{feature.label}</span>
                        {feature.enabled ? (
                          <div className="w-6 h-6 rounded-xl bg-[#38BDF2]/10 text-[#38BDF2] flex items-center justify-center">
                            <ICONS.CheckCircle className="w-4 h-4" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-xl bg-[#2E2E2F]/5 dark:bg-white/5 text-[#2E2E2F] dark:text-white/40 flex items-center justify-center">
                            <ICONS.XCircle className="w-4 h-4" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Limits & Promotion */}
                <div>
                  <p className="text-xs font-black text-[#2E2E2F] dark:text-white uppercase tracking-[0.2em] mb-4 ml-1">Plan Limits & Promotion</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[
                      { label: 'Promoted Event Slots', val: (currentSubscription.plan as any)?.promotions?.max_promoted_events || 0, icon: <ICONS.TrendingUp /> },
                      { label: 'Promoted Event Duration', val: ((currentSubscription.plan as any)?.promotions?.promotion_duration_days || 0) + ' days', icon: <ICONS.Calendar /> },
                      { label: 'Staff Accounts', val: currentSubscription.plan.limits?.max_staff_accounts || 0, icon: <ICONS.Users /> },
                      { label: 'Monthly Attendees', val: currentSubscription.plan.limits?.monthly_attendees || currentSubscription.plan.limits?.max_attendees_per_month || 0, icon: <ICONS.Users /> },
                      { label: 'Paid Events Limit', val: currentSubscription.plan.limits?.max_priced_events || 0, icon: <ICONS.Zap /> },
                      { label: 'Max FAQs Per Event', val: currentSubscription.plan.limits?.max_faqs_per_event || 3, icon: <ICONS.Info /> },
                      { label: 'Daily Email Quota', val: (currentSubscription.plan.limits?.email_quota_per_day || 500) + ' /day', icon: <ICONS.Mail /> },
                    ].map((limit, idx) => (
                      <div key={idx} className="p-4 bg-background rounded-xl border-2 border-sidebar-border hover:border-[#38BDF2]/30 transition-all group/limit hover:shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-[#38BDF2] w-4 h-4 opacity-70 group-hover/limit:opacity-100 transition-opacity">
                            {React.cloneElement(limit.icon as React.ReactElement<any>, { className: 'w-full h-full', strokeWidth: 3 })}
                          </div>
                          <span className={`font-black text-[#2E2E2F] dark:text-white tracking-tighter leading-none ${typeof limit.val === 'string' && limit.val.includes(' ') ? 'text-sm' : 'text-[16px]'}`}>{limit.val}</span>
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#38BDF2]/50">{limit.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* No Subscription */}
        {!currentSubscription && (
          <Card className="mb-8 p-5 sm:p-8 rounded-xl border-2 border-sidebar-border bg-gradient-to-r from-[#38BDF8]/10 to-transparent shadow-sm">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#38BDF8]/20 flex items-center justify-center shrink-0">
                <ICONS.CreditCard className="w-7 h-7 sm:w-8 sm:h-8 text-[#38BDF8]" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[#2E2E2F] dark:text-white">No Active Subscription</h2>
                <p className="text-xs sm:text-sm text-[#2E2E2F]/70 dark:text-white/70 mt-1">Subscribe to a plan to unlock full features</p>
              </div>
            </div>
          </Card>
        )}

        {/* Available Plans */}
        <div className="mt-12">
          <PricingPlansGrid
            plans={availablePlans}
            billingCycle={billingCycle}
            onBillingCycleChange={(cycle) => setBillingCycle(cycle)}
            onPlanAction={handleSubscribe}
            actionLoadingPlanId={subscribing}
            currentPlanId={currentSubscription?.plan?.planId}
            showBillingToggle
          />
        </div>

      </div>
    </div>
  );
};

