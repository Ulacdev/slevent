import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { OrganizerProfile as IOrganizerProfile, Event } from '../../types';
import { Button, Card } from '../../components/Shared';
import { ProfileSkeleton } from '../../components/Shared/Skeleton';
import { ICONS } from '../../constants';
import { useUser } from '../../context/UserContext';
import { useEngagement } from '../../context/EngagementContext';
import { getImageUrl } from '../../utils/imageUtils';

const getEmbedUrl = (link: string) => {
    if (!link) return null;
    const normalized = link.startsWith('http') ? link : `https://${link}`;
    if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
        const match = normalized.match(regExp);
        const videoId = (match && match[2].length === 11) ? match[2] : null;
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0` : null;
    }
    if (normalized.includes('facebook.com') || normalized.includes('fb.watch')) {
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalized)}&show_text=0&width=500&autoplay=true&mute=true`;
    }
    if (normalized.includes('vimeo.com')) {
        const match = normalized.match(/vimeo\.com\/(\d+)/);
        const videoId = match ? match[1] : null;
        return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1` : null;
    }
    return null;
};



const formatDate = (iso: string, timezone?: string, opts?: Intl.DateTimeFormatOptions) => {
    try {
        return new Intl.DateTimeFormat('en-GB', { timeZone: timezone || 'UTC', ...opts }).format(new Date(iso));
    } catch {
        return new Date(iso).toLocaleString();
    }
};

const formatTime = (iso: string, timezone?: string) => {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone || 'UTC',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(new Date(iso));
    } catch {
        return '';
    }
};

const formatCompactCount = (value: number) => (
    new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
        Math.max(0, Number(value || 0))
    )
);

export const OrganizerProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useUser();
    const { isFollowing, toggleFollowing, canLikeFollow } = useEngagement();

    const [organizer, setOrganizer] = useState<IOrganizerProfile | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [interactionNotice, setInteractionNotice] = useState('');
    const [liveEvent, setLiveEvent] = useState<Event | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                const [orgData, eventData, allLiveEvents] = await Promise.all([
                    apiService.getOrganizerById(id),
                    apiService.getEvents(1, 100, '', '', id),
                    apiService.getLiveEvents()
                ]);
                setOrganizer(orgData);
                setEvents(eventData.events || []);

                const isEmbeddableVideo = (url: string) => {
                    if (!url || !url.trim()) return false;
                    const n = url.startsWith('http') ? url : `https://${url}`;
                    return /youtube\.com|youtu\.be/.test(n) || /facebook\.com|fb\.watch|fb\.com/.test(n) || /vimeo\.com/.test(n);
                };
                const matchingLive = allLiveEvents.find(e => {
                    const isOurOrg = e.organizerId === orgData.organizerId;
                    const hasVideo = isEmbeddableVideo(e.streaming_url || '');
                    const eventNow = new Date();
                    const eventStart = new Date(e.startAt);
                    const eventEnd = e.endAt ? new Date(e.endAt) : new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
                    const isOngoing = eventNow >= eventStart && eventNow < eventEnd;
                    return isOurOrg && hasVideo && isOngoing;
                });
                setLiveEvent(matchingLive || null);
            } catch (error) {
                console.error('Failed to load organizer profile:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        if (organizer?.organizerName) {
            document.title = `${organizer.organizerName} | StartupLab`;
        }
    }, [organizer?.organizerName]);

    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const now = new Date();

    useEffect(() => {
        if (!interactionNotice) return;
        const timeoutId = window.setTimeout(() => setInteractionNotice(''), 2200);
        return () => window.clearTimeout(timeoutId);
    }, [interactionNotice]);

    if (loading) return <ProfileSkeleton />;
    if (!organizer) return (
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
            <h2 className="text-2xl font-bold text-[#2E2E2F] mb-4">Organizer profile not found</h2>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
    );

    const following = isFollowing(organizer.organizerId);

    const handleFollow = async () => {
        if (!isAuthenticated) {
            navigate('/signup');
            return;
        }
        if (!canLikeFollow) {
            setInteractionNotice('Switch to Attending mode to follow organizations.');
            return;
        }
        try {
            const { following: nextFollowing, confirmationEmailSent } = await toggleFollowing(organizer.organizerId);
            setOrganizer(prev => prev ? {
                ...prev,
                followersCount: nextFollowing ? prev.followersCount + 1 : Math.max(0, prev.followersCount - 1)
            } : null);

            const msg = nextFollowing
                ? (confirmationEmailSent ? 'Following! Check your email for confirmation.' : 'Following!')
                : 'Removed from followings.';
            setInteractionNotice(msg);
        } catch (error: any) {
            setInteractionNotice(error.message || 'Failed to update follow status.');
        }
    };

    const upcomingEvents = events.filter(e => {
        const end = e.endAt ? new Date(e.endAt) : new Date(new Date(e.startAt).getTime() + 2 * 60 * 60 * 1000);
        return end >= now;
    }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    const pastEvents = events.filter(e => {
        const end = e.endAt ? new Date(e.endAt) : new Date(new Date(e.startAt).getTime() + 2 * 60 * 60 * 1000);
        return end < now;
    }).sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

    const displayEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

    const organizerImage = getImageUrl(organizer.profileImageUrl);
    const coverImage = getImageUrl(organizer.coverImageUrl);
    const organizerInitial = (organizer.organizerName || 'O').charAt(0).toUpperCase();
    const brandColor = organizer.brandColor || '#38BDF2';
    const embedUrl = liveEvent ? getEmbedUrl(liveEvent.streaming_url || liveEvent.locationText) : null;

    return (
        <div className="bg-[#F2F2F2] min-h-screen" style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>
            <div className="max-w-[1200px] mx-auto bg-[#F2F2F2]">
                {/* Cover Photo Area - Facebook style */}
                <div className="relative w-full aspect-[3/1] lg:aspect-[3.5/1] bg-[#E5E5E5] overflow-hidden rounded-b-2xl shadow-sm border-x border-b border-[#2E2E2F]/5">
                    {liveEvent ? (
                        <div className="w-full h-full relative">
                            {embedUrl ? (
                                <iframe
                                    className="absolute inset-0 w-full h-full"
                                    src={embedUrl}
                                    title="Live Stream"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-[#F2F2F2]">
                                    <div className="flex items-center gap-3 bg-red-600 px-6 py-2.5 rounded-full border border-red-500 shadow-lg animate-pulse mb-4">
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Now</span>
                                    </div>
                                    <a
                                        href={liveEvent.streaming_url || liveEvent.locationText}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="bg-[#38BDF2] text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:scale-105 transition-transform"
                                    >
                                        View Broadcast
                                    </a>
                                </div>
                            )}
                            <div className="absolute top-6 right-8 bg-red-600 px-4 py-2 rounded-xl text-white text-[9px] font-black uppercase tracking-widest shadow-lg animate-pulse z-20">
                                LIVE
                            </div>
                        </div>
                    ) : coverImage ? (
                        <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-[#E5E5E5] flex items-center justify-center">
                            <ICONS.Image className="w-16 h-16 text-[#2E2E2F]" />
                        </div>
                    )}
                </div>

                {/* Profile Header Details - Controlled Overlap */}
                <div className="px-5 sm:px-10 pb-8">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 -mt-16 md:-mt-24 relative z-20 text-center md:text-left">
                        {/* Circle Profile Pic - Floating effect */}
                        <div className="shrink-0">
                            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-[6px] border-[#F2F2F2] overflow-hidden bg-gradient-to-br from-[#38BDF2] to-[#A5E1FF] shadow-2xl transition-transform hover:scale-105 duration-300">
                                {organizer.profileImageUrl ? (
                                    <img src={organizerImage} alt={organizer.organizerName} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-6xl font-black text-white flex h-full w-full items-center justify-center drop-shadow-2xl">{organizerInitial}</span>
                                )}
                            </div>
                        </div>
 
                        {/* Name and Stats - Pushed below the cover line visually */}
                        <div className="flex-1 pb-2 md:pt-24">
                            <h1 className="text-3xl md:text-5xl font-black text-[#2E2E2F] tracking-tighter leading-[1.1] mb-4 drop-shadow-sm">
                                {organizer.organizerName}
                            </h1>
                            {/* Mobile Only Prominent Stats */}
                            <div className="md:hidden grid grid-cols-2 gap-px bg-[#CED0D4]/50 w-full mt-6 border-y border-[#CED0D4]/50">
                                <div className="bg-[#F2F2F2] py-4 text-center">
                                    <p className="text-2xl font-black text-[#050505]">{formatCompactCount(organizer.followersCount)}</p>
                                    <p className="text-[10px] font-bold text-[#65676B] uppercase tracking-widest mt-1">Active Followers</p>
                                </div>
                                <div className="bg-[#F2F2F2] py-4 text-center">
                                    <p className="text-2xl font-black text-[#050505]">{organizer.eventsHostedCount || 0}</p>
                                    <p className="text-[10px] font-bold text-[#65676B] uppercase tracking-widest mt-1">Events Hosted</p>
                                </div>
                            </div>

                            <div className="hidden md:flex flex-wrap items-center gap-4 text-[#65676B] font-bold text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#050505] font-black">{formatCompactCount(organizer.followersCount)}</span>
                                    <span>Active Followers</span>
                                </div>
                                <div className="w-1 h-1 bg-[#65676B]/40 rounded-full hidden sm:block" />
                                <div className="flex items-center gap-2">
                                    <span className="text-[#050505] font-black">{organizer.eventsHostedCount || 0}</span>
                                    <span>Events Hosted</span>
                                </div>
                                {organizer.isVerified && (
                                    <div className="flex items-center gap-1.5 text-[#38BDF2] bg-[#38BDF2]/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        <ICONS.CheckCircle className="w-3.5 h-3.5" />
                                        Verified Community
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pb-2">
                            <button
                                onClick={handleFollow}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md bg-[#38BDF2] text-white hover:brightness-95 active:scale-95"
                            >
                                {following ? <ICONS.CheckCircle className="w-4 h-4" /> : <ICONS.Plus className="w-4 h-4 stroke-[3px]" />}
                                {following ? 'Following' : 'Follow'}
                            </button>
                            {organizer.websiteUrl && (
                                <button
                                    onClick={() => window.open(organizer.websiteUrl, '_blank')}
                                    className="p-3 bg-[#E4E6EB] text-[#050505] rounded-xl hover:bg-[#D8DADF] transition-all shadow-sm active:scale-95 flex items-center justify-center w-12 h-12 shrink-0"
                                >
                                    <ICONS.Globe className="w-5 h-5" />
                                </button>
                            )}

                            <button
                                onClick={() => window.open(organizer.facebookId ? `https://facebook.com/${organizer.facebookId.replace(/^@|\//g, '')}` : 'https://facebook.com', '_blank')}
                                className="rounded-xl transition-all shadow-md flex items-center justify-center w-12 h-12 shrink-0 bg-[#1877F2] text-white active:scale-95 hover:brightness-110 cursor-pointer"
                                title={organizer.facebookId ? `Facebook: ${organizer.facebookId}` : 'Visit Facebook'}
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                            </button>
                            
                            <button
                                onClick={() => window.open(organizer.twitterHandle ? `https://twitter.com/${organizer.twitterHandle.replace(/^@|\//g, '')}` : 'https://twitter.com', '_blank')}
                                className="rounded-xl transition-all shadow-md flex items-center justify-center w-12 h-12 shrink-0 bg-black text-white active:scale-95 hover:brightness-110 cursor-pointer"
                                title={organizer.twitterHandle ? `Twitter/X: ${organizer.twitterHandle}` : 'Visit Twitter/X'}
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
                            </button>
                            
                            <button
                                onClick={() => window.open(organizer.youtubeUrl ? organizer.youtubeUrl : 'https://youtube.com', '_blank')}
                                className="rounded-xl transition-all shadow-md flex items-center justify-center w-12 h-12 shrink-0 bg-[#FF0000] text-white active:scale-95 hover:brightness-110 cursor-pointer"
                                title={organizer.youtubeUrl ? `YouTube: ${organizer.youtubeUrl}` : 'Visit YouTube'}
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                            </button>
                        </div>
                    </div>

                    {/* Bio Section - Directly under name/profile */}
                    <div className="mt-8 mb-6 max-w-[800px]">
                        <p className="text-[15px] text-[#050505] leading-relaxed whitespace-pre-wrap font-medium">
                            {organizer.bio || 'Welcome to our official community page. Stay tuned for upcoming premium event sessions and updates.'}
                        </p>
                    </div>

                    {/* Tabs / Navigation */}
                    <div className="flex items-center gap-2 border-t border-[#CED0D4] mt-8">
                        {[
                            { id: 'upcoming', label: 'Upcoming Events', count: upcomingEvents.length },
                            { id: 'past', label: 'Past Events', count: pastEvents.length },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-4 text-sm font-black transition-all relative group flex items-center gap-2 ${activeTab === tab.id ? 'text-[#38BDF2]' : 'text-[#65676B] hover:bg-[#E4E6EB]'}`}
                            >
                                {tab.label}
                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${activeTab === tab.id ? 'bg-[#38BDF2]/10' : 'bg-[#65676B]/10'}`}>{tab.count}</span>
                                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-[#38BDF2]" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area - Tighter spacing requested */}
            <div className="max-w-[1200px] mx-auto px-5 sm:px-10 py-2">
                {interactionNotice && (
                    <div className="mb-8 p-4 rounded-xl bg-[#38BDF2]/10 border border-[#38BDF2]/30 text-[#38BDF2] text-xs font-black uppercase tracking-widest shadow-sm animate-in fade-in slide-in-from-top-2 flex items-center gap-3">
                        <ICONS.Info className="w-5 h-5 shrink-0" />
                        <span>{interactionNotice}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex items-center justify-end px-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#65676B] opacity-60">{displayEvents.length} Items Found</span>
                    </div>

                    {displayEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {displayEvents.map(event => (
                                <EventMiniCard key={event.eventId} event={event} brandColor={brandColor} isPast={activeTab === 'past'} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 text-center rounded-3xl border-4 border-dashed border-[#CED0D4] bg-[#F2F2F2]/50">
                            <div className="w-20 h-20 bg-[#E4E6EB] rounded-full flex items-center justify-center mx-auto mb-6">
                                <ICONS.Calendar className="w-10 h-10 text-[#65676B]/20" />
                            </div>
                            <h3 className="text-xl font-black text-[#050505] tracking-tighter uppercase mb-2">No results yet</h3>
                            <p className="text-[#65676B] font-bold text-sm max-w-[300px] mx-auto leading-relaxed">
                                {activeTab === 'upcoming' ? "This community hasn't scheduled any upcoming events for the near future." : "No past sessions found in the archive for this organization."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const EventMiniCard: React.FC<{ event: Event; brandColor: string; isPast?: boolean }> = ({ event, brandColor, isPast }) => {
    const navigate = useNavigate();
    const { isAuthenticated } = useUser();
    const { isLiked, toggleLike, canLikeFollow } = useEngagement();
    const liked = isLiked(event.eventId);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) { navigate('/signup'); return; }
        if (!canLikeFollow) return;
        try {
            await toggleLike(event.eventId);
        } catch (err) { }
    };

    return (
        <Card
            className="group overflow-hidden border border-[#CED0D4] rounded-2xl bg-[#F2F2F2] transition-all cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1"
            onClick={() => navigate(`/events/${event.slug}`)}
        >
            <div className="relative h-52">
                <img
                    src={getImageUrl(event.imageUrl)}
                    alt={event.eventName}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                <div className="absolute top-4 left-4 z-10">
                    <div className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md ${isPast ? 'bg-black/40 text-white' : 'bg-[#38BDF2] text-white'}`}>
                        {isPast ? 'Past Event' : 'Upcoming'}
                    </div>
                </div>

                <button
                    onClick={handleLike}
                    className={`absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-90 ${liked ? 'bg-[#38BDF2] text-white' : 'bg-white/90 text-[#050505] border border-black/5'}`}
                >
                    <ICONS.Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                </button>
            </div>
            
            <div className="p-6 space-y-4">
                <div>
                    <h3 className="text-xl font-bold text-[#050505] line-clamp-1 group-hover:text-[#38BDF2] transition-colors">{event.eventName}</h3>
                    <p className="text-[11px] font-black text-[#65676B] uppercase tracking-wider mt-1">
                        {formatDate(event.startAt, event.timezone, { day: 'numeric', month: 'short', year: 'numeric' })} · {formatTime(event.startAt, event.timezone)}
                    </p>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-[#CED0D4]/50">
                    <div className="flex items-center gap-1.5 text-[#65676B]">
                        <ICONS.MapPin className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[120px]">{event.locationText}</span>
                    </div>
                    <span className="text-[11px] font-black uppercase text-[#38BDF2] tracking-widest group-hover:mr-2 transition-all">View Detail</span>
                </div>
            </div>
        </Card>
    );
};
