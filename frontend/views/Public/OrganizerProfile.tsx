
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { OrganizerProfile as IOrganizerProfile, Event } from '../../types';
import { Button, PageLoader, Card } from '../../components/Shared';
import { ICONS } from '../../constants';
import { useUser } from '../../context/UserContext';
import { useEngagement } from '../../context/EngagementContext';

// Helper to handle JSONB image format
const getImageUrl = (img: any): string => {
    if (!img) return 'https://via.placeholder.com/800x400';
    if (typeof img === 'string') return img;
    return img.url || img.path || img.publicUrl || 'https://via.placeholder.com/800x400';
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

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                const [orgData, eventData] = await Promise.all([
                    apiService.getOrganizerById(id),
                    apiService.getEvents(1, 100, '', '', id)
                ]);
                setOrganizer(orgData);
                setEvents(eventData.events || []);
            } catch (error) {
                console.error('Failed to load organizer profile:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        if (!interactionNotice) return;
        const timeoutId = window.setTimeout(() => setInteractionNotice(''), 2200);
        return () => window.clearTimeout(timeoutId);
    }, [interactionNotice]);

    if (loading) return <PageLoader label="Loading profile..." />;
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

    const organizerImage = getImageUrl(organizer.profileImageUrl);
    const organizerInitial = (organizer.organizerName || 'O').charAt(0).toUpperCase();

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
            {/* Header Section */}
            <div className="mb-12">
                <button
                    onClick={() => navigate(-1)}
                    className="text-[#2E2E2F] hover:text-[#38BDF2] text-[11px] font-black tracking-widest uppercase flex items-center mb-8 gap-2 transition-colors"
                >
                    <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                    BACK
                </button>

                <div className="bg-[#F2F2F2] rounded-[2.5rem] border border-[#2E2E2F]/10 p-8 lg:p-12">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                        <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden bg-[#2E2E2F] text-[#F2F2F2] flex items-center justify-center text-4xl font-bold shrink-0 border-4 border-white shadow-xl">
                            {organizer.profileImageUrl ? (
                                <img src={organizerImage} alt={organizer.organizerName} className="w-full h-full object-cover" />
                            ) : (
                                organizerInitial
                            )}
                        </div>

                        <div className="flex-1">
                            <h1 className="text-4xl lg:text-5xl font-black text-[#2E2E2F] tracking-tighter leading-tight mb-4">
                                {organizer.organizerName}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 mb-6">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest font-black text-[#2E2E2F]/50 mb-1">Followers</p>
                                    <p className="text-2xl font-black text-[#2E2E2F]">{formatCompactCount(organizer.followersCount)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest font-black text-[#2E2E2F]/50 mb-1">Events Hosted</p>
                                    <p className="text-2xl font-black text-[#2E2E2F]">{organizer.eventsHostedCount || 0}</p>
                                </div>
                            </div>

                            {organizer.bio && (
                                <p className="text-[#2E2E2F]/70 text-base font-medium leading-relaxed max-w-2xl whitespace-pre-wrap mb-6">
                                    {organizer.bio}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                <button
                                    onClick={handleFollow}
                                    className={`px-8 py-3 rounded-xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${following
                                        ? 'bg-[#00E6FF] text-white shadow-lg'
                                        : 'bg-[#00D4FF] text-white hover:bg-[#00E6FF] shadow-lg shadow-[#00D4FF]/20'
                                        }`}
                                >
                                    {following ? 'Following' : 'Follow'}
                                </button>
                                {organizer.websiteUrl && (
                                    <a
                                        href={organizer.websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-8 py-3 rounded-xl border border-[#2E2E2F]/10 bg-white text-[#2E2E2F] font-black text-sm hover:bg-[#F2F2F2] transition-colors"
                                    >
                                        Website
                                    </a>
                                )}
                                <div className="flex items-center gap-3 ml-2">
                                    {organizer.facebookId && (
                                        <a href={`https://facebook.com/${organizer.facebookId}`} target="_blank" rel="noopener noreferrer" className="text-[#2E2E2F]/40 hover:text-[#1877F2] transition-colors">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                        </a>
                                    )}
                                    {organizer.twitterHandle && (
                                        <a href={`https://twitter.com/${organizer.twitterHandle}`} target="_blank" rel="noopener noreferrer" className="text-[#2E2E2F]/40 hover:text-[#1DA1F2] transition-colors">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {interactionNotice && (
                        <div className="mt-8 rounded-2xl border border-[#38BDF2]/30 bg-[#38BDF2]/10 px-4 py-3 text-sm font-semibold text-[#2E2E2F]">
                            {interactionNotice}
                        </div>
                    )}
                </div>
            </div>

            {/* Events Section */}
            <div>
                <h2 className="text-2xl font-black text-[#2E2E2F] tracking-tighter mb-8">
                    Events by {organizer.organizerName}
                </h2>

                {events.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {events.map(event => (
                            <EventMiniCard key={event.eventId} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-[#F2F2F2] rounded-[2.5rem] border border-[#2E2E2F]/10">
                        <p className="text-[#2E2E2F]/50 font-bold">No public events scheduled yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const EventMiniCard: React.FC<{ event: Event }> = ({ event }) => {
    const navigate = useNavigate();
    const { isLiked, toggleLike, isAuthenticated, canLikeFollow } = useEngagement();
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
            className="group overflow-hidden border border-[#2E2E2F]/10 rounded-3xl bg-[#F2F2F2] hover:border-[#38BDF2]/40 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:scale-[1.01]"
            onClick={() => navigate(`/events/${event.slug}`)}
        >
            <div className="relative h-48">
                <img
                    src={getImageUrl(event.imageUrl)}
                    alt={event.eventName}
                    className="w-full h-full object-cover"
                />
                <button
                    onClick={handleLike}
                    className={`absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${liked ? 'bg-red-500 text-white' : 'bg-white/90 text-[#2E2E2F] border border-[#2E2E2F]/10'}`}
                >
                    <ICONS.Heart className="w-4 h-4" />
                </button>
            </div>
            <div className="p-6">
                <h3 className="text-lg font-bold text-[#2E2E2F] mb-1 line-clamp-1">{event.eventName}</h3>
                <p className="text-[10px] text-[#2E2E2F]/60 font-semibold mb-4">
                    {formatDate(event.startAt, event.timezone, { day: 'numeric', month: 'short', year: 'numeric' })} · {formatTime(event.startAt, event.timezone)}
                </p>
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-[9px] font-black text-[#2E2E2F]/40 uppercase tracking-widest truncate max-w-[150px]">{event.locationText}</span>
                    <span className="text-[#38BDF2] font-black text-[10px] uppercase tracking-widest group-hover:underline">View Details</span>
                </div>
            </div>
        </Card>
    );
};
