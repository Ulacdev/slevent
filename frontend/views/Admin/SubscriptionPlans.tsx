import React, { useState } from 'react';
import { ICONS } from '../../constants';
import { Button, Card, Modal, Input } from '../../components/Shared';

interface Plan {
    id: number;
    name: string;
    monthlyPrice: number;
    yearlyPrice?: number;
    description: string;
    isDefault: boolean;
    isActive: boolean;
    isRecommended?: boolean;
    trialDays?: number;
    features: {
        aiIntegration: boolean;
        branding: boolean;
        weddingSuppliers: boolean;
    };
    limits: {
        users: number | string;
        projects: number | string;
        contacts: number | string;
        accounts: number | string;
        storage: string;
    };
}

const initialPlans: Plan[] = [
    {
        id: 1,
        name: 'Free',
        monthlyPrice: 0,
        yearlyPrice: 0,
        description: 'For solo operators and early-stage founders who want clear, simple relationship tracking without the clutter.',
        isDefault: true,
        isActive: true,
        features: {
            aiIntegration: false,
            branding: false,
            weddingSuppliers: false
        },
        limits: {
            users: 1,
            projects: 1,
            contacts: 50,
            accounts: 25,
            storage: '1GB'
        }
    },
    {
        id: 2,
        name: 'Starter',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        description: 'For small teams who need shared visibility on relationships, follow-ups, and active opportunities.',
        isDefault: false,
        isActive: true,
        trialDays: 30,
        features: {
            aiIntegration: false,
            branding: false,
            weddingSuppliers: true
        },
        limits: {
            users: 3,
            projects: 3,
            contacts: 500,
            accounts: 200,
            storage: '2 GB'
        }
    },
    {
        id: 3,
        name: 'Growth',
        monthlyPrice: 1999,
        yearlyPrice: 19990,
        description: 'For growing teams that need predictable pipelines, coordinated execution, and better prioritization across accounts.',
        isDefault: false,
        isActive: true,
        trialDays: 30,
        features: {
            aiIntegration: false,
            branding: false,
            weddingSuppliers: true
        },
        limits: {
            users: 10,
            projects: 10,
            contacts: 2000,
            accounts: 1000,
            storage: '5 GB'
        }
    },
    {
        id: 4,
        name: 'Business+',
        monthlyPrice: 6999,
        yearlyPrice: 69990,
        description: 'For scaling organizations that want relationship-driven growth at scale, with deeper intelligence and structured operations.',
        isDefault: false,
        isActive: true,
        isRecommended: true,
        trialDays: 30,
        features: {
            aiIntegration: true,
            branding: true,
            weddingSuppliers: true
        },
        limits: {
            users: 'Unlimited',
            projects: 'Unlimited',
            contacts: 'Unlimited',
            accounts: 'Unlimited',
            storage: '100 GB'
        }
    }
];

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) => (
    <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none ${enabled ? 'bg-[#38BDF2]' : 'bg-[#2E2E2F]/20'
            }`}
    >
        <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
        />
    </button>
);

export const SubscriptionPlans: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>(initialPlans);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

    const handleToggleActive = (id: number) => {
        setPlans(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
    };

    const openEditModal = (plan: Plan) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingPlan(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Control Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <label className="block text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em] mb-3 ml-1">Plan Management Architecture</label>
                    <div className="bg-[#F2F2F2] p-1 rounded-2xl border border-[#2E2E2F]/10 flex items-center self-start">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`min-h-[32px] px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors ${billingCycle === 'monthly' ? 'bg-[#38BDF2] text-[#F2F2F2]' : 'bg-[#F2F2F2] text-[#2E2E2F] hover:bg-[#2E2E2F] hover:text-[#F2F2F2]'}`}
                        >
                            Monthly Cycle
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`min-h-[32px] px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-[#38BDF2] text-[#F2F2F2]' : 'bg-[#F2F2F2] text-[#2E2E2F] hover:bg-[#2E2E2F] hover:text-[#F2F2F2]'}`}
                        >
                            Yearly Cycle
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${billingCycle === 'yearly' ? 'bg-[#F2F2F2] text-[#38BDF2]' : 'bg-[#38BDF2] text-white'}`}>SAVE 20%</span>
                        </button>
                    </div>
                </div>
                <Button onClick={openAddModal} className="rounded-xl px-8 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-[#38BDF2]/20 active:scale-95 transition-transform">
                    <span className="flex items-center gap-2">
                        <ICONS.Plus className="w-3.5 h-3.5" strokeWidth={3} />
                        Architect New Plan
                    </span>
                </Button>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-10">
                {plans.map((plan) => (
                    <div key={plan.id} className="relative group h-full">
                        {plan.isRecommended && (
                            <div className="absolute -top-4 left-10 z-10 animate-in slide-in-from-top-4 duration-700">
                                <span className="bg-[#38BDF2] text-[#F2F2F2] px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-[#38BDF2]/30 border border-white/20 flex items-center gap-2">
                                    <ICONS.CheckCircle className="w-3.5 h-3.5" />
                                    Optimized Node
                                </span>
                            </div>
                        )}

                        <Card className={`h-full flex flex-col border-[#2E2E2F]/10 rounded-[2.5rem] bg-[#F2F2F2] transition-all duration-500 hover:shadow-2xl hover:shadow-[#2E2E2F]/10 ${plan.isRecommended ? 'ring-2 ring-[#38BDF2] ring-offset-4 ring-offset-[#F2F2F2]' : ''}`}>
                            <div className="p-10 flex-1 flex flex-col">
                                <div className="flex items-start justify-between mb-8">
                                    <div>
                                        <h3 className="text-2xl font-black text-[#2E2E2F] tracking-tighter mb-2 uppercase leading-none">{plan.name}</h3>
                                        <div className="flex gap-2">
                                            {plan.isDefault && <div className="bg-[#38BDF2] text-[#F2F2F2] text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">primary</div>}
                                            <div className={`text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 ${plan.isActive ? 'bg-[#38BDF2] text-white' : 'bg-[#2E2E2F]/10 text-[#2E2E2F]/40'}`}>
                                                <div className={`w-1 h-1 rounded-full ${plan.isActive ? 'bg-white' : 'bg-[#2E2E2F]/40'}`} />
                                                {plan.isActive ? 'Live' : 'offline'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-[#38BDF2]/10 text-[#38BDF2] flex items-center justify-center shadow-inner">
                                        <ICONS.CreditCard className="w-6 h-6" strokeWidth={2.5} />
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-[#2E2E2F] tracking-tighter">
                                            ₱{billingCycle === 'monthly' ? plan.monthlyPrice.toLocaleString() : (plan.yearlyPrice || 0).toLocaleString()}
                                        </span>
                                        <span className="text-[10px] font-black text-[#2E2E2F]/30 uppercase tracking-[0.2em]">
                                            / {billingCycle === 'monthly' ? 'monthly' : 'yearly'} hub
                                        </span>
                                    </div>
                                    {plan.trialDays && billingCycle === 'yearly' && (
                                        <div className="flex items-center gap-2 mt-3">
                                            <div className="bg-[#38BDF2]/10 text-[#38BDF2] text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                                                <ICONS.Calendar className="w-3 h-3" />
                                                {plan.trialDays} Day Exploration Period
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <p className="text-[13px] text-[#2E2E2F]/60 font-bold leading-relaxed mb-10 min-h-[3rem] text-balance tracking-tight">
                                    {plan.description}
                                </p>

                                <div className="space-y-10 mt-auto">
                                    {/* Features */}
                                    <div>
                                        <label className="block text-[9px] font-black text-[#2E2E2F]/30 uppercase tracking-[0.2em] mb-4 ml-1">System Modules</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {[
                                                { label: 'AI Intelligence Node', enabled: plan.features.aiIntegration },
                                                { label: 'White-Label Branding', enabled: plan.features.branding },
                                                { label: 'Supplier Marketplace', enabled: plan.features.weddingSuppliers }
                                            ].map((feature, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-[#F2F2F2]/50 border border-[#2E2E2F]/5 group/feat transition-all hover:border-[#38BDF2]/30 hover:shadow-sm">
                                                    <span className={`text-[11px] font-black uppercase tracking-widest ${feature.enabled ? 'text-[#2E2E2F]' : 'text-[#2E2E2F]/30'}`}>{feature.label}</span>
                                                    {feature.enabled ? (
                                                        <div className="w-6 h-6 rounded-lg bg-[#38BDF2]/10 text-[#38BDF2] flex items-center justify-center">
                                                            <ICONS.CheckCircle className="w-4 h-4" strokeWidth={3} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-lg bg-[#2E2E2F]/5 text-[#2E2E2F]/20 flex items-center justify-center">
                                                            <ICONS.XCircle className="w-4 h-4" strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Resource Quotas */}
                                    <div>
                                        <label className="block text-[9px] font-black text-[#2E2E2F]/30 uppercase tracking-[0.2em] mb-4 ml-1">Allocated Quotas</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { label: 'Concurrent Users', val: plan.limits.users, icon: <ICONS.Users />, color: 'sky' },
                                                { label: 'Active Projects', val: plan.limits.projects, icon: <ICONS.Box />, color: 'indigo' },
                                                { label: 'Contact Matrix', val: plan.limits.contacts, icon: <ICONS.Users />, color: 'rose' },
                                                { label: 'Linked Accounts', val: plan.limits.accounts, icon: <ICONS.Globe />, color: 'cyan' }
                                            ].map((limit, idx) => (
                                                <div key={idx} className="p-4 bg-[#F2F2F2]/50 rounded-2xl border border-[#2E2E2F]/5 hover:border-[#38BDF2]/30 transition-all group/limit hover:shadow-sm">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`text-${limit.color}-500 w-4 h-4 opacity-70 group-hover/limit:opacity-100 transition-opacity`}>
                                                            {React.cloneElement(limit.icon as React.ReactElement<any>, { className: 'w-full h-full', strokeWidth: 3 })}
                                                        </div>
                                                        <span className="text-[16px] font-black text-[#2E2E2F] tracking-tighter leading-none">{limit.val}</span>
                                                    </div>
                                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] text-[#38BDF2]/50`}>{limit.label}</p>
                                                </div>
                                            ))}
                                            <div className="p-4 bg-[#F2F2F2]/50 rounded-2xl border border-[#2E2E2F]/5 hover:border-[#38BDF2]/30 transition-all group/limit col-span-2 flex items-center justify-between hover:shadow-sm">
                                                <div>
                                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-600/50 mb-1">Persistent Storage</p>
                                                    <span className="text-[16px] font-black text-[#2E2E2F] tracking-tighter leading-none">{plan.limits.storage}</span>
                                                </div>
                                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                                    <ICONS.HardDrive className="w-5 h-5" strokeWidth={3} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Node Controls */}
                            <div className="px-10 py-8 bg-[#F2F2F2]/50 border-t border-[#2E2E2F]/5 flex items-center justify-between rounded-b-[2.5rem]">
                                <div className="flex items-center gap-4">
                                    <Toggle enabled={plan.isActive} onChange={() => handleToggleActive(plan.id)} />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]">Node Status</span>
                                        <span className={`text-[8px] font-bold uppercase tracking-widest ${plan.isActive ? 'text-[#38BDF2]' : 'text-[#2E2E2F]/40'}`}>{plan.isActive ? 'operational' : 'suspended'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(plan)}
                                        className="w-12 h-12 rounded-2xl bg-[#F2F2F2] border border-[#2E2E2F]/10 text-[#2E2E2F]/40 hover:text-[#38BDF2] hover:border-[#38BDF2] transition-all flex items-center justify-center shadow-sm active:scale-90"
                                    >
                                        <ICONS.Edit className="w-5 h-5" strokeWidth={2.5} />
                                    </button>
                                    {plan.id > 1 && (
                                        <button
                                            type="button"
                                            className="w-12 h-12 rounded-2xl bg-[#F2F2F2] border border-[#2E2E2F]/10 text-[#2E2E2F]/40 hover:text-red-500 hover:border-red-500 transition-all flex items-center justify-center shadow-sm active:scale-90"
                                        >
                                            <ICONS.Trash className="w-5 h-5" strokeWidth={2.5} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>

            {/* Architecture Configuration Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPlan ? 'Refine Plan Architecture' : 'Initialize New Plan'}
                subtitle={editingPlan ? `Synchronizing parameters for ${editingPlan.name}` : 'Provisioning a new system-wide subscription node'}
                size="xl"
            >
                <div className="space-y-12 py-4">
                    {/* Primary Parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-[#2E2E2F]/40 uppercase tracking-[0.2em] mb-3 ml-1">Identity & Pricing</label>
                                <div className="space-y-6">
                                    <Input label="Protocol Name" defaultValue={editingPlan?.name} placeholder="e.g. Enterprise Tier" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Monthly Credits" type="number" defaultValue={editingPlan?.monthlyPrice} placeholder="0" />
                                        <Input label="Yearly Credits" type="number" defaultValue={editingPlan?.yearlyPrice} placeholder="0" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-widest ml-1">Functional Brief</label>
                                        <textarea
                                            className="block w-full px-5 py-4 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/30 transition-all font-bold text-sm min-h-[140px] resize-none text-[#2E2E2F]"
                                            placeholder="Define the purpose of this node..."
                                            defaultValue={editingPlan?.description}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-[#2E2E2F]/40 uppercase tracking-[0.2em] mb-3 ml-1">Quota Constraints</label>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                                    <Input label="User Seats" type="number" defaultValue={editingPlan?.limits.users === 'Unlimited' ? 0 : editingPlan?.limits.users} />
                                    <Input label="Project Hubs" type="number" defaultValue={editingPlan?.limits.projects === 'Unlimited' ? 0 : editingPlan?.limits.projects} />
                                    <Input label="Contact Vectors" type="number" defaultValue={editingPlan?.limits.contacts === 'Unlimited' ? 0 : editingPlan?.limits.contacts} />
                                    <Input label="Account Nodes" type="number" defaultValue={editingPlan?.limits.accounts === 'Unlimited' ? 0 : editingPlan?.limits.accounts} />
                                    <Input label="Storage (GB)" type="number" defaultValue={editingPlan?.limits.storage.replace(/\D/g, '')} />
                                    <Input label="Trial Lifecycle" type="number" defaultValue={editingPlan?.trialDays || 0} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operational Toggles */}
                    <div className="space-y-6">
                        <label className="block text-[10px] font-black text-[#2E2E2F]/40 uppercase tracking-[0.2em] ml-1">Active Modules & Protocols</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { id: 'ai', label: 'AI Integration Protocol', desc: 'Enable neural processing and automated insights', enabled: editingPlan?.features.aiIntegration },
                                { id: 'brand', label: 'Sovereign Branding', desc: 'Remove system-level watermarks from client views', enabled: editingPlan?.features.branding },
                                { id: 'market', label: 'Supplier Ecosystem', desc: 'Connect to the centralized service marketplace', enabled: editingPlan?.features.weddingSuppliers },
                                { id: 'default', label: 'Primary Entry Node', desc: 'Auto-assign this plan to newly initialized accounts', enabled: editingPlan?.isDefault }
                            ].map((toggle) => (
                                <div key={toggle.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-[#F2F2F2] border border-[#2E2E2F]/5 group/modal-toggle hover:border-[#38BDF2]/20 transition-all">
                                    <div>
                                        <p className="text-[13px] font-black text-[#2E2E2F] uppercase tracking-tight">{toggle.label}</p>
                                        <p className="text-[10px] text-[#2E2E2F]/50 font-bold uppercase tracking-widest mt-0.5">{toggle.desc}</p>
                                    </div>
                                    <Toggle enabled={toggle.enabled || false} onChange={() => { }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Commit Actions */}
                    <div className="flex gap-4 pt-10 border-t border-[#2E2E2F]/5">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-2xl py-4 !bg-[#F2F2F2] !text-[#2E2E2F] border-[#2E2E2F]/10 hover:!bg-[#E0E0E0] font-black text-[11px] uppercase tracking-widest">
                            Discard Configuration
                        </Button>
                        <Button onClick={() => setIsModalOpen(false)} className="flex-[2] rounded-2xl py-4 shadow-2xl shadow-[#38BDF2]/30 font-black text-[11px] uppercase tracking-[0.2em]">
                            {editingPlan ? 'Commit Sync Changes' : 'Initialize Plan Node'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
