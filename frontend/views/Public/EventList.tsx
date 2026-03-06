import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Event, UserRole } from '../../types';
import { Card, Button, PageLoader } from '../../components/Shared';
import { BrowseEventsNavigator, BrowseTabKey, ONLINE_LOCATION_VALUE } from '../../components/BrowseEventsNavigator';
import { ICONS } from '../../constants';
import { EVENT_CATEGORIES } from '../../utils/eventCategories';
import { useUser } from '../../context/UserContext';
import { useEngagement } from '../../context/EngagementContext';
import { PricingSection } from '../../components/PricingSection';

// Helper to handle JSONB image format
const getImageUrl = (img: any): string => {
  if (!img) return 'https://via.placeholder.com/800x400';
  if (typeof img === 'string') return img;
  return img.url || img.path || img.publicUrl || 'https://via.placeholder.com/800x400';
};

// Date/time formatting with event timezone
const formatDate = (iso: string, timezone?: string, opts?: Intl.DateTimeFormatOptions) => {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: timezone || 'UTC', ...opts }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
};

const formatStartForCard = (startAt: string, timezone?: string) => {
  const d = formatDate(startAt, timezone, { month: 'short', day: 'numeric' });
  const t = formatDate(startAt, timezone, { hour: '2-digit', minute: '2-digit' });
  return `${d} • ${t}`;
};

const LOCATION_STORAGE_KEY = 'browse_events_location';
const DEFAULT_LOCATION = 'Your Location';

const getInitialBrowseLocation = (): string => {
  if (typeof window === 'undefined') return DEFAULT_LOCATION;
  return localStorage.getItem(LOCATION_STORAGE_KEY) || DEFAULT_LOCATION;
};

const getUpcomingWeekendRange = (baseDate: Date) => {
  const day = baseDate.getDay();
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  if (day === 0) {
    start.setDate(start.getDate() - 1);
  } else if (day !== 6) {
    start.setDate(start.getDate() + (6 - day));
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

function formatTime(dateString: string, timezone?: string) {
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    ...(timezone ? { timeZone: timezone } : {})
  }).replace(':00', '');
}

function formatCompactCount(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    Math.max(0, Number(value || 0))
  );
}

export const EventCard: React.FC<{
  event: Event;
  onActionNotice?: (message: string) => void;
  trendingRank?: number | null;
}> = ({ event, onActionNotice, trendingRank = null }) => {
  const navigate = useNavigate();
  const { isAuthenticated, role, name, email } = useUser();
  const {
    canLikeFollow,
    isAttendingView,
    isLiked,
    toggleLike,
    isFollowing,
    toggleFollowing
  } = useEngagement();
  const [menuOpen, setMenuOpen] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(Number(event.likesCount || 0));
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  useEffect(() => {
    setLikeCount(Number(event.likesCount || 0));
  }, [event.eventId, event.likesCount]);

  // Safe calculation for minPrice if ticketTypes exist
  const minPrice = event.ticketTypes?.length
    ? Math.min(...event.ticketTypes.map(t => t.priceAmount))
    : 0;

  const organizerId = event.organizerId || event.organizer?.organizerId || '';
  const organizerName = event.organizer?.organizerName || 'Organization';
  const pageName = (name || email?.split('@')[0] || 'My Page').trim();
  const liked = isLiked(event.eventId);
  const following = organizerId ? isFollowing(organizerId) : false;
  const organizerRestricted = isAuthenticated && role === UserRole.ORGANIZER && !isAttendingView;

  // Registration window label
  const now = new Date();
  const regOpen = event.regOpenAt ? new Date(event.regOpenAt) : null;
  const regClose = event.regCloseAt ? new Date(event.regCloseAt) : null;
  const regLabel = regOpen && now < regOpen
    ? `Opens ${formatDate(regOpen.toISOString(), event.timezone, { year: 'numeric', month: 'short', day: 'numeric' })}`
    : regClose
      ? `Closes ${formatDate(regClose.toISOString(), event.timezone, { year: 'numeric', month: 'short', day: 'numeric' })}`
      : '';

  const gotoSignup = () => navigate('/signup');

  const handleLike = async (eventClick: React.MouseEvent<HTMLButtonElement>) => {
    eventClick.stopPropagation();
    if (!isAuthenticated) {
      gotoSignup();
      return;
    }
    if (!canLikeFollow) {
      onActionNotice?.('Switch to Attending mode to like events.');
      return;
    }
    try {
      const nextLiked = await toggleLike(event.eventId);
      setLikeCount((prev) => (
        nextLiked ? prev + 1 : Math.max(0, prev - 1)
      ));
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Unable to update like state.';
      onActionNotice?.(message);
    }
  };

  const handleShare = async (eventClick: React.MouseEvent<HTMLButtonElement>) => {
    eventClick.stopPropagation();
    if (!isAuthenticated) {
      gotoSignup();
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
        onActionNotice?.('Event link copied to clipboard.');
      } else {
        onActionNotice?.('Sharing is not available on this browser.');
      }
    } catch {
      // User may cancel native share; keep silent.
    }
  };

  const handleFollow = async (eventClick: React.MouseEvent<HTMLButtonElement>) => {
    eventClick.stopPropagation();
    if (!isAuthenticated) {
      gotoSignup();
      return;
    }
    if (!canLikeFollow) {
      onActionNotice?.('Switch to Attending mode to follow organizations.');
      return;
    }
    if (!organizerId) {
      onActionNotice?.('Organization profile is not available yet.');
      return;
    }
    try {
      const { following: nextFollowing, confirmationEmailSent } = await toggleFollowing(organizerId);
      setMenuOpen(false);
      const msg = nextFollowing
        ? (confirmationEmailSent ? 'Following! Check your email for confirmation.' : 'Following!')
        : 'Removed from followings.';
      onActionNotice?.(msg);
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Unable to update following state.';
      onActionNotice?.(message);
    }
  };

  const likeLabel = liked
    ? (likeCount <= 1
      ? 'You liked this'
      : `You and ${formatCompactCount(likeCount - 1)} others`)
    : `${formatCompactCount(likeCount)} likes`;

  return (
    <Card className="group flex flex-col h-full border border-[#2E2E2F]/10 rounded-[1.35rem] overflow-hidden bg-[#F2F2F2] hover:border-[#38BDF2]/40 transition-colors cursor-pointer" onClick={() => navigate(`/events/${event.slug}`)}>
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={getImageUrl(event.imageUrl)}
          alt={event.eventName}
          className="w-full h-full object-cover"
        />
        {trendingRank ? (
          <div className="absolute top-3 left-3 rounded-full px-2.5 py-1 bg-[#38BDF2] text-white text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-[#38BDF2]/30 z-10">
            #{trendingRank} Trending
          </div>
        ) : null}
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">
          <button
            type="button"
            onClick={handleLike}
            className={`pointer-events-auto w-9 h-9 rounded-xl border backdrop-blur-sm flex items-center justify-center transition-colors ${liked
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-white/90 text-[#2E2E2F] border-[#2E2E2F]/20 hover:bg-[#38BDF2]/20'
              }`}
            title={organizerRestricted ? 'Switch to Attending to like events' : 'Like event'}
          >
            <ICONS.Heart className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="pointer-events-auto w-9 h-9 rounded-xl border bg-white/90 text-[#2E2E2F] border-[#2E2E2F]/20 backdrop-blur-sm flex items-center justify-center hover:bg-[#38BDF2]/20 transition-colors"
            title="Share event"
          >
            <ICONS.Download className="w-4 h-4" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(eventClick) => {
                eventClick.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              className="w-9 h-9 rounded-xl border bg-white/90 text-[#2E2E2F] border-[#2E2E2F]/20 backdrop-blur-sm flex items-center justify-center hover:bg-[#38BDF2]/20 transition-colors"
              title="More options"
            >
              <ICONS.MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 min-w-[220px] rounded-2xl border border-[#2E2E2F]/10 bg-[#F2F2F2] shadow-xl z-20 overflow-hidden"
                onClick={(eventClick) => eventClick.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-[#2E2E2F]/10">
                  <p className="text-[10px] uppercase tracking-widest font-black text-[#2E2E2F]/50">Page</p>
                  <p className="text-xs font-semibold text-[#2E2E2F]">{pageName}</p>
                </div>
                <div className="px-4 py-3 border-b border-[#2E2E2F]/10">
                  <p className="text-[10px] uppercase tracking-widest font-black text-[#2E2E2F]/50">Organization</p>
                  <p className="text-xs font-semibold text-[#2E2E2F]">{organizerName}</p>
                </div>
                <button
                  type="button"
                  onClick={handleFollow}
                  className="w-full text-left px-4 py-3 text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 transition-colors disabled:text-[#2E2E2F]/40 disabled:cursor-not-allowed"
                  disabled={!organizerId}
                >
                  {following ? 'Following' : 'Follow organization'}
                </button>
                {following && (
                  <button
                    type="button"
                    onClick={(eventClick) => {
                      eventClick.stopPropagation();
                      setMenuOpen(false);
                      navigate('/followings');
                    }}
                    className="w-full text-left px-4 py-3 text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 transition-colors border-t border-[#2E2E2F]/10"
                  >
                    Following list
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <h4 className="text-[#2E2E2F] text-lg font-bold tracking-tight leading-tight mb-2 line-clamp-2">
          {event.eventName}
        </h4>
        <div className="text-[#2E2E2F]/70 text-[12px] font-medium mb-2.5 line-clamp-2">
          {(event as any).summaryLine || 'Explore our latest projects, network with StartupLab founders and learn about future initiatives.'}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#2E2E2F]/70 mb-2">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center ${liked ? 'bg-red-500 text-white' : 'bg-[#2E2E2F]/10 text-[#2E2E2F]/65'}`}>
            <ICONS.Heart className="w-3 h-3" />
          </span>
          <span>{likeLabel}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] font-medium text-[#2E2E2F]/70 mb-2.5">
          <span className="text-[#38BDF2]">{(event as any).registrationCount ?? 0} registered / {(event.ticketTypes || []).reduce((sum, t) => sum + (t.quantityTotal || 0), 0)} slots</span>
          <span className="text-[#2E2E2F]/60">•</span>
          <span>{event.locationText}</span>
          <span className="text-[#2E2E2F]/60">•</span>
          <span>{formatDate(event.startAt, event.timezone, { day: 'numeric', month: 'short', year: 'numeric' })} · {formatTime(event.startAt, event.timezone)}</span>
        </div>
        <div className="text-[#2E2E2F]/70 text-[12px] font-medium mb-5 leading-relaxed">
          {(event.description || '').length > 120 ? `${event.description.slice(0, 120)}...` : event.description}
        </div>
      </div>
    </Card>
  );
};

type EventListProps = {
  mode?: 'landing' | 'events';
  listing?: 'all' | 'liked' | 'followings';
};

export const EventList: React.FC<EventListProps> = ({ mode = 'landing', listing = 'all' }) => {
  const isLanding = mode === 'landing';
  const isSpecialListing = listing !== 'all';
  const isLandingAllListing = isLanding && listing === 'all';
  const navigate = useNavigate();
  const location = useLocation();
  const { likedEventIds, followedOrganizerIds } = useEngagement();
  const [events, setEvents] = useState<Event[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [activeBrowseTab, setActiveBrowseTab] = useState<BrowseTabKey>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>(getInitialBrowseLocation);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [interactionNotice, setInteractionNotice] = useState('');
  const initialLoadRef = useRef(true);
  const requestIdRef = useRef(0);
  const likedSet = useMemo(() => new Set(likedEventIds), [likedEventIds]);
  const followedSet = useMemo(() => new Set(followedOrganizerIds), [followedOrganizerIds]);

  const serverSearchTerm = useMemo(() => {
    const searchParts = [debouncedSearch];
    if (selectedLocation !== 'Your Location' && selectedLocation !== ONLINE_LOCATION_VALUE) {
      searchParts.push(selectedLocation);
    }
    return searchParts.filter(Boolean).join(' ').trim();
  }, [debouncedSearch, selectedLocation]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);
    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.toString()) return;

    const nextSearch = (params.get('search') || '').trim();
    const locationFromQuery = (params.get('location') || '').trim();
    const nextLocation = locationFromQuery || DEFAULT_LOCATION;

    setSearchTerm(nextSearch);
    setDebouncedSearch(nextSearch);
    setSelectedLocation(nextLocation);
    setActiveBrowseTab('ALL');
    setCurrentPage(1);
  }, [location.search]);

  useEffect(() => {
    const fetchData = async () => {
      const requestId = ++requestIdRef.current;
      const pageSize = isSpecialListing ? 200 : (isLandingAllListing ? 3 : 6);
      const requestedPage = (isSpecialListing || isLandingAllListing) ? 1 : currentPage;
      if (initialLoadRef.current) {
        setLoading(true);
      } else {
        setIsFetching(true);
      }
      try {
        const data = await apiService.getEvents(requestedPage, pageSize, serverSearchTerm);
        if (requestId !== requestIdRef.current) return;
        setEvents(data.events || []);
        if (isSpecialListing) {
          setPagination({
            page: 1,
            limit: pageSize,
            total: (data.events || []).length,
            totalPages: 1,
          });
        } else {
          setPagination(data.pagination || { page: 1, limit: pageSize, total: 0, totalPages: 1 });
        }
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setIsFetching(false);
          initialLoadRef.current = false;
        }
      }
    };
    fetchData();
  }, [currentPage, isSpecialListing, isLandingAllListing, serverSearchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedLocation]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeBrowseTab]);

  useEffect(() => {
    if (!interactionNotice) return;
    const timeoutId = window.setTimeout(() => setInteractionNotice(''), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [interactionNotice]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedLocation === DEFAULT_LOCATION) {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(LOCATION_STORAGE_KEY, selectedLocation);
  }, [selectedLocation]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);
    const weekendRange = getUpcomingWeekendRange(now);

    const listingFiltered = events.filter((event) => {
      if (listing === 'liked') {
        return likedSet.has(event.eventId);
      }
      if (listing === 'followings') {
        const organizerId = event.organizerId || event.organizer?.organizerId || '';
        return !!organizerId && followedSet.has(organizerId);
      }
      return true;
    });

    const locationFiltered = listingFiltered.filter((event) => {
      if (selectedLocation === 'Your Location') return true;
      if (selectedLocation === ONLINE_LOCATION_VALUE) {
        return event.locationType === 'ONLINE' || event.locationType === 'HYBRID';
      }
      const locationNeedle = selectedLocation.toLowerCase();
      return (event.locationText || '').toLowerCase().includes(locationNeedle);
    });

    if (activeBrowseTab === 'TODAY') {
      return locationFiltered.filter((event) => {
        const eventStart = new Date(event.startAt);
        return eventStart >= todayStart && eventStart <= todayEnd;
      });
    }

    if (activeBrowseTab === 'THIS_WEEKEND') {
      return locationFiltered.filter((event) => {
        const eventStart = new Date(event.startAt);
        return eventStart >= weekendRange.start && eventStart <= weekendRange.end;
      });
    }

    if (activeBrowseTab === 'FOR_YOU') {
      return locationFiltered
        .filter((event) => {
          const availability = (event.ticketTypes || []).reduce(
            (total, type) => total + Math.max((type.quantityTotal || 0) - (type.quantitySold || 0), 0),
            0
          );
          const registrationCount = Number((event as any).registrationCount || 0);
          const daysUntilEvent = (new Date(event.startAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          const isSoon = daysUntilEvent >= 0 && daysUntilEvent <= 30;

          let score = 0;
          if (availability > 0) score += 1;
          if (registrationCount > 0) score += 1;
          if (isSoon) score += 1;
          if (selectedLocation !== 'Your Location') score += 1;

          return score >= 2;
        })
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }

    return locationFiltered;
  }, [events, activeBrowseTab, selectedLocation, listing, likedSet, followedSet]);

  const orderedEvents = useMemo(() => {
    const ranked = [...filteredEvents];
    ranked.sort((a, b) => {
      const likeDiff = Number(b.likesCount || 0) - Number(a.likesCount || 0);
      if (likeDiff !== 0) return likeDiff;
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });
    return ranked;
  }, [filteredEvents]);

  const trendingRankByEventId = useMemo(() => {
    const map = new Map<string, number>();
    if (listing !== 'all') return map;
    if (!isLanding && currentPage !== 1) return map;
    orderedEvents
      .filter((event) => Number(event.likesCount || 0) > 0)
      .slice(0, 3)
      .forEach((event, index) => {
        map.set(event.eventId, index + 1);
      });
    return map;
  }, [listing, orderedEvents, isLanding, currentPage]);

  const displayEvents = useMemo(() => {
    if (isLandingAllListing) return orderedEvents.slice(0, 3);
    return orderedEvents;
  }, [isLandingAllListing, orderedEvents]);

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const showPagination = !isLanding && !isSpecialListing && activeBrowseTab === 'ALL' && orderedEvents.length > 0 && totalPages > 1;
  const showViewAllButton = isLandingAllListing && Number(pagination.total || 0) > displayEvents.length;
  const marqueeCategories = useMemo(() => [...EVENT_CATEGORIES, ...EVENT_CATEGORIES], []);
  const sectionTitle = listing === 'liked' ? 'Liked Events' : listing === 'followings' ? 'Followed Organizations' : 'Available Events';
  const sectionSubtitle = listing === 'liked'
    ? 'Events you marked with a like.'
    : listing === 'followings'
      ? 'Latest events from organizations you follow.'
      : 'Browse and register for upcoming business seminars and workshops.';

  if (loading) return (
    <PageLoader label="Loading events..." />
  );

  return (
    <div className={`max-w-[88rem] mx-auto px-6 pb-16 ${isLanding ? 'pt-10' : 'pt-8'}`}>
      {isLanding && (
        <>
          {/* Premium Hero Section */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-14 mb-20">
            {/* Left Column: Content */}
            <div className="flex-1 min-w-0 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAFAFA] border border-[#2E2E2F]/5 text-[10px] font-bold text-[#2E2E2F] mb-7 shadow-sm">
                <span role="img" aria-label="megaphone">📢</span>
                <span className="opacity-80">New: Advanced QR Ticketing & Analytics Launched!</span>
              </div>

              <h1 className="text-4xl lg:text-6xl font-black text-[#2E2E2F] tracking-tighter leading-[1.05] mb-7">
                Smart Events for<br />
                Growing Philippine<br />
                Organizers
              </h1>

              <p className="text-[#2E2E2F]/60 text-base lg:text-lg font-medium leading-relaxed mb-8 max-w-xl">
                Manage registrations, tickets, attendee check-ins, and performance in one simple, compliance-ready event platform — built for organizers in the Philippines.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => navigate('/signup')}
                  className="px-7 py-3 bg-[#38BDF2] hover:bg-[#2E2E2F] text-[#F2F2F2] font-black uppercase tracking-widest text-[10px] h-auto rounded-xl shadow-xl shadow-[#38BDF2]/20 flex items-center gap-2 group"
                >
                  Start Free Trial
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="px-7 py-3 border border-[#2E2E2F] text-[#F2F2F2] font-black uppercase tracking-widest text-[10px] h-auto rounded-xl bg-[#2E2E2F] hover:bg-[#38BDF2] hover:border-[#38BDF2] hover:text-[#F2F2F2] flex items-center gap-2 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Sign In
                </Button>
              </div>

              <div className="mt-10 w-full max-w-[42rem] grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: 'Core Event Modules', value: '8+', sub: 'Ticketing, QR Check-in, Guest Lists, Analytics, Scheduling, CRM' },
                  { label: 'Event Expertise', value: '15+ Years', sub: 'Built with real-world event management experience' },
                  { label: 'Event Workflows', value: '30+', sub: 'From initial setup to post-event data extraction' },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-start">
                    <h2 className="text-4xl font-black text-[#2E2E2F] tracking-tighter mb-2">{stat.value}</h2>
                    <p className="text-xl font-bold text-[#2E2E2F] leading-tight mb-1.5">{stat.label}</p>
                    <p className="text-[#2E2E2F]/50 text-[13px] font-medium leading-relaxed">{stat.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Visual */}
            <div className="flex-1 relative">
              <div className="absolute -inset-8 bg-gradient-to-tr from-[#38BDF2]/10 to-transparent blur-3xl opacity-50"></div>
              <div className="relative bg-white p-1.5 rounded-[2.2rem] shadow-[0_28px_56px_-16px_rgba(46,46,47,0.15)] overflow-hidden transform lg:rotate-2 hover:rotate-0 transition-transform duration-700">
                <img
                  src="/hero-dashboard.png"
                  alt="Event Management Dashboard"
                  className="w-full h-auto rounded-[1.8rem]"
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-5 -left-5 bg-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce">
                <div className="w-9 h-9 rounded-full bg-[#38BDF2]/10 flex items-center justify-center">
                  <ICONS.CheckCircle className="w-5 h-5 text-[#38BDF2]" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2E2E2F]/40">Compliance</p>
                  <p className="text-xs font-bold text-[#2E2E2F]">Ready for 2026</p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Rail (Top of Available Events) */}
          <div className="mt-12 mb-10">
            <div className="rounded-[1.8rem] border border-[#2E2E2F]/10 bg-[#F2F2F2] px-4 py-5 md:px-7">
              <div className="flex items-center gap-4 mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2E2E2F]/60">Event Smart Categories.</p>
              </div>
              <div className="category-marquee">
                <div className="category-marquee__track">
                  {marqueeCategories.map((category, index) => (
                    <button
                      key={`${category.key}-${index}`}
                      type="button"
                      onClick={() => navigate(`/categories/${category.key.toLowerCase()}`)}
                      className="shrink-0 w-[128px] flex flex-col items-center gap-2.5 text-center group px-2"
                    >
                      <span className="w-[72px] h-[72px] rounded-full border border-transparent flex items-center justify-center text-[#2E2E2F]/70 bg-[#F2F2F2] group-hover:bg-[#38BDF2]/20 group-hover:border-[#38BDF2]/40 group-hover:text-[#2E2E2F] transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#38BDF2]/25 group-focus-visible:scale-110">
                        <category.Icon className="w-7 h-7 transition-transform duration-200 group-hover:scale-125 group-focus-visible:scale-125" />
                      </span>
                      <span className="text-[13px] font-bold text-[#2E2E2F] leading-tight min-h-[32px] flex items-center justify-center">{category.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!isLanding && (
        <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 h-[260px] sm:h-[300px] lg:h-[350px] overflow-hidden mb-8">
          <div className="absolute inset-0 bg-[linear-gradient(116deg,#38BDF2_0%,#38BDF2_44%,#F2F2F2_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,62,134,0.45)_0%,rgba(0,62,134,0.2)_34%,rgba(0,62,134,0)_72%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_32%,rgba(255,255,255,0.34),transparent_46%),linear-gradient(90deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_26%,rgba(255,255,255,0)_52%)]" />
          <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center px-5 sm:px-8">
            <div className="max-w-[720px]">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 mb-3">Event Marketplace</p>
              <h1 className="text-[2.1rem] font-black leading-none tracking-tight text-white sm:text-5xl">All Events</h1>
              <p className="mt-4 max-w-[680px] text-base leading-relaxed text-white/95 sm:text-[1.05rem]">
                Explore all published events and use the sorting controls to narrow by relevance, timing, and location context.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mb-10 rounded-[1.8rem] bg-[#F2F2F2] px-4 sm:px-5 lg:px-6 py-5 sm:py-6">
        {!isSpecialListing && (
          <BrowseEventsNavigator
            activeTab={activeBrowseTab}
            onTabChange={setActiveBrowseTab}
            selectedLocation={selectedLocation}
            onLocationSelect={setSelectedLocation}
            isLoading={isFetching}
            className="mt-0 mb-2 mx-0 sm:mx-0 lg:mx-0"
          />
        )}

        {/* Events Listing Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-2">
          <div className="flex-1">
            <h2 className="text-lg lg:text-xl font-extrabold text-[#2E2E2F] tracking-tight mb-1.5">{sectionTitle}</h2>
            <p className="text-[#2E2E2F]/50 text-[13px] font-medium">{sectionSubtitle}</p>
          </div>
          <div className="w-full lg:w-[320px]">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#2E2E2F]/30 group-focus-within:text-[#38BDF2] transition-colors">
                <ICONS.Search className="h-4 w-4" strokeWidth={3} />
              </div>
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-9 py-2.5 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl text-[12px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/20 focus:border-[#38BDF2] placeholder:text-[#2E2E2F]/30"
              />
            </div>
          </div>
        </div>
      </section>

      {interactionNotice && (
        <div className="mb-6 rounded-2xl border border-[#38BDF2]/30 bg-[#38BDF2]/10 px-4 py-3 text-sm font-semibold text-[#2E2E2F]">
          {interactionNotice}
        </div>
      )}

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 lg:gap-8">
        {displayEvents.map((event) => (
          <div key={event.eventId}>
            <EventCard
              event={event}
              onActionNotice={setInteractionNotice}
              trendingRank={trendingRankByEventId.get(event.eventId) ?? null}
            />
          </div>
        ))}
      </div>

      {/* View All Events Button (Landing page, 7+ events) */}
      {showViewAllButton && (
        <div className="mt-14 flex items-center justify-center">
          <button
            onClick={() => navigate('/browse-events')}
            className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#2E2E2F] hover:bg-[#38BDF2] text-[#F2F2F2] font-black uppercase tracking-[0.15em] text-[11px] rounded-2xl shadow-xl shadow-[#2E2E2F]/15 hover:shadow-[#38BDF2]/25 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
          >
            View All Events
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      )}

      {/* Pagination Controller (Events page only) */}
      {showPagination && (
        <div className="mt-16 flex items-center justify-center gap-2">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#F2F2F2] rounded-full border border-[#2E2E2F]/10">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i + 1)}
                className={`min-h-[30px] px-3.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-[#38BDF2] focus:ring-offset-2 ${currentPage === i + 1
                  ? 'bg-[#38BDF2] text-[#F2F2F2]'
                  : 'bg-[#F2F2F2] text-[#2E2E2F] hover:bg-[#2E2E2F] hover:text-[#F2F2F2]'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {displayEvents.length === 0 && (
        <div className="py-16 px-6 text-center bg-[#F2F2F2] rounded-[2.2rem] border border-[#2E2E2F]/10">
          <div className="w-12 h-12 bg-[#F2F2F2] rounded-full flex items-center justify-center mx-auto mb-5 border border-[#2E2E2F]/10">
            <ICONS.Search className="w-6 h-6 text-[#2E2E2F]/60" />
          </div>
          <h3 className="text-xl font-bold text-[#2E2E2F] tracking-tight mb-3">
            {listing === 'liked'
              ? 'No liked events yet'
              : listing === 'followings'
                ? 'No events from followed organizations yet'
                : activeBrowseTab === 'FOR_YOU'
                  ? 'No recommended events available yet'
                  : 'No active sessions found'}
          </h3>
          <p className="text-[13px] font-medium text-[#2E2E2F]/55 mb-5">
            {listing === 'all'
              ? 'Try another tab, change location, or clear your search to discover more events.'
              : 'Like events or follow organizations to build this list.'}
          </p>
          <Button
            variant="outline"
            className="px-3"
            onClick={() => {
              setSearchTerm('');
              setSelectedLocation('Your Location');
              setActiveBrowseTab('ALL');
            }}
          >
            {listing === 'all' ? 'Clear Filters' : 'Reset View'}
          </Button>
        </div>
      )}

      {/* Pricing Section - Visible only in landing mode */}
      {isLanding && <PricingSection />}
    </div>
  );
};
