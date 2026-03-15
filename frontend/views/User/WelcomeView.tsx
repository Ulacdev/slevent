import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { OrganizerProfile } from '../../types';
import { useUser } from '../../context/UserContext';
import { Card, Button, Input } from '../../components/Shared';

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, '');

type WelcomeStep = 'welcome' | 'setup';

const WelcomeView: React.FC = () => {
    const navigate = useNavigate();
    const { name, email } = useUser();
    const [step, setStep] = useState<WelcomeStep>('welcome');
    const [profile, setProfile] = useState<OrganizerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Form state – same fields as OrganizerSettings
    const [formData, setFormData] = useState({
        organizerName: '',
        websiteUrl: '',
        bio: '',
        eventPageDescription: '',
        facebookId: '',
        twitterHandle: '',
        emailOptIn: false,
    });

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const org = await apiService.getMyOrganizer();
                if (!mounted) return;
                if (org) {
                    setProfile(org);
                    if (org.isOnboarded) {
                        navigate('/user-home', { replace: true });
                        return;
                    }
                    setFormData({
                        organizerName: org.organizerName || name || '',
                        websiteUrl: org.websiteUrl || '',
                        bio: org.bio || '',
                        eventPageDescription: org.eventPageDescription || '',
                        facebookId: org.facebookId || '',
                        twitterHandle: org.twitterHandle || '',
                        emailOptIn: !!org.emailOptIn,
                    });
                }
            } catch (err) {
                console.error('Failed to load organizer for onboarding:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [navigate, name]);

    useEffect(() => {
        if (!notification) return;
        const t = window.setTimeout(() => setNotification(null), 4000);
        return () => window.clearTimeout(t);
    }, [notification]);

    const handleFormChange = (field: keyof typeof formData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const organizerName = stripHtml(formData.organizerName).trim();
        if (!organizerName) {
            setNotification({ message: 'Organization name is required.', type: 'error' });
            return;
        }
        setSaving(true);
        try {
            await apiService.upsertOrganizer({
                organizerName: organizerName || null,
                websiteUrl: formData.websiteUrl.trim() || null,
                bio: stripHtml(formData.bio).trim() || null,
                eventPageDescription: stripHtml(formData.eventPageDescription).trim() || null,
                facebookId: formData.facebookId.trim() || null,
                twitterHandle: formData.twitterHandle.trim() || null,
                emailOptIn: formData.emailOptIn,
                isOnboarded: true,
            } as any);
            navigate('/user-home', { replace: true });
        } catch (err: any) {
            setNotification({
                message: err?.message || 'Failed to save. Please try again.',
                type: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    /* ───────── STEP 1: Welcome ───────── */
    if (step === 'welcome') {
        return (
            <div className="h-screen bg-[#F2F2F2] flex flex-col overflow-hidden">
                {/* Minimal top bar */}
                <header className="px-8 py-4 shrink-0">
                    <img
                        src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
                        alt="StartupLab"
                        className="h-28 w-auto"
                    />
                </header>

                <main className="flex-1 flex items-center px-8 md:px-16 lg:px-24 pb-8">
                    <div className="max-w-[88rem] w-full mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-14">
                        {/* Left Column: Content */}
                        <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAFAFA] border border-[#2E2E2F]/5 text-[10px] font-bold text-[#2E2E2F] mb-10 shadow-sm">
                                <span role="img" aria-label="wave">👋</span>
                                <span className="opacity-80">Let's get you started</span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#2E2E2F] tracking-tighter leading-[1.1] mb-12">
                                Welcome to<br /><span className="text-[#38BDF2]">Startup</span>Lab!
                            </h1>
                            <p className="text-[#2E2E2F]/60 text-base lg:text-lg font-medium leading-relaxed mb-16 max-w-xl">
                                We're absolutely thrilled to have you here! StartupLab is your all-in-one partner for creating unforgettable event experiences in the Philippines and beyond. From intimate workshops to large-scale conferences and summits, we provide the cutting-edge tools you need to manage everything with ease. Your journey to hosting world-class events starts right here. What can we help you with first?
                            </p>

                            <div className="flex flex-wrap gap-4 mt-8 py-2">
                                <button
                                    onClick={() => setStep('setup')}
                                    className="px-8 py-4 rounded-full border border-[#2E2E2F]/15 text-sm font-bold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:border-[#38BDF2]/40 transition-colors shadow-sm"
                                >
                                    Set up my organizer profile
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    className="px-8 py-4 rounded-full border border-[#2E2E2F]/15 text-sm font-bold text-[#2E2E2F] hover:bg-[#2E2E2F]/5 transition-colors shadow-sm"
                                >
                                    Browse events
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Visual */}
                        <div className="flex-1 relative hidden lg:flex items-center justify-center">
                            <div className="absolute -inset-8 bg-gradient-to-tr from-[#38BDF2]/10 to-transparent blur-3xl opacity-50"></div>
                            <div className="relative bg-white p-1.5 rounded-[2.2rem] shadow-[0_28px_56px_-16px_rgba(46,46,47,0.15)] overflow-hidden transform lg:rotate-2 hover:rotate-0 transition-transform duration-700">
                                <img
                                    src="/welcome-hero.png"
                                    alt="Event Management"
                                    className="w-full max-h-[calc(100vh-200px)] object-cover rounded-[1.8rem]"
                                />
                            </div>
                            {/* Floating badge */}
                            <div className="absolute -bottom-3 -left-3 bg-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce">
                                <div className="w-9 h-9 rounded-full bg-[#38BDF2]/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#38BDF2]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#2E2E2F]/40">Ready</p>
                                    <p className="text-xs font-bold text-[#2E2E2F]">Let's get started</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    /* ───────── STEP 2: Org Profile Setup (same form as OrganizerSettings) ───────── */
    return (
        <div className="min-h-screen bg-[#F2F2F2] flex flex-col">
            {/* Top bar */}
            <header className="px-6 py-5 flex items-center justify-between border-b border-[#2E2E2F]/10">
                <img
                    src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
                    alt="StartupLab"
                    className="h-20 w-auto"
                />
                <button
                    onClick={() => setStep('welcome')}
                    className="text-sm font-bold text-[#2E2E2F]/50 hover:text-[#2E2E2F] transition-colors"
                >
                    ← Back
                </button>
            </header>

            {notification && (
                <div className="fixed top-24 right-8 z-[120]">
                    <Card
                        className={`px-5 py-3 rounded-2xl border ${notification.type === 'success'
                            ? 'bg-[#38BDF2]/20 border-[#38BDF2]/40 text-[#2E2E2F]'
                            : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                    >
                        <p className="text-sm font-bold tracking-tight">{notification.message}</p>
                    </Card>
                </div>
            )}

            <main className="flex-1 flex justify-center px-6 py-10">
                <div className="w-full max-w-2xl">
                    <div className="mb-8 px-2">
                        <h1 className="text-3xl md:text-[2rem] font-black text-[#2E2E2F] tracking-tight">
                            Set Up Your Org Profile
                        </h1>
                        <p className="mt-1 text-sm font-medium text-[#2E2E2F]/65">
                            Fill in the basics so attendees can find and trust your events.
                        </p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <Card className="p-8 rounded-[2rem] border-[#2E2E2F]/10 bg-[#F2F2F2]">
                            <div className="space-y-6">
                                {/* Organizer Name */}
                                <div>
                                    <Input
                                        label="Organizer Name"
                                        value={formData.organizerName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            handleFormChange('organizerName', stripHtml(e.target.value))
                                        }
                                        required
                                    />
                                </div>

                                {/* Website */}
                                <div>
                                    <Input
                                        label="Website URL"
                                        placeholder="https://example.com"
                                        value={formData.websiteUrl}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            handleFormChange('websiteUrl', e.target.value)
                                        }
                                    />
                                </div>

                                {/* Bio */}
                                <div>
                                    <label className="block text-sm font-medium text-[#2E2E2F]/70 mb-1.5">
                                        Bio / Description (Text only)
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-lg outline-none focus:ring-2 focus:ring-[#38BDF2]/40 min-h-[120px]"
                                        value={formData.bio}
                                        onChange={(e) => handleFormChange('bio', stripHtml(e.target.value))}
                                        placeholder="Introduce your organization..."
                                    />
                                </div>

                                {/* Event Page Description */}
                                <div>
                                    <label className="block text-sm font-medium text-[#2E2E2F]/70 mb-1.5">
                                        Event Page Description (Short)
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-lg outline-none focus:ring-2 focus:ring-[#38BDF2]/40 min-h-[90px]"
                                        maxLength={280}
                                        value={formData.eventPageDescription}
                                        onChange={(e) => handleFormChange('eventPageDescription', stripHtml(e.target.value))}
                                        placeholder="A short default description shown on your event pages."
                                    />
                                </div>

                                {/* Social */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Input
                                        label="Facebook ID"
                                        placeholder="your.page.id"
                                        value={formData.facebookId}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            handleFormChange('facebookId', e.target.value)
                                        }
                                    />
                                    <Input
                                        label="Twitter Handle"
                                        placeholder="@yourhandle"
                                        value={formData.twitterHandle}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            handleFormChange('twitterHandle', e.target.value)
                                        }
                                    />
                                </div>

                                {/* Email opt-in */}
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-3 text-sm text-[#2E2E2F]/80 font-medium cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.emailOptIn}
                                            onChange={(e) => handleFormChange('emailOptIn', e.target.checked)}
                                            className="w-4 h-4 accent-[#38BDF2]"
                                        />
                                        Receive organizer email updates
                                    </label>
                                </div>
                            </div>
                        </Card>

                        {/* Save */}
                        <Card className="p-6 rounded-2xl border-[#2E2E2F]/10 bg-[#F2F2F2]">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <p className="text-sm text-[#2E2E2F]/60 font-medium">
                                    You can update these details anytime from Settings.
                                </p>
                                <Button
                                    type="submit"
                                    className="px-8 py-3 rounded-xl font-black tracking-widest text-[10px]"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Complete Setup'}
                                </Button>
                            </div>
                        </Card>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default WelcomeView;
