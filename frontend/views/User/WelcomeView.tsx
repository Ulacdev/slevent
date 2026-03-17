import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { OrganizerProfile } from '../../types';
import { useUser } from '../../context/UserContext';
import { Card, Button, Input, Badge } from '../../components/Shared';

import { ICONS } from '../../constants';


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
    const [allOrganizers, setAllOrganizers] = useState<OrganizerProfile[]>([]);


    // Form state – same fields as OrganizerSettings
    const [formData, setFormData] = useState({
        organizerName: '',
        websiteUrl: '',
        bio: '',
        eventPageDescription: '',
        facebookId: '',
        twitterHandle: '',
        emailOptIn: false,
        profileImageUrl: '',
        coverImageUrl: '',
        brandColor: '#38BDF2',
    });

    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const coverInputRef = React.useRef<HTMLInputElement | null>(null);


    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                // Load My Organizer
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
                        profileImageUrl: org.profileImageUrl || '',
                        coverImageUrl: org.coverImageUrl || '',
                        brandColor: org.brandColor || '#38BDF2',
                    });

                }

                // Load All Organizers for the tally
                const list = await apiService.getOrganizers();
                if (mounted) setAllOrganizers(list || []);
            } catch (err) {
                console.error('Failed to load onboarding data:', err);
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
                profileImageUrl: formData.profileImageUrl || null,
                coverImageUrl: formData.coverImageUrl || null,
                brandColor: formData.brandColor || null,
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

    const canCustomBrand = !!(profile?.plan?.features?.enable_custom_branding || profile?.plan?.features?.custom_branding);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canCustomBrand) {
            setNotification({ message: 'Logo upload is a Professional feature.', type: 'error' });
            return;
        }
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { publicUrl } = await apiService.uploadOrganizerImage(file);
            setFormData(prev => ({ ...prev, profileImageUrl: publicUrl }));
            setNotification({ message: 'Logo uploaded!', type: 'success' });
        } catch (err: any) {
            setNotification({ message: 'Upload failed', type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canCustomBrand) {
            setNotification({ message: 'Cover photo is a Professional feature.', type: 'error' });
            return;
        }
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { publicUrl } = await apiService.uploadOrganizerCoverImage(file);
            setFormData(prev => ({ ...prev, coverImageUrl: publicUrl }));
            setNotification({ message: 'Cover photo uploaded!', type: 'success' });
        } catch (err: any) {
            setNotification({ message: 'Upload failed', type: 'error' });
        } finally {
            setUploading(false);
        }
    };


    if (loading) return null;


    const organizerLogos = allOrganizers
        .filter(org => org.profileImageUrl)
        .slice(0, 4);
    const organizerCount = allOrganizers.length || 0;


    /* ───────── STEP 1: Welcome ───────── */
    if (step === 'welcome') {
        return (
            <div className="min-h-screen bg-[#F2F2F2] flex flex-col overflow-hidden relative">
                {/* No background pulses per user request */}

                {/* Minimal top bar */}
                <header className="px-8 md:px-12 py-8 shrink-0 z-10">
                    <img
                        src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
                        alt="StartupLab"
                        className="h-10 md:h-12 w-auto animate-in fade-in slide-in-from-top-4 duration-1000"
                    />
                </header>

                <main className="flex-1 flex items-center px-8 md:px-16 lg:px-24 pb-12 z-10">
                    <div className="max-w-[88rem] w-full mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
                        {/* Left Column: Content */}
                        <div className="flex-1 min-w-0 flex flex-col items-start text-left animate-in fade-in slide-in-from-left-8 duration-1000 delay-200">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F2F2F2] border border-[#2E2E2F]/10 text-[11px] font-black uppercase tracking-widest text-[#38BDF2] mb-10 shadow-none">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38BDF2] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38BDF2]"></span>
                                </span>
                                Your Journey Begins Here
                            </div>

                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-[#2E2E2F] tracking-tighter leading-[1.05] mb-8">
                                Welcome to<br />
                                <span className="relative inline-block mt-2">
                                    <span className="relative z-10 text-[#38BDF2]">Startup</span>
                                    <span className="absolute bottom-2 left-0 w-full h-4 bg-[#38BDF2]/10 -rotate-1 z-0 rounded-full"></span>
                                </span>
                                <span className="text-[#2E2E2F]">Lab</span>
                            </h1>
                            
                            <p className="text-[#2E2E2F]/60 text-lg lg:text-xl font-medium leading-relaxed mb-12 max-w-xl">
                                We're thrilled to have you! StartupLab is your all-in-one partner for creating unforgettable event experiences. From intimate workshops to global summits, we provide the tools to make it seamless.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
                                <button
                                    onClick={() => setStep('setup')}
                                    className="group relative px-10 py-5 rounded-2xl bg-[#38BDF2] text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_40px_-10px_rgba(56,189,242,0.4)] active:scale-95"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px]">
                                        Create Organizer Profile
                                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </span>
                                </button>
                                
                            </div>    

                            <div className="mt-16 flex items-center gap-8 py-6 opacity-60 hover:opacity-100 transition-all duration-500">
                                <div className="flex -space-x-3">
                                    {organizerLogos.length > 0 ? (
                                        organizerLogos.map((org, i) => (
                                            <div key={i} className="w-9 h-9 rounded-full border-2 border-[#F2F2F2] bg-[#F2F2F2] overflow-hidden shadow-sm">
                                                <img 
                                                    src={typeof org.profileImageUrl === 'string' ? org.profileImageUrl : (org.profileImageUrl as any)?.url || (org.profileImageUrl as any)?.publicUrl} 
                                                    alt={org.organizerName} 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        [1, 2, 3, 4].map(i => (
                                            <div key={i} className="w-9 h-9 rounded-full border-2 border-[#F2F2F2] bg-[#38BDF2]/10 flex items-center justify-center text-[10px] font-black text-[#38BDF2]">
                                                {String.fromCharCode(64 + i)}
                                            </div>
                                        ))
                                    )}
                                    {organizerCount > 4 && (
                                        <div className="w-9 h-9 rounded-full border-2 border-[#F2F2F2] bg-[#E8E8E8] flex items-center justify-center text-[10px] font-black text-[#2E2E2F]">
                                            +{organizerCount - 4}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Joined by {organizerCount > 0 ? organizerCount : '200'}+ top organizers</p>
                            </div>

                        </div>

                        {/* Right Column: Visual */}
                        <div className="flex-1 relative hidden lg:flex items-center justify-center animate-in fade-in zoom-in duration-1000 delay-500">
                            {/* Removed background glow per user request */}
                            
                            {/* Modern Card Stacking Effect */}
                            <div className="relative group">
                                <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#38BDF2]/5 rounded-3xl -rotate-12 transition-transform group-hover:-rotate-6 duration-700"></div>
                                <div className="absolute -bottom-6 -left-6 w-24 h-24 border-2 border-[#2E2E2F]/10 rounded-2xl rotate-12 transition-transform group-hover:rotate-6 duration-700"></div>
                                
                                <div className="relative bg-[#F2F2F2] p-2.5 rounded-[3rem] border border-[#2E2E2F]/5 shadow-none overflow-hidden transform hover:-translate-y-2 transition-all duration-700 ease-out">
                                    <img
                                        src="/welcome-hero.png"
                                        alt="StartupLab Experience"
                                        className="w-full max-h-[calc(100vh-280px)] object-cover rounded-[2.5rem] grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                                    />
                                    
                                    {/* Removed glass overlay per user request */}

                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    /* ───────── STEP 2: Org Profile Setup ───────── */
    return (
        <div className="min-h-screen bg-[#F2F2F2] flex flex-col relative overflow-x-hidden">
            {/* Minimal top bar */}
            <header className="px-8 py-6 flex items-center justify-between border-b border-[#2E2E2F]/10 bg-[#F2F2F2] sticky top-0 z-50">
                <img
                    src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
                    alt="StartupLab"
                    className="h-10 w-auto"
                />
                <button
                    onClick={() => setStep('welcome')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#2E2E2F]/40 hover:text-[#2E2E2F] hover:bg-[#2E2E2F]/5 transition-all"
                >
                    <ICONS.ChevronLeft className="w-4 h-4" />
                    Go Back
                </button>
            </header>


            {notification && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] animate-in fade-in slide-in-from-top-4 duration-500">
                    <Card
                        className={`px-8 py-4 rounded-[2rem] border-2 shadow-2xl flex items-center gap-4 ${notification.type === 'success'
                            ? 'bg-[#38BDF2]/10 border-[#38BDF2] text-[#2E2E2F]'
                            : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                    >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${notification.type === 'success' ? 'bg-[#38BDF2] text-white' : 'bg-red-500 text-white'}`}>
                            {notification.type === 'success' ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>}
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest">{notification.message}</p>
                    </Card>
                </div>
            )}

            <main className="flex-1 flex flex-col items-center px-6 py-12 animate-in fade-in duration-500">
                <div className="w-full max-w-4xl">
                    <form onSubmit={handleSave} className="pb-20">
                        <Card className="p-8 md:p-12 rounded-[2.5rem] border-[#2E2E2F]/10 bg-[#F2F2F2] shadow-none">
                            <div className="space-y-8">
                                {/* Organizer Name */}
                                <div className="space-y-2">
                                    <label className="text-[13px] font-black uppercase tracking-widest text-[#2E2E2F]/40 ml-1">Organizer Name</label>
                                    <Input
                                        placeholder="e.g. Innovate Philippines"
                                        value={formData.organizerName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            handleFormChange('organizerName', stripHtml(e.target.value))
                                        }
                                        required
                                        className="h-14 !bg-[#F2F2F2] !border-2 !border-[#E8E8E8] focus:!border-[#38BDF2] rounded-2xl"
                                    />
                                </div>

                                {/* Website & Newsletter */}
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                                    <div className="flex-1 w-full space-y-2">
                                        <label className="text-[13px] font-black uppercase tracking-widest text-[#2E2E2F]/40 ml-1">Website URL</label>
                                        <Input
                                            placeholder="https://example.com"
                                            value={formData.websiteUrl}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                handleFormChange('websiteUrl', e.target.value)
                                            }
                                            className="h-14 !bg-[#F2F2F2] !border-2 !border-[#E8E8E8] focus:!border-[#38BDF2] rounded-2xl"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4 pt-6 group cursor-pointer" onClick={() => handleFormChange('emailOptIn', !formData.emailOptIn)}>
                                        <input
                                            type="checkbox"
                                            checked={formData.emailOptIn}
                                            onChange={(e) => handleFormChange('emailOptIn', e.target.checked)}
                                            className="w-5 h-5 accent-[#38BDF2] cursor-pointer rounded-lg"
                                        />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-[#2E2E2F]/60 group-hover:text-[#2E2E2F] transition-colors">Receive organizer email updates</span>
                                    </div>
                                </div>

                                {/* Bio */}
                                <div className="space-y-2">
                                    <label className="text-[13px] font-black uppercase tracking-widest text-[#2E2E2F]/40 ml-1">Bio / Description (Text only)</label>
                                    <textarea
                                        className="w-full px-5 py-4 bg-[#F2F2F2] border-2 border-[#E8E8E8] rounded-3xl outline-none focus:ring-4 focus:ring-[#38BDF2]/10 focus:border-[#38BDF2] min-h-[140px] text-sm font-medium leading-relaxed transition-all"
                                        value={formData.bio}
                                        onChange={(e) => handleFormChange('bio', stripHtml(e.target.value))}
                                        placeholder="Introduce your organization..."
                                    />
                                </div>

                                {/* Event Page Short Description */}
                                <div className="space-y-2">
                                    <label className="text-[13px] font-black uppercase tracking-widest text-[#2E2E2F]/40 ml-1">Event Page Description (Short)</label>
                                    <textarea
                                        className="w-full px-5 py-4 bg-[#F2F2F2] border-2 border-[#E8E8E8] rounded-3xl outline-none focus:ring-4 focus:ring-[#38BDF2]/10 focus:border-[#38BDF2] min-h-[90px] text-sm font-medium leading-relaxed transition-all"
                                        maxLength={280}
                                        value={formData.eventPageDescription}
                                        onChange={(e) => handleFormChange('eventPageDescription', stripHtml(e.target.value))}
                                        placeholder="A short default description shown on your event pages."
                                    />
                                </div>

                                {/* Social Handlers */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-black uppercase tracking-widest text-[#2E2E2F]/40 ml-1">Facebook ID</label>
                                        <Input
                                            placeholder="your.page.id"
                                            value={formData.facebookId}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                handleFormChange('facebookId', e.target.value)
                                            }
                                            className="h-14 !bg-[#F2F2F2] !border-2 !border-[#E8E8E8] focus:!border-[#38BDF2] rounded-2xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-black uppercase tracking-widest text-[#2E2E2F]/40 ml-1">Twitter Handle</label>
                                        <Input
                                            placeholder=""
                                            value={formData.twitterHandle}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                handleFormChange('twitterHandle', e.target.value)
                                            }
                                            className="h-14 !bg-[#F2F2F2] !border-2 !border-[#E8E8E8] focus:!border-[#38BDF2] rounded-2xl"
                                        />
                                    </div>
                                </div>
                                
                                <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-start">
                                    <Button
                                        type="submit"
                                        className="px-12 h-16 rounded-2xl font-black tracking-[0.2em] text-[11px] uppercase bg-[#38BDF2] text-white shadow-xl shadow-[#38BDF2]/20 hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
                                        disabled={saving}
                                    >
                                        {saving ? 'Synchronizing...' : 'Complete & Launch Profile'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </form>
                </div>
            </main>



        </div>
    );
};

export default WelcomeView;
