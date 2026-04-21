import React, { useEffect, useState } from 'react';
import { ICONS } from '../../constants';
import { AdminPlan } from '../../types';
import { apiService } from '../../services/apiService';
import { Button, Card, PageLoader } from '../../components/Shared';
import { PricingPlansGrid } from '../../components/PricingPlansGrid';
import { PlanBillingCycle } from '../../utils/pricingPlans';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

export const PricingPage: React.FC = () => {
    const [plans, setPlans] = useState<AdminPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [billingCycle, setBillingCycle] = useState<PlanBillingCycle>('monthly');
    const navigate = useNavigate();
    const { isAuthenticated, openAuthModal } = useUser();

    useEffect(() => {
        let active = true;

        const loadPlans = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await apiService.getPublicPlans();
                if (!active) return;
                setPlans(data);
            } catch (err: any) {
                if (!active) return;
                setError(err?.message || 'Failed to load pricing plans.');
                setPlans([]);
            } finally {
                if (active) setLoading(false);
            }
        };

        void loadPlans();
        return () => {
            active = false;
        };
    }, []);

    if (loading) return <PageLoader label="Standardizing platform plans..." variant="page" />;

    return (
        <div className="bg-[#F2F2F2] min-h-screen">
            {/* Hero Section */}
            <section className="relative w-screen left-[50%] right-[50%] ml-[-50vw] mr-[-50vw] h-[260px] sm:h-[300px] lg:h-[350px] overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(116deg,#38BDF2_0%,#38BDF2_44%,#F2F2F2_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,62,134,0.45)_0%,rgba(0,62,134,0.2)_34%,rgba(0,62,134,0)_72%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_32%,rgba(255,255,255,0.34),transparent_46%),linear-gradient(90deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_26%,rgba(255,255,255,0)_52%)]" />
                
                <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center px-5 sm:px-8">
                    <div className="max-w-[740px]">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 mb-4">Pricing Plans</p>
                        <h1 className="text-[1.8rem] font-black leading-none tracking-tight text-white sm:text-4xl">
                            Simple & Transparent Pricing
                        </h1>
                        <p className="mt-4 max-w-[700px] text-base leading-relaxed text-white/95 sm:text-[1.1rem]">
                            Live plans below are synced from the admin subscription configuration. Choose the best path for your organization's growth.
                        </p>
                    </div>
                </div>
            </section>

            <div className="max-w-6xl mx-auto px-5 sm:px-8 -mt-12 sm:-mt-16 pb-20 relative z-20">
                {error && (
                    <Card className="p-6 mb-8 border-[#2E2E2F]/10">
                        <p className="text-sm font-semibold text-[#2E2E2F]">{error}</p>
                    </Card>
                )}

                {!error && (
                    <PricingPlansGrid
                        plans={plans}
                        billingCycle={billingCycle}
                        onBillingCycleChange={setBillingCycle}
                        showBillingToggle
                        onPlanAction={() => {
                            if (!isAuthenticated) {
                                navigate('/signup');
                            } else {
                                navigate('/subscription');
                            }
                        }}
                    />
                )}

            </div>
        </div>
    );
};
