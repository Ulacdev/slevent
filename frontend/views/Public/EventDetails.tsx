
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Event, TicketType, UserRole } from '../../types';
import { Button, Card, PageLoader } from '../../components/Shared';
import { ICONS } from '../../constants';
import { useUser } from '../../context/UserContext';
import { useEngagement } from '../../context/EngagementContext';

// Helper to handle JSONB image format
const getImageUrl = (img: any): string => {
  if (!img) return 'https://via.placeholder.com/800x400';
  if (typeof img === 'string') return img;
  return img.url || img.path || img.publicUrl || 'https://via.placeholder.com/800x400';
};

// Formatting helpers (use event timezone)
const formatDate = (iso: string, timezone?: string, opts?: Intl.DateTimeFormatOptions) => {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: timezone || 'UTC', ...opts }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
};

const formatRange = (startAt?: string, endAt?: string, timezone?: string) => {
  if (!startAt) return '';
  const startDate = new Date(startAt);
  const startStr = `${formatDate(startAt, timezone, { dateStyle: 'medium' })} ${formatDate(startAt, timezone, { timeStyle: 'short' })}`;
  if (!endAt) return startStr;
  const endDate = new Date(endAt);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    const endTime = formatDate(endAt, timezone, { timeStyle: 'short' });
    return `${startStr} – ${endTime}`;
  }
  const endStr = `${formatDate(endAt, timezone, { dateStyle: 'medium' })} ${formatDate(endAt, timezone, { timeStyle: 'short' })}`;
  return `${startStr} → ${endStr}`;
};

const formatCompactCount = (value: number) => (
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    Math.max(0, Number(value || 0))
  )
);

export const EventDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, role, email } = useUser();
  const {
    canLikeFollow,
    isAttendingView,
    isLiked,
    toggleLike,
    isFollowing,
    toggleFollowing
  } = useEngagement();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [interactionNotice, setInteractionNotice] = useState('');
  const [isOwnEvent, setIsOwnEvent] = useState(false);

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;

    const loadEvent = async () => {
      if (!slug) return;
      try {
        const data = await apiService.getEventBySlug(slug);
        if (!mounted) return;
        setEvent(data);
        if (data && data.ticketTypes.length > 0) {
          const initialQuantities: Record<string, number> = {};
          data.ticketTypes.forEach((ticketType) => {
            initialQuantities[ticketType.ticketTypeId] = 0;
          });
          setQuantities(initialQuantities);
        }

        // Check if the logged-in organizer owns this event
        if (data && isAuthenticated && role === UserRole.ORGANIZER) {
          try {
            const myOrg = await apiService.getMyOrganizer();
            if (myOrg && data.organizerId && myOrg.organizerId === data.organizerId) {
              setIsOwnEvent(true);
            } else {
              setIsOwnEvent(false);
            }
          } catch {
            setIsOwnEvent(false);
          }
        } else {
          setIsOwnEvent(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadEvent();
    return () => {
      mounted = false;
    };
  }, [slug, isAuthenticated, role]);

  useEffect(() => {
    if (!event?.organizerId) return;

    // Lightweight polling keeps organizer changes visible without manual page refresh.
    const intervalId = window.setInterval(async () => {
      try {
        const organizer = await apiService.getOrganizerById(event.organizerId as string);
        setEvent((prev) => (prev ? { ...prev, organizer: organizer || null } : prev));
      } catch {
        // Keep UI stable on transient network errors.
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [event?.organizerId]);

  useEffect(() => {
    if (!interactionNotice) return;
    const timeoutId = window.setTimeout(() => setInteractionNotice(''), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [interactionNotice]);

  if (loading) return <PageLoader label="Loading event details..." />;
  if (!event) return <div className="p-20 text-center text-[#2E2E2F]/60">Session not found.</div>;

  const updateQuantity = (ticketTypeId: string, change: number, available: number) => {
    setQuantities(prev => ({
      ...prev,
      [ticketTypeId]: Math.max(0, Math.min((Number(prev[ticketTypeId]) || 0) + change, available))
    }));
  };

  const totalQuantity = (Object.values(quantities) as number[]).reduce((acc: number, q: number) => acc + q, 0);
  const grandTotal = event.ticketTypes.reduce((acc: number, t: TicketType) => acc + (t.priceAmount * (Number(quantities[t.ticketTypeId]) || 0)), 0);

  // Registration window
  const now = new Date();
  const regOpen = event.regOpenAt ? new Date(event.regOpenAt) : null;
  const regClose = event.regCloseAt ? new Date(event.regCloseAt) : null;
  let regState = '';
  if (regOpen && now < regOpen) {
    regState = `Opens ${formatDate(regOpen.toISOString(), event.timezone, { year: 'numeric', month: 'short', day: 'numeric' })}`;
  } else if (regClose && now > regClose) {
    regState = 'Registration closed';
  } else if (regClose) {
    regState = `Closes ${formatDate(regClose.toISOString(), event.timezone, { year: 'numeric', month: 'short', day: 'numeric' })}`;
  }

  const hasPhysicalLocation = (event.locationType === 'ONSITE' || event.locationType === 'HYBRID') && !!event.locationText?.trim();
  const mapEmbedUrl = hasPhysicalLocation
    ? `https://maps.google.com/maps?q=${encodeURIComponent(event.locationText.trim())}&z=15&output=embed`
    : '';
  const openMapUrl = hasPhysicalLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.locationText.trim())}`
    : '';

  const handleRegister = () => {
    if (totalQuantity > 0) {
      const selections = event.ticketTypes.filter(t => (Number(quantities[t.ticketTypeId]) || 0) > 0).map(t => ({
        id: t.ticketTypeId,
        qty: Number(quantities[t.ticketTypeId])
      }));
      const selectionParam = encodeURIComponent(JSON.stringify(selections));
      navigate(`/events/${event.slug}/register?selections=${selectionParam}`);
    }
  };

  const organizer = event.organizer;
  const organizerId = event.organizerId || organizer?.organizerId || '';
  const organizerImage = getImageUrl(organizer?.profileImageUrl);
  const organizerInitial = (organizer?.organizerName || 'O').charAt(0).toUpperCase();
  const organizerDescription = organizer?.eventPageDescription || organizer?.bio || '';
  const organizerWebsite = organizer?.websiteUrl
    ? organizer.websiteUrl
    : '';
  const facebookLink = organizer?.facebookId
    ? `https://facebook.com/${organizer.facebookId.replace(/^@/, '')}`
    : '';
  const twitterLink = organizer?.twitterHandle
    ? `https://x.com/${organizer.twitterHandle.replace(/^@/, '')}`
    : '';
  const liked = isLiked(event.eventId);
  const following = organizerId ? isFollowing(organizerId) : false;
  const organizerRestricted = isAuthenticated && role === UserRole.ORGANIZER && !isAttendingView;

  const goToSignup = () => navigate('/signup');

  const handleLike = async () => {
    if (!isAuthenticated) {
      goToSignup();
      return;
    }
    if (!canLikeFollow) {
      setInteractionNotice('Switch to Attending mode to like events.');
      return;
    }
    try {
      const nextLiked = await toggleLike(event.eventId);
      setEvent((prev) => {
        if (!prev) return prev;
        const currentCount = Number(prev.likesCount || 0);
        return {
          ...prev,
          likesCount: nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1),
        };
      });
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Unable to update like state.';
      setInteractionNotice(message);
    }
  };

  const handleShare = async () => {
    if (!isAuthenticated) {
      goToSignup();
      return;
    }
    const shareUrl = `${window.location.origin}/#/events/${event.slug}`;
    const payload = {
      title: event.eventName,
      text: `Check out this event: ${event.eventName}`,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setInteractionNotice('Event link copied to clipboard.');
      } else {
        setInteractionNotice('Sharing is not available on this browser.');
      }
    } catch {
      // User cancelled native share.
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      goToSignup();
      return;
    }
    if (!canLikeFollow) {
      setInteractionNotice('Switch to Attending mode to follow organizations.');
      return;
    }
    if (!organizerId) {
      setInteractionNotice('Organization profile is not available yet.');
      return;
    }
    try {
      const { following: nextFollowing, confirmationEmailSent } = await toggleFollowing(organizerId);
      setEvent((prev) => {
        if (!prev?.organizer) return prev;
        const currentCount = Number(prev.organizer.followersCount || 0);
        const nextCount = nextFollowing ? currentCount + 1 : Math.max(0, currentCount - 1);
        return {
          ...prev,
          organizer: {
            ...prev.organizer,
            followersCount: nextCount,
          },
        };
      });
      const msg = nextFollowing
        ? (confirmationEmailSent ? 'Following! Check your email for confirmation.' : 'Following!')
        : 'Removed from followings.';
      setInteractionNotice(msg);
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Unable to update following state.';
      setInteractionNotice(message);
    }
  };

  const likesCount = Number(event.likesCount || 0);
  const likesLabel = liked
    ? (likesCount <= 1
      ? 'You liked this event'
      : `You and ${formatCompactCount(likesCount - 1)} others`)
    : `${formatCompactCount(likesCount)} likes`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-[#2E2E2F] hover:text-[#38BDF2] text-[11px] font-black tracking-widest uppercase flex items-center mb-10 gap-2 transition-colors"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
          BACK TO EVENTS
        </button>

        <div className="flex flex-col lg:flex-row gap-16 items-start">
          <div className="flex-1 space-y-10">
            {/* Visual Header */}
            <div className="overflow-hidden rounded-[2.5rem] border border-[#2E2E2F]/10">
              <img
                src={getImageUrl(event.imageUrl)}
                alt={event.eventName}
                className="w-full aspect-video object-cover"
              />
            </div>

            {/* Event Profile */}
            <div>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                <h1 className="text-4xl lg:text-5xl font-black text-[#2E2E2F] tracking-tighter leading-tight">
                  {event.eventName}
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLike}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${liked
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-[#F2F2F2] text-[#2E2E2F] border-[#2E2E2F]/20 hover:bg-[#38BDF2]/20'
                      }`}
                    title={organizerRestricted ? 'Switch to Attending to like events' : 'Like event'}
                  >
                    <ICONS.Heart className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-10 h-10 rounded-xl border bg-[#F2F2F2] text-[#2E2E2F] border-[#2E2E2F]/20 flex items-center justify-center hover:bg-[#38BDF2]/20 transition-colors"
                    title="Share event"
                  >
                    <ICONS.Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold text-[#2E2E2F]/70">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${liked ? 'bg-red-500 text-white' : 'bg-[#2E2E2F]/10 text-[#2E2E2F]/65'}`}>
                  <ICONS.Heart className="w-3.5 h-3.5" />
                </span>
                <span>{likesLabel}</span>
              </div>
              {interactionNotice && (
                <div className="mb-4 rounded-xl border border-[#38BDF2]/30 bg-[#38BDF2]/10 px-3 py-2 text-xs font-semibold text-[#2E2E2F]">
                  {interactionNotice}
                </div>
              )}
              <div className="flex flex-wrap gap-4 mb-12">
                <div className="flex items-center text-[#2E2E2F]/80 bg-[#F2F2F2] px-4 py-2 rounded-2xl border border-[#2E2E2F]/10 text-[12px]">
                  <ICONS.Calendar className="w-4 h-4 mr-3 text-[#38BDF2]" />
                  {formatRange(event.startAt, event.endAt, event.timezone)}{event.timezone ? ` TZ: ${event.timezone}` : ''}
                </div>
                <div className="flex items-center text-[#2E2E2F]/80 bg-[#F2F2F2] px-4 py-2 rounded-2xl border border-[#2E2E2F]/10 text-[11px] font-bold">
                  <ICONS.Monitor className="w-3.5 h-3.5 mr-2 text-[#38BDF2]" />
                  {event.locationType === 'ONLINE' ? 'DIGITAL SESSION' : event.locationType === 'HYBRID' ? 'HYBRID ACCESS' : 'IN-PERSON EVENT'}
                </div>
                {event.streamingPlatform && (event.locationType === 'ONLINE' || event.locationType === 'HYBRID') && (
                  <div className="flex items-center text-[#38BDF2] bg-[#38BDF2]/5 px-4 py-2 rounded-2xl border border-[#38BDF2]/20 text-[11px] font-black tracking-wide">
                    VIA {event.streamingPlatform.toUpperCase()}
                  </div>
                )}
                <div className="flex items-center text-[#2E2E2F]/80 bg-[#F2F2F2] px-4 py-2 rounded-2xl border border-[#2E2E2F]/10 text-[11px] font-bold">
                  CAPACITY: {(event.ticketTypes || []).reduce((sum, t) => sum + (t.quantityTotal || 0), 0)}
                </div>
                {regState && (
                  <div className="flex items-center text-[#2E2E2F]/80 bg-[#F2F2F2] px-4 py-2 rounded-2xl border border-[#2E2E2F]/10 text-[11px] font-black uppercase">
                    {regState}
                  </div>
                )}
              </div>

              <div className="p-8 bg-[#F2F2F2] rounded-[2rem] border border-[#2E2E2F]/10">
                <h3 className="text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.4em] mb-6">EVENT DETAILS</h3>
                <p className="text-[#2E2E2F]/70 leading-relaxed text-base font-medium whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>

              <div className="p-8 bg-[#F2F2F2] rounded-[2rem] border border-[#2E2E2F]/10">
                <h3 className="text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.4em] mb-6">ORGANIZED BY</h3>
                <div className="rounded-[1.5rem] border border-[#2E2E2F]/10 bg-[#F2F2F2] p-5 flex flex-col md:flex-row md:items-center gap-5">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-[#2E2E2F] text-[#F2F2F2] flex items-center justify-center text-xl font-bold shrink-0">
                    {organizer?.profileImageUrl ? (
                      <img src={organizerImage} alt={organizer?.organizerName || 'Organizer'} className="w-full h-full object-cover" />
                    ) : (
                      organizerInitial
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-2xl font-black text-[#2E2E2F] tracking-tight">
                      {organizer?.organizerName || 'Organizer profile coming soon'}
                    </p>
                    <div className="flex flex-wrap items-center gap-6 mt-2 text-[#2E2E2F]/80">
                      <div>
                        <p className="text-[11px] uppercase tracking-widest font-black text-[#2E2E2F]/50">Followers</p>
                        <p className="text-2xl font-black">{organizer?.followersCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-widest font-black text-[#2E2E2F]/50">Events</p>
                        <p className="text-2xl font-black">{organizer?.eventsHostedCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-widest font-black text-[#2E2E2F]/50">Hosting</p>
                        <p className="text-2xl font-black">{organizer ? 'Active' : '--'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {organizerWebsite ? (
                      <a
                        href={organizerWebsite}
                        target="_blank"
                        rel="noreferrer"
                        className="px-8 py-3 rounded-xl border border-[#2E2E2F]/20 text-[#2E2E2F] font-black text-sm hover:bg-[#2E2E2F] hover:text-[#F2F2F2] transition-colors"
                      >
                        Contact
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-8 py-3 rounded-xl border border-[#2E2E2F]/20 text-[#2E2E2F]/40 font-black text-sm cursor-not-allowed"
                      >
                        Contact
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleFollow}
                      disabled={!organizerId}
                      className={`px-8 py-3 rounded-xl font-black text-sm transition-colors ${following
                        ? 'bg-[#00E6FF] text-white shadow-[0_0_0_1px_rgba(0,230,255,0.75),0_0_24px_rgba(0,230,255,0.55)]'
                        : organizerId
                          ? 'bg-[#00D4FF] text-white shadow-[0_0_0_1px_rgba(0,212,255,0.65),0_0_18px_rgba(0,212,255,0.4)] hover:bg-[#00E6FF]'
                          : 'bg-[#F2F2F2] text-[#2E2E2F]/40 border border-[#2E2E2F]/20 cursor-not-allowed'
                        }`}
                    >
                      {following ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>

                {(organizerDescription || organizerWebsite || facebookLink || twitterLink) && (
                  <div className="mt-5 space-y-3">
                    {organizerDescription && (
                      <p className="text-sm text-[#2E2E2F]/70 leading-relaxed whitespace-pre-wrap">{organizerDescription}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide">
                      {organizerWebsite && (
                        <a href={organizerWebsite} target="_blank" rel="noreferrer" className="text-[#38BDF2] hover:text-[#2E2E2F]">
                          Website
                        </a>
                      )}
                      {facebookLink && (
                        <a href={facebookLink} target="_blank" rel="noreferrer" className="text-[#38BDF2] hover:text-[#2E2E2F]">
                          Facebook
                        </a>
                      )}
                      {twitterLink && (
                        <a href={twitterLink} target="_blank" rel="noreferrer" className="text-[#38BDF2] hover:text-[#2E2E2F]">
                          Twitter
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {hasPhysicalLocation && (
                <div className="p-8 bg-[#F2F2F2] rounded-[2rem] border border-[#2E2E2F]/10">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.4em]">EXACT LOCATION</h3>
                    <a
                      href={openMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-black uppercase tracking-widest text-[#38BDF2] hover:text-[#2E2E2F] transition-colors"
                    >
                      Open in Maps
                    </a>
                  </div>
                  <p className="text-sm text-[#2E2E2F]/70 font-medium mb-5">{event.locationText}</p>
                  <div className="rounded-2xl overflow-hidden border border-[#2E2E2F]/10 bg-[#F2F2F2]">
                    <iframe
                      src={mapEmbedUrl}
                      title="Event location map"
                      className="w-full h-72"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Secure Access Sidebar */}
          <div className="w-full lg:w-[380px] shrink-0">
            <Card className="p-8 sticky top-10 rounded-[2.5rem] bg-[#F2F2F2] border border-[#2E2E2F]/10">
              {isOwnEvent ? (
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#38BDF2]/10 flex items-center justify-center mb-5">
                    <ICONS.Calendar className="w-8 h-8 text-[#38BDF2]" />
                  </div>
                  <h2 className="text-xl font-black text-[#2E2E2F] mb-2 tracking-tight">
                    This is your event
                  </h2>
                  <p className="text-sm text-[#2E2E2F]/50 font-medium mb-6 leading-relaxed">
                    You can't purchase tickets for your own event. Browse other events to discover sessions from other organizers.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => navigate('/browse-events')}
                  >
                    Browse Events
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-black text-[#2E2E2F] mb-8 tracking-tight">
                    Get Tickets
                  </h2>

                  <div className="space-y-5 mb-10">
                    {event.ticketTypes.map(ticket => {
                      const qty = quantities[ticket.ticketTypeId] || 0;
                      const available = ticket.quantityTotal - ticket.quantitySold;
                      const isSoldOut = available <= 0;

                      return (
                        <div
                          key={ticket.ticketTypeId}
                          className={`p-6 rounded-[1.75rem] border-2 transition-colors ${qty > 0 ? 'border-[#38BDF2] bg-[#F2F2F2]' : 'border-[#2E2E2F]/10 bg-[#F2F2F2] hover:border-[#38BDF2]/40'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[#2E2E2F] text-[13px] uppercase tracking-wider">{ticket.name}</span>
                            <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${isSoldOut ? 'bg-[#2E2E2F] text-[#F2F2F2]' : 'bg-[#38BDF2] text-[#F2F2F2]'}`}>
                              {isSoldOut ? 'SOLD OUT' : 'AVAILABLE'}
                            </span>
                          </div>
                          <div className="text-xl font-black text-[#2E2E2F] mb-6 tracking-tighter">
                            {ticket.priceAmount === 0 ? 'FREE' : <><span className="">PHP</span> <span className="font-black">{ticket.priceAmount.toLocaleString()}.00</span></>}
                          </div>

                          <div className="pt-6 border-t border-[#2E2E2F]/10 flex items-center justify-between">
                            <span className="text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em]">QUANTITY</span>
                            <div className="flex items-center gap-5">
                              <button
                                onClick={() => updateQuantity(ticket.ticketTypeId, -1, available)}
                                disabled={qty === 0}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${qty > 0 ? 'bg-[#38BDF2] text-[#F2F2F2] hover:bg-[#2E2E2F] hover:text-[#F2F2F2]' : 'bg-[#F2F2F2] text-[#2E2E2F]/40 cursor-not-allowed border border-[#2E2E2F]/10'
                                  }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M20 12H4" /></svg>
                              </button>
                              <span className="font-black text-lg text-[#2E2E2F] w-4 text-center">{qty}</span>
                              <button
                                onClick={() => updateQuantity(ticket.ticketTypeId, 1, available)}
                                disabled={isSoldOut || qty >= available}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl text-[#F2F2F2] transition-colors ${isSoldOut || qty >= available ? 'bg-[#F2F2F2] text-[#2E2E2F]/40 cursor-not-allowed border border-[#2E2E2F]/10' : 'bg-[#38BDF2] text-[#F2F2F2] hover:bg-[#2E2E2F] hover:text-[#F2F2F2]'
                                  }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-6">
                    <Button
                      className="w-full"
                      disabled={totalQuantity === 0}
                      onClick={handleRegister}
                    >
                      {totalQuantity === 0 ? 'Select Tickets' : `Reserve Access`}
                    </Button>
                    <div className="flex items-center justify-center gap-3 opacity-30">
                      <ICONS.CreditCard className="w-4 h-4" />
                      <p className="text-[10px] text-center font-black uppercase tracking-[0.4em] text-[#2E2E2F]">
                        SECURE HITPAY CHECKOUT
                      </p>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
