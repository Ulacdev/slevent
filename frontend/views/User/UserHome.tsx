
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { apiService } from '../../services/apiService';
import { Event, TicketType, EventStatus } from '../../types';
import { Card, Button, Modal, Input } from '../../components/Shared';
import { OnsiteLocationAssistant } from '../../components/OnsiteLocationAssistant';
import { PlanUpgradeModal } from '../../components/PlanUpgradeModal';
import { SupportCenter } from '../../components/SupportCenter';
import { ICONS } from '../../constants';
import { PortalSkeleton } from '../../components/Shared/Skeleton';

const getImageUrl = (img: any): string => {
    if (!img) return 'https://via.placeholder.com/800x400';
    if (typeof img === 'string') return img;
    return img.url || img.path || img.publicUrl || 'https://via.placeholder.com/800x400';
};

export const UserHome: React.FC = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { name, email } = useUser();
    const displayName = name?.trim() || email?.split('@')[0] || 'there';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    // const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [emailQuota, setEmailQuota] = useState<{ remaining: number; limit: number; sent: number; canSend: boolean; quotaStatus: string } | null>(null);
    const [isSupportCenterOpen, setIsSupportCenterOpen] = useState(false);

    const initialFormData = {
        eventName: '',
        description: '',
        eventDate: '',
        eventTime: '09:00',
        endDate: '',
        endTime: '17:00',
        timezone: 'Asia/Manila',
        locationType: 'ONSITE' as Event['locationType'],
        location: '',
        capacityTotal: 100,
        imageUrl: 'https://images.unsplash.com/photo-1540575861501-7ad0582373f3?auto=format&fit=crop&q=80&w=800',
        status: 'DRAFT' as EventStatus,
        regOpenDate: new Date().toISOString().split('T')[0],
        regCloseDate: '',
        regCloseTime: '',
        streamingPlatform: '',
        ticketTypes: [] as TicketType[]
    };

    const [formData, setFormData] = useState(initialFormData);
    const [stats, setStats] = useState({ liveEventsCount: 0, ticketsSold: 0, paidEventsCount: 0 });
    const [loadingStats, setLoadingStats] = useState(true);
    const [organizerProfile, setOrganizerProfile] = useState<any>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [promotedEvents, setPromotedEvents] = useState<any[]>([]);
    const [now, setNow] = useState(new Date());

    // AI Assistant state variables
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [assistantMessages, setAssistantMessages] = useState<Array<{ sender: 'volt' | 'user'; text: string; time: Date }>>([
        {
            sender: 'volt',
            text: `Oh hello, ${displayName}! 🐺 I'm Volt, your neon cyber-husky AI Event Co-Pilot! I'm here to help you optimize event strategies, draft high-impact announcements, or analyze your dashboard metrics. What can I sniff out for you today?`,
            time: new Date()
        }
    ]);
    const [assistantInput, setAssistantInput] = useState('');
    const [isVoltTyping, setIsVoltTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Mascot 3D Cursor-Tracking Parallax States
    const [mascotRotation, setMascotRotation] = useState({ x: 0, y: 0 });
    const mascotContainerRef = useRef<HTMLDivElement>(null);
    const [mascotActionClass, setMascotActionClass] = useState<'idle' | 'think' | 'jump'>('idle');

    const handleMascotMouseMove = (e: React.MouseEvent) => {
        if (!mascotContainerRef.current) return;
        const rect = mascotContainerRef.current.getBoundingClientRect();
        
        // Find cursor coordinates relative to center of the banner container
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = (e.clientX - centerX) / 40; // smooth tracking scale
        const deltaY = (e.clientY - centerY) / 40;
        
        // Cap the maximum rotation tilt to 12 degrees
        const tiltX = Math.max(-12, Math.min(12, deltaX));
        const tiltY = Math.max(-12, Math.min(12, deltaY));
        
        setMascotRotation({ x: tiltX, y: -tiltY });
    };

    const handleMascotMouseLeave = () => {
        setMascotRotation({ x: 0, y: 0 });
    };

    // Auto-scroll messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [assistantMessages, isVoltTyping]);

    // Lock background body scroll when co-pilot assistant is open
    useEffect(() => {
        if (isAssistantOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isAssistantOpen]);

    const handleSendAssistantMessage = (customText?: string) => {
        const query = (customText || assistantInput).trim();
        if (!query) return;

        // Add user message
        const newMsg = { sender: 'user' as const, text: query, time: new Date() };
        setAssistantMessages(prev => [...prev, newMsg]);
        setAssistantInput('');
        setIsVoltTyping(true);
        setMascotActionClass('think');

        // Simulated AI response logic utilizing real portal statistics
        setTimeout(() => {
            let voltText = '';
            const lower = query.toLowerCase();

            if (lower.includes('sales') || lower.includes('ticket') || lower.includes('stats') || lower.includes('analyze') || lower.includes('registrations')) {
                voltText = `Sniffing out your sales tracker... 🐾 You currently have **${stats.liveEventsCount} live events** and **${stats.ticketsSold} tickets sold** across your active experiences. This is a solid foundation!\n\n💡 **Co-Pilot Recommendation:** To double your conversion rates this week, I suggest configuring a *Time-Limited Flash Sale* at 15% off for regular tickets. This will generate quick momentum. Would you like me to draft an email invitation layout for you?`;
            } else if (lower.includes('announcement') || lower.includes('draft') || lower.includes('broadcast') || lower.includes('news')) {
                voltText = `Here is a high-impact broadcast announcement draft tailored for your attendees:\n\n📢 **EXCITED TO WELCOME YOU!** 🚀\n*Hello everyone! We're putting the finishing touches on our upcoming session. Expect elite guest speakers, high-energy networking workshops, and premium catering. Gates open at 9:00 AM sharp!*\n\n📝 Feel free to copy this directly into your announcements dashboard!`;
            } else if (lower.includes('pricing') || lower.includes('cost') || lower.includes('price') || lower.includes('tier')) {
                voltText = `For optimal ticket monetization, I always recommend the **Triple Tier pricing rule**:\n\n1. **Early Bird (20% Discount):** Drive 30% of sales early to build social proof.\n2. **Regular Tier:** Your main revenue engine.\n3. **VIP Experience (2.5x Standard Price):** Include front-row access or priority registration. VIPs usually account for only 15% of tickets but generate over 40% of the overall profit!\n\nWhich ticket tier would you like me to help you details?`;
            } else {
                voltText = `Bark! 🐺 I'm tracking with you! As your Event Co-Pilot, I can help you analyze your current ${stats.liveEventsCount} live events, draft copywriting announcements, or outline ticket tier plans. What should we tackle next?`;
            }

            setAssistantMessages(prev => [...prev, { sender: 'volt', text: voltText, time: new Date() }]);
            setIsVoltTyping(false);
            setMascotActionClass('jump');
            
            // Return back to smooth breathing after jump physics animation (800ms)
            setTimeout(() => {
                setMascotActionClass('idle');
            }, 800);
        }, 1200);
    };

    const getDynamicMascotGreeting = () => {
        if (loadingStats) {
            return "Sniffing out your dashboard statistics... 🐾 Hold tight, I'm fetching your latest event data!";
        }
        if (stats.liveEventsCount === 0) {
            return `Bark! 🐺 You don't have any live events running right now. Let's launch your first experience! Click 'New Event' below, and I'll help you draft a perfect description!`;
        }
        if (stats.ticketsSold === 0) {
            return `We are live! 🚀 You have ${stats.liveEventsCount} active ${stats.liveEventsCount === 1 ? 'event' : 'events'} running, but no registrations yet. I suggest drafting an announcement to share with your audience! Click me to open my AI panel!`;
        }
        return `Awesome job, ${displayName}! 🎉 You've sold ${stats.ticketsSold} ${stats.ticketsSold === 1 ? 'ticket' : 'tickets'} across ${stats.liveEventsCount} active ${stats.liveEventsCount === 1 ? 'event' : 'events'}! Your event engine is buzzing. Click me to analyze your latest metrics!`;
    };

    // Check if organizer's plan has priority support
    const hasPrioritySupport = organizerProfile?.plan?.features?.enable_priority_support ||
        organizerProfile?.plan?.features?.priority_support;

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [events, analytics, organizer, quota] = await Promise.all([
                    apiService.getUserEvents(),
                    apiService.getAnalytics(),
                    apiService.getMyOrganizer(),
                    apiService.getEmailQuotaStatus().catch((err) => {
                        console.error('Email quota fetch error:', err);
                        return null;
                    }),
                ]);
                const liveCount = events.filter(e => e.status === 'PUBLISHED').length;

                // Calculate paid events (all events with at least one paid ticket)
                const paidCount = events.filter(e =>
                    (e.ticketTypes || []).some((t: any) => (t.priceAmount || 0) > 0)
                ).length;

                setStats({
                    liveEventsCount: liveCount,
                    ticketsSold: analytics.totalRegistrations || 0,
                    paidEventsCount: paidCount
                });
                setOrganizerProfile(organizer);
                if (quota) setEmailQuota(quota);

                // Fetch promoted events
                try {
                    const promos = await apiService.getMyActivePromotions();
                    setPromotedEvents(promos);
                } catch (err) {
                    console.error('Failed to fetch promoted events:', err);
                }

                const hideModal = sessionStorage.getItem('hideUpgradeModal');
                if (!hideModal) {
                    setIsUpgradeModalOpen(true);
                }
            } catch (err) {
                console.error('Failed to fetch stats:', err);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchData();
    }, []);

    // Live countdown tick every second
    React.useEffect(() => {
        if (promotedEvents.length === 0) return;
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, [promotedEvents.length]);

    /* Removed local notification effect
    React.useEffect(() => {
        if (notification) {
            const t = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(t);
        }
    }, [notification]);
    */

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSubmitting(true);
        try {
            const { publicUrl } = await apiService.uploadUserEventImage(file);
            setFormData(prev => ({ ...prev, imageUrl: publicUrl }));
        } catch {
            showToast('error', 'Image upload failed.');
        } finally {
            setSubmitting(false);
        }
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();



        setSubmitting(true);
        try {
            const mergeDateTime = (date: string, time: string) => {
                if (!date) return null;
                return `${date}T${time || '09:00'}:00`;
            };
            await apiService.createUserEvent({
                eventName: formData.eventName,
                description: formData.description,
                startAt: mergeDateTime(formData.eventDate, formData.eventTime),
                endAt: formData.endDate ? mergeDateTime(formData.endDate, formData.endTime) : null,
                timezone: formData.timezone,
                locationType: formData.locationType,
                locationText: formData.location,
                capacityTotal: formData.capacityTotal,
                imageUrl: formData.imageUrl,
                status: formData.status,
                regOpenAt: formData.regOpenDate || null,
                regCloseAt: formData.regCloseDate || null,
                streamingPlatform: formData.streamingPlatform
            });
            showToast('success', 'Event created successfully!');
            setIsModalOpen(false);
            setFormData(initialFormData);
            setTimeout(() => navigate('/my-events'), 1200);
        } catch (err: any) {
            showToast('error', err.message || 'Failed to create event.');
        } finally {
            setSubmitting(false);
        }
    };

    const applyLocationValue = (locationValue: string) => {
        const nextData: any = { ...formData, location: locationValue };
        if ((formData.locationType === 'ONLINE' || formData.locationType === 'HYBRID') && !formData.streamingPlatform) {
            const lowUrl = locationValue.toLowerCase();
            if (lowUrl.includes('meet.google.com')) nextData.streamingPlatform = 'Google Meet';
            else if (lowUrl.includes('zoom.us') || lowUrl.includes('zoom.com')) nextData.streamingPlatform = 'Zoom';
            else if (lowUrl.includes('teams.microsoft.com')) nextData.streamingPlatform = 'Microsoft Teams';
        }
        setFormData(nextData);
    };

    if (loadingStats) return <PortalSkeleton />;

    return (
        <div className="space-y-12 max-w-6xl mx-auto pt-10 -mt-4">
            {/* Local notification JSX removed */}

            {/* Welcome Section with AI Mascot */}
            <div className="bg-[#38BDF2] border-2 border-[#38BDF2] rounded-[2.5rem] p-4 py-2 md:p-14 lg:p-16 mb-4 shadow-[0_20px_40px_-10px_rgba(56,189,242,0.3)] relative min-h-[72px] md:min-h-[260px] flex items-center">
                
                {/* Absolute Mascot - Pops out of the bottom border exactly like reference */}
                <div 
                    onClick={() => setIsAssistantOpen(true)}
                    className={`absolute -bottom-8 md:-bottom-10 lg:-bottom-12 xl:-bottom-16 left-3 xs:left-5 w-32 h-32 xs:w-36 xs:h-36 md:w-56 md:h-56 lg:w-64 lg:h-64 xl:w-80 xl:h-80 z-20 cursor-pointer transform-gpu transition-[transform,filter] duration-300 ${
                        isAssistantOpen 
                            ? 'scale-105 filter drop-shadow-[0_0_25px_rgba(255,255,255,0.75)]' 
                            : 'hover:scale-[1.03]'
                    }`}
                >
                    <img 
                        src="/mascot.png?v=3" 
                        alt="AI Assistant Mascot" 
                        className="w-full h-full object-contain" 
                        onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=150";
                        }}
                    />
                </div>

                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10 w-full">
                    
                    {/* Left Side: Mascot and Speech Bubble */}
                    <div className="flex flex-col md:flex-row items-center gap-6 pl-[116px] xs:pl-32 md:pl-48 lg:pl-56 xl:pl-72">
                        
                        {/* Speech Bubble Wrap */}
                        <div className="flex flex-row items-end gap-3 shrink-0 relative w-full md:w-auto justify-start">
                            {/* Speech Bubble containing welcome message */}
                            <div 
                                onClick={() => setIsAssistantOpen(true)}
                                className={`bg-[#F2F2F2] rounded-2xl p-3 sm:p-4 shadow-lg text-left w-full max-w-[210px] xs:max-w-[250px] sm:max-w-[340px] relative border cursor-pointer transition-[transform,border-color,box-shadow,ring] duration-300 ${
                                    isAssistantOpen 
                                        ? 'border-[#38BDF2] ring-4 ring-[#38BDF2]/20 scale-[1.02]' 
                                        : 'border-[#E8E8E8] hover:border-[#38BDF2]/30 hover:scale-[1.01]'
                                }`}
                                style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.05))' }}
                            >
                                {/* Speech bubble pointing left tail (visible on both mobile and desktop) */}
                                <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-[#F2F2F2] border-b-8 border-b-transparent" />
                                
                                <p className="text-[11px] font-black text-[#38BDF2] mb-0.5 leading-none">Volt</p>
                                <p className="text-[10px] text-[#2E2E2F]/70 font-semibold leading-relaxed">
                                    {getDynamicMascotGreeting()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Counter (Hidden on mobile for clean Tarsi-style thin stripe, visible on md: screens and up) */}
                    <div className="hidden md:flex gap-8 shrink-0 justify-center xl:justify-end border-t xl:border-t-0 xl:border-l border-white/20 pt-6 xl:pt-0 xl:pl-8">
                        <div className="text-center group">
                            <p className={`text-white text-5xl font-black leading-none mb-3 transition-all duration-700 ${loadingStats ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
                                {stats.liveEventsCount}
                            </p>
                            <p className="text-[10px] uppercase font-black text-white tracking-[0.25em] opacity-60 group-hover:opacity-100 transition-opacity">Live Events</p>
                        </div>
                        <div className="w-px h-14 bg-white/20 self-center" />
                        <div className="text-center group">
                            <p className={`text-white text-5xl font-black leading-none mb-3 transition-all duration-700 delay-100 ${loadingStats ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
                                {stats.ticketsSold}
                            </p>
                            <p className="text-[10px] uppercase font-black text-white tracking-[0.25em] opacity-60 group-hover:opacity-100 transition-opacity">Tickets</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Limits and Current Plan Section */}
            {organizerProfile && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Current Plan Card */}
                    <div className="bg-surface border-2 border-sidebar-border rounded-xl p-6 flex flex-col justify-between min-h-[160px] shadow-sm transition-all hover:border-[#38BDF2]/30">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#2E2E2F] dark:text-white mb-2">Current Plan</p>
                            <p className="text-2xl font-black text-[#2E2E2F] dark:text-white tracking-tight">{organizerProfile.plan?.name || 'No Active Plan'}</p>
                            <p className="text-[10px] text-[#2E2E2F] dark:text-white font-medium mt-2">{organizerProfile.plan?.description || (organizerProfile?.currentPlanId ? 'Basic events only' : 'Please select a plan to begin')}</p>
                        </div>
                        {!organizerProfile?.currentPlanId && (
                            <Button
                                onClick={() => setIsUpgradeModalOpen(true)}
                                className="mt-4 w-full bg-[#38BDF2] text-white font-black text-[10px] uppercase tracking-wider"
                            >
                                Upgrade Plan
                            </Button>
                        )}
                    </div>

                    {/* Paid Events Limit Widget */}
                    <div className="bg-surface border-2 border-sidebar-border rounded-xl p-6 flex flex-col justify-between min-h-[160px] shadow-sm transition-all hover:border-[#38BDF2]/30">
                        {organizerProfile && (() => {
                            const pricedLimit = Number(organizerProfile.plan?.limits?.max_priced_events || organizerProfile.plan?.max_priced_events || organizerProfile.plan?.maxPricedEvents || 0);
                            const usedCount = stats.paidEventsCount;

                            return (
                                <>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-2.5 bg-[#38BDF2] rounded-xl shadow-[0_8px_16px_-4px_rgba(56,189,242,0.4)]">
                                            <ICONS.CreditCard className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[#2E2E2F] dark:text-white">Paid Events Used</p>
                                            <p className="text-lg font-black text-[#2E2E2F] dark:text-white">
                                                {usedCount} / {pricedLimit}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="w-full h-2 bg-[#2E2E2F]/10 dark:bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${usedCount >= pricedLimit
                                                    ? 'bg-[#2E2E2F]/20'
                                                    : 'bg-[#38BDF2]'
                                                    }`}
                                                style={{ width: `${Math.min(100, (usedCount / (pricedLimit || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[9px] font-bold text-[#2E2E2F] dark:text-white mt-2 uppercase tracking-tight">
                                            {pricedLimit === 0
                                                ? 'No paid events allowed on current plan'
                                                : `${Math.max(0, pricedLimit - usedCount)} paid events remaining`}
                                        </p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Email Quota Widget */}
                    {emailQuota && (
                        <div className="bg-surface border-sidebar-border border-2 rounded-xl p-6 flex flex-col justify-between min-h-[160px] shadow-sm transition-all hover:border-[#38BDF2]/30">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-[#38BDF2] rounded-xl shadow-[0_8px_16px_-4px_rgba(56,189,242,0.4)]">
                                    <ICONS.Mail className="w-5 h-5 text-white" strokeWidth={2} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#2E2E2F] dark:text-white">Email Quota</p>
                                    <p className="text-lg font-black text-[#2E2E2F] dark:text-white">
                                        {organizerProfile?.currentPlanId ? emailQuota.remaining : '0'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-[#2E2E2F] dark:text-white mb-2">
                                    {organizerProfile?.currentPlanId ? `${emailQuota.sent}/${emailQuota.limit}` : 'No Active Plan'}
                                </p>
                                {organizerProfile?.currentPlanId ? (
                                    <div className="space-y-3">
                                        <div className="w-full h-2 bg-[#2E2E2F]/10 dark:bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${emailQuota.canSend ? 'bg-[#2E2E2F]/40' : 'bg-red-500'}`}
                                                style={{ width: `${Math.min(100, (emailQuota.sent / emailQuota.limit) * 100)}%` }}
                                            />
                                        </div>
                                        {!emailQuota.canSend && (
                                            <button
                                                onClick={() => setIsUpgradeModalOpen(true)}
                                                className="w-full py-2 bg-red-500 hover:bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors"
                                            >
                                                Upgrade Plan
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full h-2 bg-[#2E2E2F]/5 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-[#2E2E2F]/10 dark:bg-white/10 w-full" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Promoted Events Countdown Timer */}
            {promotedEvents.length > 0 && (
                <div className="bg-surface border-2 border-sidebar-border rounded-xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b-2 border-[#2E2E2F]/5 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#38BDF2] flex items-center justify-center text-white shadow-[0_8px_16px_-4px_rgba(56,189,242,0.4)]">
                                <ICONS.TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-[#2E2E2F] dark:text-white tracking-tight">Promoted Events</h3>
                                <p className="text-[9px] font-bold text-[#2E2E2F] dark:text-white/40 mt-0.5 uppercase tracking-widest">Live on Discovery Hub</p>
                            </div>
                        </div>
                        <span className="text-[9px] font-black text-[#38BDF2] bg-[#38BDF2]/10 px-3 py-1.5 rounded-full border border-[#38BDF2]/20 uppercase tracking-widest animate-pulse">LIVE</span>
                    </div>
                    <div className="divide-y divide-[#2E2E2F]/5 dark:divide-white/5">
                        {promotedEvents.map((promo: any) => {
                            const expiresAt = new Date(promo.expiresAt);
                            const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
                            const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                            const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
                            const totalDuration = (promo.durationDays || 7) * 24 * 60 * 60 * 1000;
                            const elapsed = totalDuration - remainingMs;
                            const progressPct = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 100;
                            const isExpiring = days === 0 && hours < 12;
                            const isExpired = remainingMs <= 0;

                            return (
                                <div key={promo.promotionId} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#38BDF2]/5 transition-colors">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#38BDF2] to-[#38BDF2]/80 flex items-center justify-center text-white shadow-md shrink-0 text-base font-black">
                                            {promo.eventName?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-sm text-[#2E2E2F] dark:text-white truncate">{promo.eventName}</p>
                                            <p className="text-[9px] font-bold text-[#2E2E2F] dark:text-white/40 dark:text-white/40 mt-0.5 uppercase tracking-wide">
                                                Expires {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        {/* Progress bar */}
                                        <div className="w-28 h-1.5 bg-[#2E2E2F]/10 dark:bg-white/10 dark:bg-white/10 rounded-full overflow-hidden hidden md:block">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${
                                                    isExpired ? 'bg-red-400' : isExpiring ? 'bg-amber-400' : 'bg-[#38BDF2]'
                                                }`}
                                                style={{ width: `${100 - progressPct}%` }}
                                            />
                                        </div>
                                        {/* Countdown digits */}
                                        {isExpired ? (
                                            <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 uppercase tracking-widest">PROMOTED DONE</span>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                {days > 0 && (
                                                    <>
                                                <div className="flex flex-col items-center px-2 py-1 bg-background rounded-lg min-w-[38px]">
                                                            <span className={`text-base font-black leading-none ${isExpiring ? 'text-amber-500' : 'text-[#2E2E2F] dark:text-white'}`}>{days}</span>
                                                            <span className="text-[7px] font-bold text-[#2E2E2F] dark:text-white/30 dark:text-white/30 uppercase tracking-wider">day{days !== 1 ? 's' : ''}</span>
                                                        </div>
                                                        <span className="text-[#2E2E2F] dark:text-white/15 dark:text-white/15 font-black text-xs">:</span>
                                                    </>
                                                )}
                                                <div className="flex flex-col items-center px-2 py-1 bg-[#2E2E2F]/5 dark:bg-white/5 dark:bg-white/5 rounded-lg min-w-[38px]">
                                                    <span className={`text-base font-black leading-none ${isExpiring ? 'text-amber-500' : 'text-[#2E2E2F] dark:text-white dark:text-white'}`}>{String(hours).padStart(2, '0')}</span>
                                                    <span className="text-[7px] font-bold text-[#2E2E2F] dark:text-white/30 dark:text-white/30 uppercase tracking-wider">hrs</span>
                                                </div>
                                                <span className="text-[#2E2E2F] dark:text-white/15 dark:text-white/15 font-black text-xs">:</span>
                                                <div className="flex flex-col items-center px-2 py-1 bg-[#2E2E2F]/5 dark:bg-white/5 dark:bg-white/5 rounded-lg min-w-[38px]">
                                                    <span className={`text-base font-black leading-none ${isExpiring ? 'text-amber-500' : 'text-[#2E2E2F] dark:text-white dark:text-white'}`}>{String(minutes).padStart(2, '0')}</span>
                                                    <span className="text-[7px] font-bold text-[#2E2E2F] dark:text-white/30 dark:text-white/30 uppercase tracking-wider">min</span>
                                                </div>
                                                <span className="text-[#2E2E2F] dark:text-white/15 dark:text-white/15 font-black text-xs">:</span>
                                                <div className="flex flex-col items-center px-2 py-1 bg-[#2E2E2F]/5 dark:bg-white/5 dark:bg-white/5 rounded-lg min-w-[38px]">
                                                    <span className={`text-base font-black tabular-nums leading-none ${isExpiring ? 'text-amber-500' : 'text-[#2E2E2F] dark:text-white dark:text-white'}`}>{String(seconds).padStart(2, '0')}</span>
                                                    <span className="text-[7px] font-bold text-[#2E2E2F] dark:text-white/30 dark:text-white/30 uppercase tracking-wider">sec</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Create First Event Card */}
                <div
                    className="group relative bg-surface border-2 border-sidebar-border rounded-xl p-8 flex flex-col items-start transition-all duration-300 hover:border-[#38BDF2]/40 hover:bg-[#38BDF2]/5 dark:hover:bg-[#38BDF2]/5 hover:shadow-[0_20px_40px_-20px_rgba(56,189,242,0.15)] hover:-translate-y-1"
                    onClick={() => navigate('/my-events/create')}
                >
                    <div className="w-14 h-14 rounded-xl bg-[#38BDF2] text-white flex items-center justify-center mb-8 shadow-[0_10px_20px_-5px_rgba(56,189,242,0.3)] transition-all">
                        <ICONS.Plus className="w-8 h-8 stroke-[3]" />
                    </div>
                    <h2 className="text-2xl font-black text-[#2E2E2F] dark:text-white dark:text-white tracking-tight mb-3">Create First Event</h2>
                    <p className="text-[#2E2E2F] dark:text-white dark:text-white/70 font-medium leading-relaxed mb-8 flex-1">
                        Follow the organizer workflow: complete your identity, set up your organization profile, pick a subscription plan, save your event as a draft, then add tickets before finally publishing.
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-black text-[#2E2E2F] dark:text-white dark:text-white tracking-[0.2em] group-hover:text-[#38BDF2] transition-colors">
                        Start Wizard <ICONS.ChevronRight className="w-4 h-4" />
                    </div>
                </div>

                {/* Manage Events Card */}
                <div
                    className="group relative bg-[#F2F2F2] dark:bg-[#111111] dark:bg-[#111111] border-2 border-[#2E2E2F]/5 dark:border-white/5 dark:border-white/10 rounded-xl p-8 flex flex-col items-start transition-all duration-300 hover:border-[#38BDF2]/40 hover:bg-[#38BDF2]/5 dark:hover:bg-[#38BDF2]/5 hover:shadow-[0_20px_40px_-20px_rgba(56,189,242,0.15)] hover:-translate-y-1"
                    onClick={() => navigate('/my-events')}
                >
                    <div className="w-14 h-14 rounded-xl bg-[#38BDF2] text-white flex items-center justify-center mb-8 shadow-[0_10px_20px_-5px_rgba(56,189,242,0.3)] transition-all">
                        <ICONS.Calendar className="w-7 h-7 stroke-[2]" />
                    </div>
                    <h2 className="text-2xl font-black text-[#2E2E2F] dark:text-white tracking-tight mb-3">Manage My Events</h2>
                    <p className="text-[#2E2E2F] dark:text-white dark:text-white/70 font-medium leading-relaxed mb-8 flex-1">
                        View, edit, and track the performance of all your existing events. Stay on top of registrations.
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-black text-[#2E2E2F] dark:text-white dark:text-white tracking-[0.2em] group-hover:text-[#38BDF2] transition-colors">
                        Open Library <ICONS.ChevronRight className="w-4 h-4" />
                    </div>
                </div>

                {/* Help & Support Card */}
                <div
                    className="group relative bg-[#F2F2F2] dark:bg-[#111111] dark:bg-[#111111] border-2 border-[#2E2E2F]/5 dark:border-white/5 dark:border-white/10 rounded-xl p-8 flex flex-col items-start transition-all duration-300 hover:border-[#38BDF2]/40 hover:bg-[#38BDF2]/5 dark:hover:bg-[#38BDF2]/5 hover:shadow-[0_20px_40px_-20px_rgba(56,189,242,0.15)] hover:-translate-y-1"
                    onClick={() => navigate('/organizer-support')}
                >
                    <div className="w-14 h-14 rounded-xl bg-[#38BDF2] text-white flex items-center justify-center mb-8 shadow-[0_10px_20px_-5px_rgba(56,189,242,0.3)] transition-all">
                        <ICONS.MessageSquare className="w-7 h-7 stroke-[2]" />
                    </div>
                    <h2 className="text-2xl font-black text-[#2E2E2F] dark:text-white tracking-tight mb-3">Help & Support</h2>
                    <p className="text-[#2E2E2F] dark:text-white dark:text-white/70 font-medium leading-relaxed mb-8 flex-1">
                        Need assistance? Our support team is here to help you optimize your event operations and resolve any technical issues.
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-black text-[#2E2E2F] dark:text-white dark:text-white tracking-[0.2em] group-hover:text-[#38BDF2] transition-colors">
                        Open Support <ICONS.ChevronRight className="w-4 h-4" />
                    </div>
                </div>
            </div>


            {/* Create Event Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Initialize Event"
                size="lg"
            >
                <form onSubmit={handleSubmit}>
                    {/* Live Preview / Hero Section - Edge-to-Edge Cover Highlight */}
                    <div className="relative aspect-video -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-10 overflow-hidden border-b-[5px] border-[#38BDF2] bg-[#2E2E2F] group shadow-2xl transition-all duration-700 select-none">
                        {formData.imageUrl ? (
                            <img src={getImageUrl(formData.imageUrl)} alt="Event preview" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2E2E2F] to-[#2E2E2F]/90">
                                <ICONS.Image className="w-16 h-16 text-white/10" />
                            </div>
                        )}
                        <div className="absolute inset-0 p-8 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                            <h3 className="text-3xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
                                {formData.eventName || 'Session Identity'}
                            </h3>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white text-xs font-bold uppercase tracking-tight">
                                    <ICONS.Calendar className="w-4 h-4 text-[#38BDF2]" />
                                    {formData.eventDate ? new Date(`${formData.eventDate}T${formData.eventTime}`).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Setting Date...'}
                                </div>
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white text-xs font-bold uppercase tracking-tight">
                                    <ICONS.MapPin className="w-4 h-4 text-[#38BDF2]" />
                                    <span className="truncate max-w-[150px]">{formData.location || 'Defining Venue...'}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                        >
                            Change Key Art
                        </button>
                    </div>

                    <div className="px-4 sm:px-6 pb-6 space-y-10">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <Input
                                            label="What's the name of this session?"
                                            placeholder="e.g. Founders Workshop 2026"
                                            value={formData.eventName}
                                            onChange={(e: any) => setFormData({ ...formData, eventName: e.target.value })}
                                        />
                                    </div>
                                    <div className="w-1/3">
                                        <label className="block text-[11px] font-black uppercase tracking-widest text-[#2E2E2F] dark:text-white mb-2.5">Status</label>
                                        <select
                                            className="w-full px-4 py-[13.5px] bg-[#F2F2F2] dark:bg-[#111111] border-2 border-[#2E2E2F]/10 dark:border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest outline-none focus:border-[#38BDF2] transition-colors appearance-none"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as EventStatus })}
                                        >
                                            <option value="PUBLISHED">Go Live</option>
                                            <option value="DRAFT">Dev Only</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-widest text-[#2E2E2F] dark:text-white mb-2.5">The Narrative</label>
                                    <textarea
                                        className="w-full px-5 py-4 bg-[#F2F2F2] dark:bg-[#111111] border-2 border-[#2E2E2F]/10 dark:border-white/10 rounded-xl text-sm min-h-[140px] focus:border-[#38BDF2] transition-colors outline-none resize-none"
                                        placeholder="Tell the story of your event..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <Input label="Kickoff Date" type="date" value={formData.eventDate} onChange={(e: any) => setFormData({ ...formData, eventDate: e.target.value })} />
                                <Input label="Kickoff Time" type="time" value={formData.eventTime} onChange={(e: any) => setFormData({ ...formData, eventTime: e.target.value })} />
                            </div>
                            <div className="space-y-6">
                                <Input label="Wrap Up Date" type="date" value={formData.endDate} onChange={(e: any) => setFormData({ ...formData, endDate: e.target.value })} />
                                <Input label="Wrap Up Time" type="time" value={formData.endTime} onChange={(e: any) => setFormData({ ...formData, endTime: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-black uppercase tracking-widest text-[#2E2E2F] dark:text-white mb-2.5">Operational Presence</label>
                                <div className="flex gap-4">
                                    {['ONSITE', 'ONLINE', 'HYBRID'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, locationType: type as any })}
                                            className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.locationType === type
                                                ? 'bg-[#2E2E2F] border-[#2E2E2F] text-white shadow-lg'
                                                : 'bg-[#F2F2F2] dark:bg-[#111111] border-[#2E2E2F]/5 dark:border-white/5 text-[#2E2E2F] dark:text-white hover:bg-[#2E2E2F]/5 dark:bg-white/5'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <Input
                                    label="Venue Identity / Digital Access Point"
                                    placeholder="Where is the action happening?"
                                    value={formData.location}
                                    onChange={(e: any) => applyLocationValue(e.target.value)}
                                />
                            </div>

                            {formData.locationType === 'ONSITE' && (
                                <div className="md:col-span-2">
                                    <OnsiteLocationAssistant value={formData.location} onChange={applyLocationValue} />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-6 pt-10 border-t-2 border-[#2E2E2F]/5 dark:border-white/5">
                            <Button
                                className="flex-1 min-h-[56px] text-[#2E2E2F] dark:text-white bg-transparent border-2 border-[#2E2E2F]/10 dark:border-white/10 hover:bg-[#2E2E2F]/5 dark:bg-white/5 hover:border-[#2E2E2F]/20"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Abort
                            </Button>
                            <Button
                                type="submit"
                                className="flex-[2] min-h-[56px] bg-[#38BDF2] text-white shadow-[0_20px_40px_-10px_rgba(56,189,242,0.4)] hover:bg-[#2E2E2F] transition-all"
                                disabled={submitting}
                            >
                                {submitting ? 'Propagating...' : 'Initialize Session'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
            <PlanUpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                organizerName={organizerProfile?.organizerName || ''}
                currentPlanId={organizerProfile?.currentPlanId}
                onSubscribeSuccess={() => {
                    showToast('success', 'Plan upgraded successfully!');
                    // Refresh data after upgrade
                    setTimeout(() => window.location.reload(), 1500);
                }}
            />
            <SupportCenter
                isOpen={isSupportCenterOpen}
                onClose={() => setIsSupportCenterOpen(false)}
                organizerName={organizerProfile?.organizerName || ''}
            />

            {/* Premium Floating AI Assistant Modal Widget */}
            {isAssistantOpen && createPortal(
                <>
                    {/* Dark glass backdrop overlay */}
                    <div 
                        className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[2px] z-[9999] animate-in fade-in duration-200"
                        onClick={() => setIsAssistantOpen(false)}
                    />
                    
                    {/* Floating Chat Modal Box */}
                    <div 
                        className="fixed bottom-0 sm:bottom-6 right-0 sm:right-6 left-0 sm:left-auto w-full sm:w-[340px] h-[85vh] sm:h-[550px] bg-[#F2F2F2] dark:bg-[#09090B] border-t-2 sm:border-2 border-[#2E2E2F]/10 dark:border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.08),0_20px_50px_rgba(0,0,0,0.15)] z-[10000] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-24 sm:slide-in-from-bottom-12 duration-300"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-[#2E2E2F]/10 dark:border-white/10 flex items-center justify-between bg-[#F2F2F2]/60 dark:bg-black/40">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-[#38BDF2]/10 dark:bg-[#38BDF2]/20 p-0.5 flex items-center justify-center border border-[#38BDF2]/20">
                                    <img src="/mascot.png?v=3" alt="Volt Avatar" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-[#2E2E2F] dark:text-white tracking-tight leading-none mb-0.5">Volt</h3>
                                    <p className="text-[8px] uppercase tracking-widest text-[#38BDF2] font-black">AI Co-Pilot</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setIsAssistantOpen(false)}
                                className="w-8 h-8 rounded-lg bg-[#2E2E2F]/5 dark:bg-white/5 flex items-center justify-center text-[#2E2E2F] dark:text-white hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Message History */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
                            {assistantMessages.map((msg, index) => (
                                <div 
                                    key={index}
                                    className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    {msg.sender === 'volt' && (
                                        <div className="w-7 h-7 rounded-lg bg-[#38BDF2]/10 dark:bg-[#38BDF2]/20 p-0.5 shrink-0 flex items-center justify-center border border-[#38BDF2]/15">
                                            <img src="/mascot.png?v=3" alt="Volt" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    
                                    <div className="max-w-[82%] space-y-1">
                                        <div 
                                            className={`rounded-2xl p-3 text-xs font-semibold leading-relaxed shadow-sm border ${
                                                msg.sender === 'user' 
                                                    ? 'bg-[#38BDF2] text-white border-[#38BDF2]' 
                                                    : 'bg-[#F2F2F2] dark:bg-[#18181B] text-[#2E2E2F] dark:text-white border-[#2E2E2F]/5 dark:border-white/5'
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                        <p className={`text-[8px] font-black uppercase text-[#2E2E2F]/30 dark:text-white/30 tracking-wider ${msg.sender === 'user' ? 'text-right' : ''}`}>
                                            {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            
                            {/* Volt Typing Indicator */}
                            {isVoltTyping && (
                                <div className="flex items-start gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-[#38BDF2]/10 dark:bg-[#38BDF2]/20 p-0.5 shrink-0 flex items-center justify-center border border-[#38BDF2]/15">
                                        <img src="/mascot.png?v=3" alt="Volt" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="bg-[#F2F2F2] dark:bg-[#18181B] rounded-2xl p-3 border border-[#2E2E2F]/5 dark:border-white/5 shadow-sm flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-[#38BDF2] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-[#38BDF2] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-[#38BDF2] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggestion Chips */}
                        <div className="px-4 py-2 border-t border-[#2E2E2F]/10 dark:border-white/10 flex flex-wrap gap-1.5 bg-[#F2F2F2]/60 dark:bg-black/20">
                            <button 
                                onClick={() => handleSendAssistantMessage('Analyze my sales metrics')}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#18181B] text-[9px] font-black text-[#2E2E2F] dark:text-white border border-[#2E2E2F]/10 dark:border-white/10 hover:border-[#38BDF2]/30 hover:text-[#38BDF2] transition-colors"
                            >
                                📊 Analyze Sales
                            </button>
                            <button 
                                onClick={() => handleSendAssistantMessage('Draft a new event announcement')}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#18181B] text-[9px] font-black text-[#2E2E2F] dark:text-white border border-[#2E2E2F]/10 dark:border-white/10 hover:border-[#38BDF2]/30 hover:text-[#38BDF2] transition-colors"
                            >
                                📢 Draft Announcement
                            </button>
                            <button 
                                onClick={() => handleSendAssistantMessage('What is your pricing advice?')}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#18181B] text-[9px] font-black text-[#2E2E2F] dark:text-white border border-[#2E2E2F]/10 dark:border-white/10 hover:border-[#38BDF2]/30 hover:text-[#38BDF2] transition-colors"
                            >
                                💡 Pricing Strategy
                            </button>
                        </div>

                        {/* Input Footer */}
                        <div className="p-4 border-t border-[#2E2E2F]/10 dark:border-white/10 bg-[#F2F2F2]/60 dark:bg-black/40">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={assistantInput}
                                    onChange={(e) => setAssistantInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSendAssistantMessage();
                                    }}
                                    placeholder="Ask Volt..."
                                    className="flex-1 bg-white dark:bg-[#18181B] border border-[#2E2E2F]/10 dark:border-white/10 rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:border-[#38BDF2]/50 text-[#2E2E2F] dark:text-white"
                                />
                                <button 
                                    onClick={() => handleSendAssistantMessage()}
                                    className="px-3 bg-[#38BDF2] text-white rounded-xl hover:bg-[#2E2E2F] transition-all flex items-center justify-center shadow-md shadow-[#38BDF2]/10"
                                >
                                    <ICONS.ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            , document.body)}
        </div>
    );
};

