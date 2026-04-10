import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Event, UserRole, OrganizerProfile } from '../../types';
import { Card, Button, PageLoader, Modal, Checkbox } from '../../components/Shared';
import { Skeleton, EventCardSkeleton, OrganizerCardSkeleton, PromotedEventSkeleton } from '../../components/Shared/Skeleton';
import { OrganizerCard } from '../../components/OrganizerCard';
import { BrowseEventsNavigator, BrowseTabKey, ONLINE_LOCATION_VALUE } from '../../components/BrowseEventsNavigator';
import { ICONS } from '../../constants';
import { EVENT_CATEGORIES, getEventCategoryKeys, getCategoryByKey } from '../../utils/eventCategories';
import { useUser } from '../../context/UserContext';
import { useEngagement } from '../../context/EngagementContext';
import { PricingSection } from '../../components/PricingSection';
import { DestinationSlider } from '../../components/DestinationSlider';


const BRAND_LOGO_URL = 'https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg';

// Track dismissals only for the current page session (resets on hard refresh)
const sessionDismissed = new Set<string>();

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  target_audience: 'ALL' | 'ORGANIZERS' | 'ATTENDEES';
  created_at: string;
  is_published: boolean;
  scheduled_at?: string | null;
  expires_at?: string | null;
}

// Helper to handle JSONB image format
const getImageUrl = (img: any): string => {
  if (!img) return BRAND_LOGO_URL;
  if (typeof img === 'string') return img;
  return img.url || img.path || img.publicUrl || BRAND_LOGO_URL;
};

const generateDefaultAvatarDataUri = (initials: string, bgColor: string = '#38BDF2'): string => {
  const safeInitials = (initials || 'SL').slice(0, 2).toUpperCase();
  const svg = `
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="18" fill="${bgColor}"/>
      <text x="18" y="21" font-size="12" font-weight="900" font-family="Helvetica, Arial, sans-serif" fill="white" text-anchor="middle">${safeInitials}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${btoa(svg)}`;
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


const AttendeeFacepile: React.FC<{ count: number; realAvatars?: string[]; size?: string; className?: string }> = ({
  count,
  realAvatars = [],
  size = 'w-7 h-7',
  className = ''
}) => {
  if (count <= 0) return null;

  const maxToDisplay = Math.min(count, 4);
  let displayAvatars = [...realAvatars];

  // If we have less real avatars than the count (e.g. mocked tickets with no attendee rows), pad with fallback initials so the UI looks complete
  if (displayAvatars.length < maxToDisplay) {
    const mockNames = ['John', 'Alice', 'Mark', 'Sarah', 'James', 'Emily', 'Chris', 'Luna'];
    for (let i = displayAvatars.length; i < maxToDisplay; i++) {
      const seed = mockNames[(count + i) % mockNames.length];
      displayAvatars.push(`https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=38BDF2&textColor=ffffff`);
    }
  }

  // Ensure we never display more than 4 individual faces
  displayAvatars = displayAvatars.slice(0, 4);

  return (
    <div className={`flex -space-x-3 items-center ${className}`}>
      {displayAvatars.map((src, i) => (
        <div key={i} className={`${size} rounded-full border-[2.5px] border-white overflow-hidden shadow-sm bg-[#F2F2F2] transition-transform hover:scale-110 hover:z-40 relative`} style={{ zIndex: 30 - i }}>
          <img src={src} className="w-full h-full object-cover" alt="" loading="lazy" />
        </div>
      ))}
      {count > displayAvatars.length && (
        <div className={`${size} rounded-full border-[2.5px] border-white bg-[#F2F2F2] flex items-center justify-center text-[10px] font-black text-black shadow-sm z-10 relative`}>
          +{count - displayAvatars.length}
        </div>
      )}
    </div>
  );
};

interface EventCardProps {
  event: Event;
  onActionNotice?: (message: string) => void;
  trendingRank?: number | null;
  organizers?: OrganizerProfile[];
  isLanding?: boolean;
  listing?: string;
  isRecommended?: boolean;
  layout?: 'vertical' | 'horizontal';
  onSelectEvent?: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onActionNotice,
  trendingRank = null,
  organizers = [],
  isLanding = true,
  listing = 'all',
  isRecommended = false,
  layout = 'vertical',
  onSelectEvent
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, role, openAuthModal } = useUser();
  const {
    canLikeFollow,
    isAttendingView,
    isLiked,
    toggleLike
  } = useEngagement();

  // Safe calculation for minPrice if ticketTypes exist
  const minPrice = event.ticketTypes?.length
    ? Math.min(...event.ticketTypes.map(t => t.priceAmount))
    : 0;

  // Date Badge, Completion and Timing
  const now = new Date();
  const eventStart = event.startAt ? new Date(event.startAt) : null;
  const eventEnd = event.endAt ? new Date(event.endAt) : (eventStart ? new Date(eventStart.getTime() + 2 * 60 * 60 * 1000) : null);
  const isDone = eventEnd && now > eventEnd;
  const eventDate = eventStart || new Date();
  const month = eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = eventDate.getDate();

  const liked = isLiked(event.eventId);
  // Trending for top liked events, regardless of landing page.
  const isTrending = trendingRank && (listing === 'all');
  const organizerRestricted = isAuthenticated && role === UserRole.ORGANIZER && !isAttendingView;

  const gotoSignup = () => {
    if (openAuthModal) {
      openAuthModal('signup');
    } else {
      navigate('/signup'); // fallback
    }
  };

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
      await toggleLike(event.eventId);
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

  // Category Badge (Dynamic)
  const categoryKeys = getEventCategoryKeys(event);
  const rawFirstCategory = (event as any).category || categoryKeys[0];
  const categoryObject = getCategoryByKey(rawFirstCategory as string) || EVENT_CATEGORIES.find(c => c.label === rawFirstCategory) || EVENT_CATEGORIES.find(c => c.key === 'BUSINESS');
  const categoryLabel = categoryObject?.label || (typeof rawFirstCategory === 'string' ? rawFirstCategory : 'Networking');
  const CategoryIcon = categoryObject?.Icon;

  const formatTimeRange = (start: string, end?: string, timezone?: string) => {
    if (!start) return '';
    const startTime = formatTime(start, timezone);
    if (!end) return startTime;
    const endTime = formatTime(end, timezone);
    return `${startTime} - ${endTime}`;
  };

  if (layout === 'horizontal') {
    const totalSlots = (event.ticketTypes || []).reduce((sum, t) => sum + (t.quantityTotal || 0), 0);
    const soldSlots = (event as any).registrationCount ?? (event.ticketTypes || []).reduce((sum, t) => sum + (t.quantitySold || 0), 0);
    const ticketPercentage = totalSlots > 0 ? (soldSlots / totalSlots) * 100 : 0;
    const isGoingFast = ticketPercentage > 75;

    const formattedDate = formatDate(event.startAt, event.timezone, { weekday: 'short', month: 'short', day: 'numeric' });
    const formattedTime = formatTime(event.startAt, event.timezone);

    const handleSingleClick = (e: React.MouseEvent) => {
      if (layout === 'horizontal' && onSelectEvent) {
        onSelectEvent((event as unknown) as Event);
      } else {
        navigate(`/events/${event.slug || event.eventId}`);
      }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
      navigate(`/events/${event.slug || event.eventId}`);
    };

    return (
      <div
        onClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
        className="relative cursor-pointer group flex flex-col sm:flex-row p-4 gap-6 rounded-2xl bg-[#F2F2F2] hover:bg-[#E5E7EB] transition-all duration-200 border border-transparent hover:border-[#D1D5DB] w-full"
        style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
      >
        {/* Image Container */}
        <div className="relative overflow-hidden shrink-0 w-full sm:w-[280px] lg:w-[320px] self-stretch min-h-[180px] rounded-xl bg-[#F2F2F2]">
          {event.imageUrl ? (
            <img
              src={getImageUrl(event.imageUrl)}
              alt={event.eventName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#F2F2F2]">
              <img src={BRAND_LOGO_URL} alt="StartupLab" className="w-16 h-16 object-contain opacity-20 grayscale" />
            </div>
          )}

          {/* Top Left Date Badge */}
          <div className="absolute top-3 left-3 z-20 flex flex-col items-center justify-center bg-[#38BDF2] shadow-lg rounded-xl py-2 px-3 min-w-[58px] border border-white/20 group-hover:scale-110 transition-transform duration-300">
            <span className="text-[10px] font-black tracking-[0.1em] text-white uppercase leading-none mb-1">{month}</span>
            <span className="text-xl font-black leading-none text-white">{day}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 py-1 min-w-0 pr-2">
          {/* Status Badge */}
          {isGoingFast && (
            <div className="mb-2 inline-flex items-center text-[10px] sm:text-[11px] font-black px-2.5 py-1 bg-[#FFF0E6] text-[#D13B30] rounded-md tracking-wider uppercase">
              Going fast
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Title */}
            <h3 className="font-bold text-[#111827] text-2xl sm:text-[28px] tracking-tight leading-tight line-clamp-2 md:line-clamp-3 group-hover:text-[#38BDF2] transition-colors pr-8">
              {event.eventName}
            </h3>

            {/* Date & Time */}
            <p className="text-base sm:text-lg text-[#6B7280] font-medium tracking-tight truncate">
              {formattedDate} • {formattedTime}
            </p>

            {/* Price */}
            <p className="text-base sm:text-lg text-[#374151] font-medium tracking-tight">
              {minPrice === 0 ? "Free" : `From ₱${minPrice.toLocaleString()}`}
            </p>
          </div>

          {/* Promoted / Bottom Area */}
          <div className="mt-auto pt-6 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {!isTrending && (event.is_promoted || (event as any).isPromoted) && (
                <div className="group/promoted relative">
                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#38BDF2]/10 text-[#38BDF2] text-[10px] font-black uppercase tracking-[0.15em] border border-[#38BDF2]/30 whitespace-nowrap cursor-help transition-all hover:bg-[#38BDF2]/20">
                    <ICONS.Info className="w-3.5 h-3.5" strokeWidth={3} />
                    PROMOTED
                  </div>
                  <div className="absolute bottom-full left-0 mb-3 opacity-0 group-hover/promoted:opacity-100 pointer-events-none transition-all duration-300 translate-y-1 group-hover/promoted:translate-y-0 z-50">
                    <div className="bg-black text-white text-[9px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl border border-white/10 uppercase tracking-widest text-center leading-tight">
                      Featured: Highlighted via<br />Organizer Subscription
                    </div>
                    <div className="w-2 h-2 bg-black rotate-45 absolute -bottom-1 left-4 border-r border-b border-white/10"></div>
                  </div>
                </div>
              )}

            </div>

            <div className="flex items-center gap-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button type="button" aria-label="Share" onClick={handleShare} className="p-2.5 text-[#4B5563] hover:text-[#111827] hover:bg-black/5 rounded-full transition-colors flex items-center justify-center">
                <ICONS.Download className="w-4 h-4" />
              </button>
              <button type="button" aria-label="Like" onClick={handleLike} className={`p-2.5 rounded-full transition-colors flex items-center justify-center ${liked ? 'text-[#38BDF2] hover:bg-[#38BDF2]/10' : 'text-[#4B5563] hover:text-[#111827] hover:bg-black/5'}`}>
                <ICONS.Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={`group relative flex flex-col h-full border ${isTrending ? 'border-[#38BDF2] ring-1 ring-[#38BDF2]' : 'border-black/5'} rounded-[5px] bg-[#F2F2F2] transition-all duration-500 cursor-pointer hover:shadow-xl hover:translate-y-[-4px]`}
      onClick={() => navigate(`/events/${event.slug || event.eventId}`)}
      style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      {/* Image Section */}
      <div className="relative h-44 sm:h-52 overflow-hidden rounded-t-[5px]">
        {/* Tags Overlay (Trending & Promoted) */}
        <div className="absolute bottom-4 left-4 z-30 flex flex-col gap-2 items-start">
          {isTrending && (
            <div
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 bg-[#38BDF2] text-white text-[11px] font-black uppercase tracking-[0.12em] shadow-xl border border-white/20 transition-all hover:scale-110 active:scale-95 whitespace-nowrap"
            >
              <ICONS.Star className="w-3.5 h-3.5 fill-current text-white" />
              #{trendingRank} Trending
            </div>
          )}
          {!isTrending && (event.is_promoted || (event as any).isPromoted) && (
            <div className="group/promoted relative">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1 bg-[#38BDF2]/10 text-[#38BDF2] text-[10px] font-black uppercase tracking-[0.15em] border border-[#38BDF2]/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap cursor-help">
                <ICONS.Info className="w-3.5 h-3.5" strokeWidth={3} />
                PROMOTED
              </div>
              <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover/promoted:opacity-100 pointer-events-none transition-all duration-300 translate-y-1 group-hover/promoted:translate-y-0 z-50">
                <div className="bg-black text-white text-[9px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-2xl border border-white/10 uppercase tracking-widest text-center leading-tight">
                  Featured: Highlighted via<br />Organizer Subscription
                </div>
                <div className="w-2 h-2 bg-black rotate-45 absolute -bottom-1 left-4 border-r border-b border-white/10"></div>
              </div>
            </div>
          )}

        </div>
        {event.imageUrl ? (
          <img
            src={getImageUrl(event.imageUrl)}
            alt={event.eventName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <img src={BRAND_LOGO_URL} alt="StartupLab" className="w-16 h-16 opacity-20 grayscale" />
          </div>
        )}

        {/* Date Badge Overlay */}
        <div className="absolute top-3 left-3 z-20 flex flex-col items-center justify-center bg-[#38BDF2] text-white rounded-md py-1.5 px-3 min-w-[54px] shadow-lg">
          <span className="text-[10px] font-bold tracking-widest text-white/90">{month}</span>
          <span className="text-xl font-bold leading-none mt-0.5">{day}</span>
        </div>

        {/* Actions Overlay (Hidden initially, visible on hover) */}
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            type="button"
            onClick={handleLike}
            className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${liked ? 'bg-[#38BDF2] text-white' : 'bg-white/80 text-black hover:bg-white'}`}
          >
            <ICONS.Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-md text-black flex items-center justify-center hover:bg-white transition-all"
          >
            <ICONS.Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <h4 className="text-[#1A1A1A] text-2xl sm:text-[26px] tracking-tight font-black leading-tight mb-4 line-clamp-2 order-1">
          {event.eventName}
        </h4>

        {/* Decorative Separator Line */}
        <div className="order-2 flex items-center mb-4 -mx-5">
          <div className="flex-1 border-t border-black/10" />
          <div className="w-2 h-2 rounded-full border-2 border-black/10 bg-[#F2F2F2] -mr-1 z-10" />
          <div className="w-5" />
        </div>

        <div className="flex flex-col gap-2 mb-4 order-3 text-[#4A4A4A] font-medium">
          {/* Location */}
          <div className="flex items-start gap-2.5">
            <ICONS.MapPin className="w-[18px] h-[18px] shrink-0 mt-0.5 text-black/60" strokeWidth={2} />
            <span className="text-[18px] leading-tight line-clamp-1">{event.locationText}</span>
          </div>

          {/* Time */}
          <div className="flex items-start gap-2.5">
            <ICONS.Clock className="w-[18px] h-[18px] shrink-0 mt-0.5 text-black/60" strokeWidth={2} />
            <span className="text-[18px] leading-tight">
              {formatTimeRange(event.startAt, event.endAt, event.timezone)}
            </span>
          </div>

          {/* Likes / Engagement matching opacity of other rows */}
          <div className="flex items-start gap-2.5">
            <ICONS.Heart className="w-[18px] h-[18px] shrink-0 mt-0.5 text-black/60" strokeWidth={2} />
            <span className="text-[18px] leading-tight">
              {formatCompactCount(event.likesCount || 0)} Likes
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between order-3 pt-3">
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-[#38BDF2] text-white text-[11px] font-black uppercase tracking-wider rounded-md shadow-sm border border-[#38BDF2]/20 shadow-md flex items-center gap-1.5 transition-all">
              {CategoryIcon && <CategoryIcon className="w-4 h-4" />}
              {categoryLabel}
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-[#1A1A1A]">
            {isDone ? (
              <span className="text-sm text-gray-400 uppercase tracking-wider">Ended</span>
            ) : (
              minPrice > 0 ? `₱${minPrice.toLocaleString()}` : 'Free'
            )}
          </div>
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
  const { role, isAuthenticated, isOnboarded, openAuthModal } = useUser();
  const { likedEventIds, followedOrganizerIds } = useEngagement();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedMapEvent, setSelectedMapEvent] = useState<Event | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [activeBrowseTab, setActiveBrowseTab] = useState<BrowseTabKey>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>(getInitialBrowseLocation);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [interactionNotice, setInteractionNotice] = useState('');
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const initialLoadRef = useRef(true);
  const requestIdRef = useRef(0);
  const gotoSignup = () => {
    if (openAuthModal) {
      openAuthModal('signup');
    } else {
      navigate('/signup');
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPrice, setSelectedPrice] = useState<'all' | 'free' | 'paid'>('all');
  const [selectedFormat, setSelectedFormat] = useState<'all' | 'online' | 'in-person'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [showCategoriesFull, setShowCategoriesFull] = useState(false);
  const [sortBy, setSortBy] = useState<string>('relevance');

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Promoted Events state
  const [promotedEvents, setPromotedEvents] = useState<Event[]>([]);
  const [loadingPromoted, setLoadingPromoted] = useState(true);
  const [currentPromotedIndex, setCurrentPromotedIndex] = useState(0);
  const [promotedCarouselInterval, setPromotedCarouselInterval] = useState<NodeJS.Timeout | null>(null);
  const [isMarqueePaused, setIsMarqueePaused] = useState(false);
  const [categories, setCategories] = useState<any[]>(EVENT_CATEGORIES);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Announcement Modal State
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!categoriesScrollRef.current) return;
    isDraggingRef.current = true;
    setStartX(e.pageX - categoriesScrollRef.current.offsetLeft);
    setScrollLeft(categoriesScrollRef.current.scrollLeft);
    setIsMarqueePaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !categoriesScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoriesScrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    categoriesScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setIsMarqueePaused(false);
  };

    // CSS Marquee is used for categories instead of JS frame-by-frame scroll for better performance


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
    const nextSearch = (params.get('search') || '').trim();
    const locationFromQuery = (params.get('location') || '').trim();
    const nextLocation = locationFromQuery || (isLanding ? getInitialBrowseLocation() : DEFAULT_LOCATION);

    setSearchTerm(nextSearch);
    setDebouncedSearch(nextSearch);
    setSelectedLocation(nextLocation);
    setActiveBrowseTab('ALL');
    setCurrentPage(1);

    // If a location is selected via URL, ensure we sort by popularity/relevance to match "Most Popular" hero
    if (locationFromQuery) {
      setSortBy('relevance');
    }
  }, [location.search, isLanding]);

  useEffect(() => {
    const fetchData = async () => {
      const requestId = ++requestIdRef.current;
      const pageSize = isSpecialListing ? 200 : (isLandingAllListing ? 3 : 12);
      const requestedPage = (isSpecialListing || isLandingAllListing) ? 1 : currentPage;
      if (initialLoadRef.current) {
        setLoading(true);
      } else {
        setIsFetching(true);
      }
      try {
        const filters: any = {
          category: selectedCategory,
          price: selectedPrice,
          format: selectedFormat,
          sortBy: isLandingAllListing ? 'trending' : sortBy
        };

        if (selectedDate !== 'all' || activeBrowseTab !== 'ALL') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const dateType = activeBrowseTab !== 'ALL' ? activeBrowseTab.toLowerCase() : selectedDate;

          if (dateType === 'today') {
            filters.startDate = today.toISOString();
            const tonight = new Date(today);
            tonight.setHours(23, 59, 59, 999);
            filters.endDate = tonight.toISOString();
          } else if (dateType === 'tomorrow') {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            filters.startDate = tomorrow.toISOString();
            const tomorrowNight = new Date(tomorrow);
            tomorrowNight.setHours(23, 59, 59, 999);
            filters.endDate = tomorrowNight.toISOString();
          } else if (dateType === 'this_weekend' || dateType === 'weekend') {
            const range = getUpcomingWeekendRange(today);
            filters.startDate = range.start.toISOString();
            filters.endDate = range.end.toISOString();
          }
        }

        const data = await apiService.getEvents(requestedPage, pageSize, serverSearchTerm, '', '', filters);
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
  }, [currentPage, isSpecialListing, isLandingAllListing, serverSearchTerm, selectedCategory, selectedPrice, selectedFormat, selectedDate, activeBrowseTab, sortBy]);

  const [destinations, setDestinations] = useState<any[]>([]);
  const [selectedCityImage, setSelectedCityImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const res = await apiService._fetch(`${import.meta.env.VITE_API_BASE}/api/discovery/destinations`);
        if (res.ok) {
          const data = await res.json();
          setDestinations(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch hero destinations:', err);
      }
    };
    fetchDestinations();
  }, []);

  useEffect(() => {
    const fetchOrganizers = async () => {
      try {
        const list = await apiService.getOrganizers();
        setOrganizers(list || []);
      } catch (err) {
        console.error('Failed to fetch organizers:', err);
      }
    };
    fetchOrganizers();
  }, []);

  useEffect(() => {
    if (!selectedLocation || selectedLocation === DEFAULT_LOCATION || selectedLocation === ONLINE_LOCATION_VALUE) {
      setSelectedCityImage(null);
      return;
    }

    const cityData = destinations.find(d => d.city.toLowerCase() === selectedLocation.toLowerCase());
    if (cityData?.imageUrl) {
      setSelectedCityImage(cityData.imageUrl);
    } else {
      // Fallback fallback seeding if not in curated list
      const isPH = selectedLocation.toLowerCase().includes('ph');
      const pool = isPH ? [
        'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1582236378415-38fc7a871790?q=80&w=1200&auto=format&fit=crop'
      ] : [
        'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1200&auto=format&fit=crop'
      ];
      // Consistent hash-based pick
      let hash = 0;
      for (let i = 0; i < selectedLocation.length; i++) {
        hash = selectedLocation.charCodeAt(i) + ((hash << 5) - hash);
      }
      const idx = Math.abs(hash) % pool.length;
      setSelectedCityImage(pool[idx]);
    }
  }, [selectedLocation, destinations]);

  // Load promoted events with real-time polling
  useEffect(() => {
    const loadPromotedEvents = async (silent = false) => {
      if (!silent) setLoadingPromoted(true);
      try {
        const result = await apiService.getPromotedEvents(6);
        setPromotedEvents(result.events || []);
      } catch (err) {
        console.error('Failed to load promoted events:', err);
      } finally {
        if (!silent) setLoadingPromoted(false);
      }
    };

    if (listing === 'all') {
      loadPromotedEvents();
      // Poll every 30 seconds for real-time updates
      const poll = setInterval(() => loadPromotedEvents(true), 30000);
      return () => clearInterval(poll);
    }
  }, [listing]);

  // Load latest announcement for modal
  useEffect(() => {
    if (!isLanding) return;

    const fetchLatestAnnouncement = async () => {
      try {
        const target = role === UserRole.ORGANIZER ? 'ORGANIZERS' : (role === UserRole.ATTENDEE ? 'ATTENDEES' : 'ALL');
        const res = await apiService._fetch(`${import.meta.env.VITE_API_BASE}/api/announcements?public=true&target=${target}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          const now = new Date();

          // Granular filtering on frontend to guarantee correctness
          const validAnnouncements = (data || []).filter((ann: Announcement) => {
            const isPub = ann.is_published !== false;
            const isSched = !ann.scheduled_at || new Date(ann.scheduled_at) <= now;
            const isNotExp = !ann.expires_at || new Date(ann.expires_at) > now;
            return isPub && isSched && isNotExp;
          });

          if (validAnnouncements.length > 0) {
            // Find the first valid announcement that hasn't been seen in this session
            const firstUnseen = validAnnouncements.find(ann => !sessionDismissed.has(ann.id));

            if (firstUnseen) {
              setActiveAnnouncement(firstUnseen);
              // Small delay for better UX
              setTimeout(() => setShowAnnouncement(true), 1500);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch announcement:', err);
      }
    };
    fetchLatestAnnouncement();
  }, [isLanding, role]);

  // Announcement dismissal handler
  const dismissAnnouncement = () => {
    if (activeAnnouncement) {
      // Mark as dismissed for THIS session only (will show again on F5)
      sessionDismissed.add(activeAnnouncement.id);
    }
    setShowAnnouncement(false);
  };

  const organizerBadgeItems = useMemo(() => {
    if (organizers.length === 0) {
      return [
        { key: 'nk', src: '/partners/nk-logo.png', alt: 'NKJ' },
        { key: 'kj', src: '/partners/kj-logo.png', alt: 'Kenji Javier' },
        { key: 'rr', src: '/partners/rr-logo.png', alt: 'Rovick Romasanta' }
      ];
    }

    return organizers.slice(0, 3).map((org, index) => {
      const initials = (org.organizerName || `O${index + 1}`)
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return {
        key: org.organizerId || `${org.organizerName || 'organizer'}-${index}`,
        src: org.profileImageUrl ? getImageUrl(org.profileImageUrl) : generateDefaultAvatarDataUri(initials),
        alt: org.organizerName || 'Organizer',
      };
    });
  }, [organizers]);

  const organizerCount = organizers.length || 0;

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

  // Promoted carousel autoplay effect
  useEffect(() => {
    if (!isLanding || promotedEvents.length === 0) return;

    const interval = setInterval(() => {
      setCurrentPromotedIndex((prev) => (prev + 1) % promotedEvents.length);
    }, 5000);

    setPromotedCarouselInterval(interval);
    return () => clearInterval(interval);
  }, [isLanding, promotedEvents.length]);


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
      // 1. Prioritize likes
      const likesA = Number(a.likesCount || 0);
      const likesB = Number(b.likesCount || 0);
      if (likesB !== likesA) return likesB - likesA;

      // 2. Fallback to most recently created
      const bTime = new Date(b.created_at || b.startAt || 0).getTime();
      const aTime = new Date(a.created_at || a.startAt || 0).getTime();
      return bTime - aTime;
    });
    return ranked;
  }, [filteredEvents]);

  const trendingRankByEventId = useMemo(() => {
    const map = new Map<string, number>();
    if (listing !== 'all') return map;
    // On landing we always show top 3 ranks even if likes are 0 (as long as they are the top 3 returned)
    // Actually, user wants "trending" so maybe only if > 0 likes? 
    // Usually trending implies > 0. Let's keep it to > 0 to match screenshot.
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
    if (isLandingAllListing) {
      // Show top 3 events by popular demand (including promoted if they have likes)
      return orderedEvents.slice(0, 3);
    }

    // For Browse Events (main catalog), always show promoted events first and unfiltered
    if (listing === 'all' && !isLanding) {
      const promoted = (promotedEvents || []).map(e => ({ ...e, isPromoted: true }));
      // Remove these promoted events from the regular list if they appear there to avoid duplicates
      const regular = orderedEvents.filter(e => !promoted.some(p => p.eventId === e.eventId));
      return [...promoted, ...regular];
    }

    return orderedEvents;
  }, [isLandingAllListing, orderedEvents, promotedEvents, listing, isLanding]);

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const showPagination = !isLanding && !isSpecialListing && orderedEvents.length > 0 && totalPages > 1;
  const showViewAllButton = isLandingAllListing && Number(pagination.total || 0) > displayEvents.length;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/categories`);
        const data = await response.json();
        console.log("Fetched Categories for Marquee:", data);
        if (data && Array.isArray(data) && data.length > 0) {
          const active = data.filter(c => c.is_active).map(c => ({
            ...c,
            Icon: (ICONS as any)[c.icon_name] || ICONS.Layout
          }));
          if (active.length > 0) {
            setCategories(active);
          }
        }
      } catch (err) {
        console.error("Failed to fetch smart categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const sectionTitle = isLandingAllListing
    ? 'Trending Events'
    : listing === 'liked'
      ? 'Liked Events'
      : listing === 'followings'
        ? 'Followed Organizations'
        : 'Available Events';

  const sectionSubtitle = isLandingAllListing
    ? 'The most liked and anticipated sessions happening now.'
    : listing === 'liked'
      ? 'Events you marked with a like.'
      : listing === 'followings'
        ? 'Latest events from organizations you follow.'
        : !isLanding
          ? 'Discover curated sessions highlighted by organizers as part of their elite plan features.'
          : 'Browse and register for upcoming business seminars and workshops.';

  if (loading) {
    return (
      <div className={`max-w-[88rem] mx-auto px-4 sm:px-10 pb-16 ${isLanding ? 'pt-6 sm:pt-12' : 'pt-0'}`}>
        {isLanding && (
          <div className="animate-pulse mb-8">
            <Skeleton variant="rect" width="100%" height={320} className="mb-24 rounded-3xl" />
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-7 lg:gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${isLanding ? 'max-w-[88rem] mx-auto px-4 sm:px-10 pt-6 sm:pt-12' : 'max-w-full px-6 sm:px-10 pt-0'} pb-16`}>
      {isLanding && (
        <>
          {/* Premium Hero Section */}
          <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-between gap-8 lg:gap-14 mb-20 lg:mb-24">
            {/* Left Column: Content */}
            <div className="flex-1 min-w-0 flex flex-col items-start justify-center text-left w-full">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#38BDF2] border border-white/20 text-[11px] font-black text-white mb-8 tracking-wide">
                  <span role="img" aria-label="megaphone">📢</span>
                  New: Advanced QR Ticketing & Analytics Launched!
                </div>

                <h1 className="text-[2.8rem] sm:text-5xl lg:text-[60px] font-bold text-black tracking-tight leading-[1.05] mb-5">
                  Smart Events for<br />
                  Philippine<br />
                  Organizers
                </h1>

                <p className="text-[20px] font-medium text-black leading-relaxed max-w-[800px] mb-10">
                  Manage registrations, tickets, attendee check-ins, and performance in one simple, compliance-ready event platform — built specifically for growth-focused organizers.
                </p>

                <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4">
                  <Button
                    onClick={() => {
                      if (isAuthenticated) {
                        navigate(role === UserRole.ORGANIZER ? '/user-home' : '/browse-events');
                      } else {
                        gotoSignup();
                      }
                    }}
                    className="w-full sm:w-auto px-10 py-4 bg-[#38BDF2] text-white font-black text-[15px] rounded-xl shadow-lg shadow-[#38BDF2]/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isAuthenticated ? (role === UserRole.ORGANIZER ? 'Dashboard' : 'Explore') : 'Get Started'}
                    <ICONS.ArrowRight className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => {
                      const pricingSection = document.getElementById('pricing');
                      if (pricingSection) {
                        pricingSection.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        navigate('/pricing');
                      }
                    }}
                    className="w-full sm:w-auto px-10 py-4 !bg-transparent border-2 border-solid border-[#38BDF2] !text-[#38BDF2] font-black text-[15px] rounded-xl hover:!bg-[#38BDF2] hover:!text-white transition-all flex items-center justify-center gap-2 group"
                  >
                    <ICONS.CreditCard className="w-5 h-5 text-[#38BDF2] group-hover:text-white transition-colors" />
                    Pricing
                  </Button>
                </div>
              </div>

              {/* Stats Block - Tucked tightly under the buttons */}
              <div className="mt-10 sm:mt-12 w-full grid grid-cols-2 sm:grid-cols-3 gap-x-6 sm:gap-x-10 gap-y-8 sm:gap-y-12">
                <div className="flex-1 min-w-[140px]">
                  <h4 className="text-[32px] font-bold text-black tracking-tighter leading-tight mb-1">
                    6+ Core<br />Event<br />Modules
                  </h4>
                  <p className="text-[20px] font-normal text-black leading-tight tracking-tight mt-0.5">
                    Ticketing, Registration,<br />Check-in, Analytics,<br />Seats, Reports
                  </p>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <h4 className="text-[32px] font-bold text-black tracking-tighter leading-tight mb-1">
                    8+ Active<br />Event<br />Organizers
                  </h4>
                  <p className="text-[20px] font-normal text-black leading-tight tracking-tight mt-0.5">
                    Built with real-world<br />organizer experience
                  </p>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <h4 className="text-[32px] font-bold text-black tracking-tighter leading-tight mb-1">
                    10+ Hosted<br />Event<br />Workflows
                  </h4>
                  <p className="text-[20px] font-normal text-black leading-tight tracking-tight mt-0.5">
                    From event planning to<br />secure payouts
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Dashboard Stack - Balanced & Static (Stand Still) */}
            <div className="flex-1 relative w-full mt-10 lg:mt-0 flex flex-col gap-6 lg:gap-8 justify-center">
              <div className="absolute -inset-10 bg-gradient-to-tr from-[#38BDF2]/10 to-transparent blur-[80px] opacity-30"></div>
              
              {/* Top Card: Admin Center */}
              <div className="relative bg-[#F2F2F2] p-1.5 rounded-2xl shadow-[0_20px_40px_-10px_rgba(46,46,47,0.1)] overflow-hidden group max-w-[620px] mx-auto lg:ml-auto transition-transform hover:scale-[1.02] duration-500">
                <img
                  src="/hero-admin-preview.png"
                  alt="Admin Center Dashboard"
                  className="w-full h-auto rounded-xl block"
                />
                <div className="absolute top-3 right-3 bg-white/40 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black text-black/60 uppercase tracking-[0.2em]">
                  Admin Center
                </div>
              </div>

                {/* Bottom Card: Organizer Portal */}
              <div className="relative bg-[#F2F2F2] p-1.5 rounded-2xl shadow-[0_25px_50px_-12px_rgba(46,46,47,0.12)] overflow-hidden group max-w-[620px] mx-auto lg:ml-auto transition-transform hover:scale-[1.02] duration-500">
                <img
                  src="/hero-dashboard-preview.png"
                  alt="Organizer Portal Dashboard"
                  className="w-full h-auto rounded-xl block"
                />
                <div className="absolute top-3 right-3 bg-white/40 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black text-black/60 uppercase tracking-[0.2em]">
                  Organizer Portal
                </div>
              </div>

              {/* Floating badge: Organizer Tally - Resized (More Compact) */}
              <div
                className="absolute -bottom-4 -left-4 bg-[#F2F2F2] p-2.5 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] flex flex-col items-start gap-2 animate-float group/badge cursor-pointer z-40 scale-90 lg:scale-100"
                onMouseEnter={() => setShowOrgDropdown(true)}
                onMouseLeave={() => setShowOrgDropdown(false)}
              >
                <div className="flex -space-x-2.5">
                  {organizerBadgeItems.map((organizer) => (
                    <div key={organizer.key} className="w-8 h-8 rounded-full border-[2px] border-white overflow-hidden shadow-sm bg-[#38BDF2]/10 ring-1 ring-black/5">
                      <img src={organizer.src} alt={organizer.alt} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-[2px] border-white bg-[#E8E8E8] flex items-center justify-center text-[9px] font-black text-black shadow-sm ring-1 ring-black/5">
                    +{organizerCount > 3 ? organizerCount - 3 : 5}
                  </div>
                </div>
                <div className="space-y-0" onClick={() => navigate('/organizers/discover')}>
                  <p className="text-[7.5px] font-black uppercase tracking-[0.05em] text-black/60 leading-tight">Active Organizers</p>
                  <p className="text-[14px] font-black text-black leading-tight hover:text-[#38BDF2] transition-colors tracking-tight">
                    8+ Trusted Leaders
                  </p>
                </div>

                {/* Dropdown list of organizers (Restored) */}
                <div className={`absolute bottom-[calc(100%-10px)] left-0 w-64 bg-[#F2F2F2] border border-black/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] rounded-xl overflow-hidden transition-all duration-300 origin-bottom-left pb-3 ${showOrgDropdown ? 'opacity-100 scale-100 translate-y-[-10px]' : 'opacity-0 scale-95 pointer-events-none translate-y-0'}`}>
                  <div className="p-5 border-b border-black/5 bg-black/[0.02]">
                    <h5 className="text-[10px] font-black text-black uppercase tracking-[0.25em]">Our Partners</h5>
                  </div>
                  <div className="max-h-[238px] overflow-y-auto custom-scrollbar p-2.5 space-y-1">
                    {organizers.map((org) => (
                      <button
                        key={org.organizerId}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/organizer/${org.organizerId}`);
                        }}
                        className="w-full flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all duration-300 text-left group/item border border-transparent hover:border-black/5"
                      >
                        <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-white shadow-sm bg-gradient-to-br from-[#38BDF2] to-[#A5E1FF] flex items-center justify-center shrink-0">
                          {org.profileImageUrl ? (
                            <img src={getImageUrl(org.profileImageUrl)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-[11px] font-black uppercase drop-shadow-sm">
                              {(org.organizerName || 'O').charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-black truncate group-hover/item:text-[#38BDF2] transition-colors tracking-tight">
                            {org.organizerName}
                          </p>
                          <p className="text-[9px] font-bold text-black uppercase tracking-[0.1em]">
                            {org.followersCount || 0} Followers
                          </p>
                        </div>
                        <ICONS.ChevronRight className="w-3.5 h-3.5 text-black group-hover/item:text-[#38BDF2] group-hover/item:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                  <div className="px-4 py-3 bg-[#F2F2F2] border-t border-black/5 text-center">
                    <div className="flex items-center justify-center gap-2 text-[9px] font-black text-[#38BDF2] uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity cursor-default">
                      <div className="w-1 h-1 rounded-full bg-[#38BDF2] animate-pulse" />
                      Verified Community
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Rail (Top of Available Events) */}
          <div className="mt-44 mb-28 overflow-visible relative z-10">
            <div className="rounded-2xl border border-black/10 bg-[#F2F2F2] px-6 py-8 md:px-8 shadow-sm">
              <div className="mb-8">
                <h2 className="text-[16px] font-black tracking-tight text-black">Event smart categories</h2>
              </div>
              <div
                className="category-marquee py-2 relative overflow-hidden outline-none cursor-grab active:cursor-grabbing select-none"
                tabIndex={0}
                onMouseEnter={() => setIsMarqueePaused(true)}
                onMouseLeave={handleMouseUpOrLeave}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
              >
                <div
                  ref={categoriesScrollRef}
                  className="category-marquee__track flex items-center gap-6 whitespace-nowrap"
                  style={{ animationPlayState: (isMarqueePaused || isDraggingRef.current) ? 'paused' : 'running' }}
                >
                  {[...categories, ...categories].map((category, index) => (
                    <button
                      key={`${category.key}-${index}`}
                      type="button"
                      onClick={() => navigate(`/categories/${category.key.toLowerCase()}`)}
                      className="shrink-0 w-[128px] flex flex-col items-center gap-3 text-center group px-2 py-4 hover:z-50 hover:-translate-y-1 transition-transform relative"
                    >
                      <span className="w-[72px] h-[72px] rounded-full border border-transparent flex items-center justify-center text-black bg-transparent group-hover:bg-[#38BDF2]/10 group-hover:border-[#38BDF2]/40 group-hover:text-black transition-all duration-300 group-hover:scale-125 group-hover:shadow-[0_10px_25px_-5px_rgba(56,189,242,0.4)] group-focus-visible:scale-125 relative z-20">
                        <category.Icon className="w-7 h-7 transition-all duration-300 group-hover:scale-110" />
                      </span>
                      <span className="text-[14px] font-bold text-black leading-tight min-h-[32px] flex items-center justify-center pt-2 group-hover:text-[#38BDF2] transition-colors">{category.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Promoted Events Carousel Section */}
          {(loadingPromoted || promotedEvents.length > 0) && (
            <div className="w-full mt-44 mb-44 animate-in fade-in slide-in-from-bottom-4 duration-700 px-1">
              {/* Header Section */}
              <div className="mb-12 text-center flex flex-col items-center">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight leading-none">Promoted Events</h2>
                  <div className="group/info relative">
                    <ICONS.Info className="w-6 h-6 text-black cursor-help hover:text-[#38BDF2] transition-colors" strokeWidth={2} />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-4 bg-black text-white text-[11px] font-bold rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all z-50 leading-relaxed text-center">
                      These events are highlighted because the organizer has subscribed to a premium plan with promotion features.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black"></div>
                    </div>
                  </div>
                </div>
                <p className="text-black text-sm md:text-base font-medium max-w-2xl leading-relaxed">
                  Discover curated sessions highlighted by organizers as part of their elite plan features.
                </p>
              </div>

              {loadingPromoted ? (
                <PromotedEventSkeleton />
              ) : promotedEvents.length > 0 ? (
                <div className="relative">
                  {/* Carousel Container - More visible border and rounded corners */}
                  <div className="rounded-2xl overflow-hidden border border-black/15 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] group">
                    <div className="relative h-[280px] sm:h-[400px] lg:h-[500px] overflow-hidden bg-white">
                      {/* Carousel Images */}
                      {promotedEvents.map((event, idx) => {
                        const imageUrl = getImageUrl(event.imageUrl);
                        return (
                          <div
                            key={event.eventId}
                            className={`absolute inset-0 transition-all duration-[600ms] ease-in-out transform cursor-pointer ${idx === currentPromotedIndex
                              ? 'opacity-100 translate-x-0 z-10 pointer-events-auto'
                              : 'opacity-0 translate-x-full z-0 pointer-events-none invisible'
                              }`}
                            aria-hidden={idx !== currentPromotedIndex}
                            onClick={() => navigate(`/events/${event.slug || event.eventId}`)}
                          >
                            {/* Main Image - Full width with hover scale */}
                            <img
                              src={imageUrl}
                              alt={event.eventName}
                              className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.05] z-10"
                            />

                            {/* Info Overlay Panel */}
                            <div className="absolute inset-0 z-20 flex flex-col justify-center">
                              {/* Dark gradient on left half for text readability */}
                              <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/85 via-black/60 via-[40%] to-transparent" />

                              {/* Content Area */}
                              <div className="relative z-30 p-8 sm:p-12 animate-in fade-in slide-in-from-left-4 duration-700">
                                {(() => {
                                  const totalSlots = (event.ticketTypes || []).reduce((sum, t) => sum + (t.quantityTotal || 0), 0);
                                  const soldSlots = (event as any).registrationCount ?? (event.ticketTypes || []).reduce((sum, t) => sum + (t.quantitySold || 0), 0);
                                  const isDone = new Date(event.endAt) < new Date();
                                  const minPrice = (event?.ticketTypes || []).length > 0
                                    ? Math.min(...event!.ticketTypes!.map((t: any) => Number(t.priceAmount || 0)))
                                    : 0;
                                  const org = event.organizer || organizers.find((o: any) => o.organizerId === event.organizerId);

                                  return (
                                    <div className="flex flex-col gap-3 sm:gap-4 text-white max-w-xl">
                                      {/* Category Badge */}
                                      <div className="flex items-center gap-3 group/badge shrink-0">
                                        <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-1000">
                                          <ICONS.Check className="w-4 h-4" strokeWidth={5} />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-xs font-black tracking-[0.15em] text-white uppercase leading-none">
                                            Featured Session
                                          </span>
                                        </div>
                                      </div>

                                      {/* Event Title */}
                                      <h3 className={`font-black tracking-tighter leading-[1.1] text-white drop-shadow-sm animate-in fade-in slide-in-from-left-6 duration-1000 delay-100 line-clamp-2 ${(event.eventName || '').length > 40
                                        ? 'text-xl sm:text-2xl md:text-3xl'
                                        : 'text-2xl sm:text-3xl md:text-5xl'
                                        }`}>
                                        {event.eventName}
                                      </h3>

                                      {/* Event Details Grid - White text on dark bg */}
                                      <div className="space-y-2 sm:space-y-2.5 pt-1 animate-in fade-in slide-in-from-left-8 duration-1000 delay-200">
                                        <div className="flex items-center gap-4 text-base sm:text-lg font-normal text-white">
                                          <div className="w-8 h-8 flex items-center justify-center text-white bg-white/10 rounded-lg">
                                            <ICONS.Heart className="w-5 h-5" strokeWidth={2} />
                                          </div>
                                          <span>3 likes</span>
                                        </div>

                                        <div className="flex items-center gap-4 text-base sm:text-lg font-normal text-white">
                                          <div className="w-8 h-8 flex items-center justify-center text-white bg-white/10 rounded-lg">
                                            <ICONS.Users className="w-5 h-5" strokeWidth={2} />
                                          </div>
                                          <span>{soldSlots} registered <span className="mx-1">•</span> {Math.max(0, totalSlots - soldSlots)} available</span>
                                        </div>

                                        <div className="flex items-center gap-4 text-base sm:text-lg font-normal text-white">
                                          <div className="w-8 h-8 flex items-center justify-center text-white bg-white/10 rounded-lg">
                                            <ICONS.MapPin className="w-5 h-5" strokeWidth={2} />
                                          </div>
                                          <span className="line-clamp-1">{event.locationText || 'Location TBA'}</span>
                                        </div>

                                        <div className="flex items-center gap-4 text-base sm:text-lg font-normal text-white">
                                          <div className="w-8 h-8 flex items-center justify-center text-white bg-white/10 rounded-lg">
                                            <ICONS.Calendar className="w-5 h-5" strokeWidth={2} />
                                          </div>
                                          <span>{formatStartForCard(event.startAt || '', event.timezone)}</span>
                                        </div>
                                      </div>

                                      {/* Action Button */}
                                      <div className="pt-6 sm:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/events/${event.slug || event.eventId}`);
                                          }}
                                          className="px-8 py-3 bg-white/10 backdrop-blur-sm text-white text-[14px] font-bold rounded-full border-2 border-white hover:bg-white/20 transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-3 group/btn w-fit shadow-xl"
                                        >
                                          <ICONS.Ticket className="w-4 h-4" />
                                          Get Ticket
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Navigation Arrows - Using a darker, more defined style for visibility on white */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (promotedCarouselInterval) clearInterval(promotedCarouselInterval);
                          setCurrentPromotedIndex((prev) => (prev - 1 + promotedEvents.length) % promotedEvents.length);
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg border border-black/5 flex items-center justify-center text-black hover:bg-[#38BDF2] hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20"
                      >
                        <ICONS.ChevronLeft className="w-5 h-5" strokeWidth={3} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (promotedCarouselInterval) clearInterval(promotedCarouselInterval);
                          setCurrentPromotedIndex((prev) => (prev + 1) % promotedEvents.length);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg border border-black/5 flex items-center justify-center text-black hover:bg-[#38BDF2] hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20"
                      >
                        <ICONS.ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      {!isLanding && (
        <>
          {selectedLocation !== DEFAULT_LOCATION && selectedLocation !== ONLINE_LOCATION_VALUE ? (
            /* Premium City Hub Hero */
            <section
              className={`relative left-1/2 right-1/2 w-screen -translate-x-1/2 h-[350px] sm:h-[450px] lg:h-[500px] overflow-x-hidden overflow-y-hidden mb-12 shadow-2xl transition-all duration-1000 ${selectedCityImage ? 'bg-black' : ''}`}
              style={{ zoom: 0.9 }}
            >
              {selectedCityImage ? (
                <div className="absolute inset-0">
                  <img
                    src={selectedCityImage}
                    alt=""
                    className="w-full h-full object-cover opacity-60 scale-105 animate-pulse-slow font-black"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-[#38BDF2]/40" />
              )}
              <div className="relative z-10 mx-auto flex h-full w-full max-w-[88rem] items-center px-4 sm:px-10">
                <div className="max-w-[900px] animate-in fade-in slide-in-from-left-6 duration-1000">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="px-3 py-1.5 bg-[#38BDF2] rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-[#38BDF2]/40">
                      Discovery Hub
                    </div>
                  </div>
                  <h1 className="text-[1.85rem] font-black leading-[1.1] tracking-tighter text-white sm:text-4xl lg:text-5xl xl:text-6xl uppercase transform-gpu">
                    Most Popular Events in<br />
                    <span className="text-[#38BDF2] drop-shadow-xl underline decoration-white/20 underline-offset-[8px]">
                      {selectedLocation}
                    </span>
                  </h1>
                  <p className="mt-8 max-w-[650px] text-sm sm:text-base leading-relaxed text-white font-normal uppercase tracking-[0.1em] drop-shadow-sm">
                    Discover elite curated sessions happening now in {selectedLocation}.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            /* Classic Marketplace Hero for "All Events" */
            <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 h-[260px] sm:h-[300px] lg:h-[350px] overflow-x-hidden mb-8">
              <div className="absolute inset-0 bg-[linear-gradient(116deg,#38BDF2_0%,#38BDF2_44%,#F2F2F2_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,62,134,0.45)_0%,rgba(0,62,134,0.2)_34%,rgba(0,62,134,0)_72%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_32%,rgba(255,255,255,0.34),transparent_46%),linear-gradient(90deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_26%,rgba(255,255,255,0)_52%)]" />
              <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center px-5 sm:px-8">
                <div className="max-w-[720px]">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/90 mb-3">Event Marketplace</p>
                  <h1 className="text-[2.1rem] font-extrabold leading-none tracking-tight text-white sm:text-5xl">All Events</h1>
                  <p className="mt-4 max-w-[680px] text-base leading-relaxed text-white/95 sm:text-[1.05rem]">
                    Explore all published events and use the sorting controls to narrow by relevance, timing, and location context.
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {isLanding && !isSpecialListing && (
        <section className="mb-0 px-0 pt-0 pb-4">
          <div id="marketplace-results" className="scroll-mt-32">
            <BrowseEventsNavigator
              activeTab={activeBrowseTab}
              onTabChange={setActiveBrowseTab}
              selectedLocation={selectedLocation}
              onLocationSelect={(loc) => {
                // On Home, we just filter the local grid, no redirect
                setSelectedLocation(loc);
                setCurrentPage(1);
              }}
              onLocationClear={() => {
                setSearchTerm('');
                setDebouncedSearch('');
                setSelectedLocation(DEFAULT_LOCATION);
                setActiveBrowseTab('ALL');
              }}
              isLoading={isFetching}
              className="mt-0 mb-5 mx-0"
            />
          </div>

          <div id="marketplace-results-grid" className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2 mb-6 pb-0 px-0 scroll-mt-24">
            <div className="flex-1 space-y-1.5">
              <h2 className="text-2xl md:text-3xl font-black text-black tracking-tight leading-none">
                {selectedLocation === DEFAULT_LOCATION ? 'Global Trending Events' : `Trending in ${selectedLocation}`}
              </h2>
              <p className="text-black text-xs md:text-sm font-medium leading-relaxed">
                {selectedLocation === DEFAULT_LOCATION
                  ? 'The most liked and anticipated sessions happening now world-wide.'
                  : `Top rated sessions happening across ${selectedLocation}.`}
              </p>
            </div>

            <div className="w-full md:w-[320px] shrink-0">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-black group-focus-within:text-[#38BDF2] transition-colors">
                  <ICONS.Search className="h-4 w-4" strokeWidth={3} />
                </div>
                <input
                  type="text"
                  placeholder={`Search in ${selectedLocation}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-9 py-3 bg-[#F2F2F2] border border-[#D1D5DB] rounded-xl text-[12px] font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/20 focus:border-[#38BDF2] placeholder:text-black"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {!isLanding && (
        <div className="mb-0">
          {/* Internal Navigator for Discovery Mode - Hidden per request */}
        </div>
      )}

      <div style={{ zoom: !isLanding ? 0.8 : undefined }} className="origin-top transition-transform duration-500">
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-6 px-0 ${isLanding ? 'hidden' : 'mb-8 mt-2'}`}>
          {!isLanding && !isSpecialListing && (
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                className="flex items-center gap-2 bg-[#F2F2F2] px-4 py-2.5 rounded-xl border border-[#E5E7EB] shadow-sm text-[10px] font-black uppercase tracking-widest text-black hover:bg-[#38BDF2]/10 hover:border-[#38BDF2]/30 transition-all"
              >
                <ICONS.Filter className="w-4 h-4" />
                {isSidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
              </button>

              <div className="flex items-center gap-3 bg-[#F2F2F2] px-5 py-2.5 rounded-xl border border-[#D1D5DB] shadow-sm justify-between sm:justify-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-black">Sort By</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs font-bold text-black outline-none cursor-pointer"
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest</option>
                  <option value="date_soon">Soonest</option>
                </select>
              </div>
            </div>
          )}

          <div className="w-full sm:w-[280px] md:w-[320px]">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-black group-focus-within:text-[#38BDF2] transition-colors">
                <ICONS.Search className="h-4 w-4" strokeWidth={3} />
              </div>
              <input
                type="text"
                placeholder={`Search in ${selectedLocation}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-9 py-3 bg-[#F2F2F2] border border-[#D1D5DB] rounded-xl text-[12px] font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/20 focus:border-[#38BDF2] placeholder:text-black"
              />
            </div>
          </div>
        </div>

        {interactionNotice && (
          <div className="mb-6 rounded-xl border border-[#38BDF2]/30 bg-[#38BDF2]/10 px-4 py-3 text-sm font-semibold text-black">
            {interactionNotice}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar Filter - Eventbrite style */}
          {!isLanding && !isSpecialListing && isSidebarVisible && (
            <aside
              className="w-full lg:w-72 shrink-0 space-y-10 lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:pr-4 lg:custom-scrollbar animate-in fade-in slide-in-from-left-4 duration-700"
              style={{ zoom: 1.1 }}
            >
              {/* Active Filters Header */}
              <div className="flex items-center justify-between pb-4 border-b border-black/5">
                <h3 className="text-xl font-black text-black tracking-tight">Filters</h3>
                {(selectedCategory !== 'all' || selectedDate !== 'all' || selectedPrice !== 'all' || selectedFormat !== 'all') && (
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedDate('all');
                      setSelectedPrice('all');
                      setSelectedFormat('all');
                      setSearchTerm('');
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-[#38BDF2] hover:text-black transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Category Section */}
              <div className="space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-black">Category</h4>
                <div className="space-y-3.5">
                  {(showCategoriesFull ? categories : categories.slice(0, 6)).map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(selectedCategory === cat.key ? 'all' : cat.key)}
                      className={`flex items-center gap-3.5 w-full text-left group transition-all ${selectedCategory === cat.key ? 'text-[#38BDF2]' : 'text-black hover:text-[#38BDF2]'}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${selectedCategory === cat.key ? 'bg-[#38BDF2] text-[#F2F2F2]' : 'bg-[#F2F2F2] border border-black/5 group-hover:bg-[#38BDF2]/10'}`}>
                        <cat.Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[13px] font-bold tracking-tight ${selectedCategory === cat.key ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>{cat.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCategoriesFull(!showCategoriesFull)}
                    className="text-xs font-black text-[#38BDF2] pt-2 hover:underline transition-all flex items-center gap-1"
                  >
                    {showCategoriesFull ? 'View less' : 'View more'}
                    <ICONS.ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCategoriesFull ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Date Section */}
              <div className="space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-black">Date</h4>
                <div className="space-y-4">
                  {[
                    { id: 'all', label: 'Any time' },
                    { id: 'today', label: 'Today' },
                    { id: 'tomorrow', label: 'Tomorrow' },
                    { id: 'weekend', label: 'This weekend' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedDate(opt.id)}
                      className="flex items-center gap-3 w-full group"
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${selectedDate === opt.id ? 'border-[#38BDF2]' : 'border-[#E5E7EB] group-hover:border-[#38BDF2]/40'}`}>
                        {selectedDate === opt.id && <div className="w-2 h-2 bg-[#38BDF2] rounded-full" />}
                      </div>
                      <span className={`text-[13px] font-bold tracking-tight ${selectedDate === opt.id ? 'text-black' : 'text-black group-hover:text-black'}`}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Section */}
              <div className="space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-black">Price</h4>
                <div className="space-y-4">
                  {[
                    { id: 'all', label: 'All Prices' },
                    { id: 'free', label: 'Free' },
                    { id: 'paid', label: 'Paid' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedPrice(opt.id as any)}
                      className="flex items-center gap-3 w-full group"
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${selectedPrice === opt.id ? 'border-[#38BDF2]' : 'border-[#E5E7EB] group-hover:border-[#38BDF2]/40'}`}>
                        {selectedPrice === opt.id && <div className="w-2 h-2 bg-[#38BDF2] rounded-full" />}
                      </div>
                      <span className={`text-[13px] font-bold tracking-tight ${selectedPrice === opt.id ? 'text-black' : 'text-black group-hover:text-black'}`}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Section */}
              <div className="space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-black">Format</h4>
                <div className="space-y-4">
                  {[
                    { id: 'all', label: 'All Formats' },
                    { id: 'online', label: 'Online' },
                    { id: 'in-person', label: 'In-person' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedFormat(opt.id as any)}
                      className="flex items-center gap-3 w-full group"
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${selectedFormat === opt.id ? 'border-[#38BDF2]' : 'border-[#E5E7EB] group-hover:border-[#38BDF2]/40'}`}>
                        {selectedFormat === opt.id && <div className="w-2 h-2 bg-[#38BDF2] rounded-full" />}
                      </div>
                      <span className={`text-[13px] font-bold tracking-tight ${selectedFormat === opt.id ? 'text-black' : 'text-black group-hover:text-black'}`}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          <div className="flex-1 flex min-w-0 gap-10">
            <div className="flex-1 min-w-0 space-y-12">
              {/* Most Liked Events Section (Discovery Mode Only) */}
              {!isLanding && selectedLocation !== DEFAULT_LOCATION && displayEvents.length > 0 && !loading && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center gap-4">
                    <div className="h-0.5 bg-[#38BDF2] w-8" />
                    <h3 className="text-xl font-black text-black tracking-tight uppercase">Most Liked in {selectedLocation}</h3>
                    <div className="h-px bg-black/5 flex-1" />
                  </div>
                  <div className={`grid grid-cols-1 ${!isLanding ? 'gap-6' : 'lg:grid-cols-2 xl:grid-cols-3 gap-8'} pt-10`} style={{ zoom: 0.95 }}>


                    {displayEvents.slice(0, 3).map((event) => (
                      <EventCard
                        key={`featured-${event.eventId}`}
                        event={event}
                        onActionNotice={setInteractionNotice}
                        trendingRank={trendingRankByEventId.get(event.eventId) ?? null}
                        organizers={organizers}
                        isLanding={isLanding}
                        listing={listing}
                        layout={!isLanding ? 'horizontal' : 'vertical'}
                        onSelectEvent={setSelectedMapEvent}
                      />
                    ))}
                  </div>

                  {displayEvents.length > 3 && (
                    <div className="pt-8 space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="h-0.5 bg-black/20 w-8" />
                        <h3 className="text-xl font-black text-black tracking-tight uppercase">Other Events</h3>
                        <div className="h-px bg-black/5 flex-1" />
                      </div>
                      <div className={`grid grid-cols-1 ${!isLanding ? 'gap-6' : 'lg:grid-cols-2 xl:grid-cols-3 gap-8'} pt-10`} style={{ zoom: 0.95 }}>

                        {displayEvents.slice(3).map((event) => (
                          <EventCard
                            key={`other-${event.eventId}`}
                            event={event}
                            onActionNotice={setInteractionNotice}
                            trendingRank={trendingRankByEventId.get(event.eventId) ?? null}
                            organizers={organizers}
                            isLanding={isLanding}
                            listing={listing}
                            layout={!isLanding ? 'horizontal' : 'vertical'}
                            onSelectEvent={setSelectedMapEvent}
                          />
                        ))}
                      </div>
                    </div>

                  )}
                </div>
              )}

              {/* Standard Grid Display (Fallbacks) */}
              {((isLanding || selectedLocation === DEFAULT_LOCATION) || loading) && (
                <>
                  <div className={`grid grid-cols-1 ${!isLanding ? 'gap-6' : 'lg:grid-cols-2 xl:grid-cols-3 gap-7 lg:gap-8'} pt-10 ${displayEvents.length > 0 ? 'min-h-[400px]' : 'min-h-0'}`} style={{ zoom: 0.95 }}>


                    {loading ? (
                      Array.from({ length: isLandingAllListing ? 3 : 6 }).map((_, idx) => (
                        <div key={idx} className={!isLanding ? 'h-[190px]' : ''}>
                          <EventCardSkeleton layout={!isLanding ? 'horizontal' : 'vertical'} />
                        </div>
                      ))
                    ) : displayEvents.map((event, idx) => (
                      <div key={event.eventId} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <EventCard
                          event={event}
                          onActionNotice={setInteractionNotice}
                          trendingRank={trendingRankByEventId.get(event.eventId) ?? null}
                          organizers={organizers}
                          isLanding={isLanding}
                          listing={listing}
                          isRecommended={isLandingAllListing && idx === 1}
                          layout={!isLanding ? 'horizontal' : 'vertical'}
                          onSelectEvent={setSelectedMapEvent}
                        />
                      </div>
                    ))}
                  </div>

                  {isLandingAllListing && displayEvents.length > 0 && (
                    <div className="flex justify-center mt-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                      <button
                        onClick={() => navigate('/browse-events')}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-[#38BDF2] rounded-xl text-[12px] font-black uppercase tracking-widest text-[#F2F2F2] hover:bg-black transition-all active:scale-95 shadow-lg shadow-[#38BDF2]/20 shadow-blue-500/20"
                      >
                        Explore All Events
                        <ICONS.ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              )}

              {displayEvents.length === 0 && (
                <div className="py-12 px-6 text-center bg-white rounded-3xl border border-black/5 animate-in zoom-in-95 duration-500 shadow-sm">
                  <div className="w-14 h-14 bg-[#F2F2F2] border border-black/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <ICONS.Search className="w-7 h-7 text-black opacity-40" />
                  </div>
                  <h3 className="text-xl font-black text-black tracking-tight mb-3 uppercase">
                    {isLandingAllListing
                      ? 'No Trending Hubs Yet'
                      : selectedLocation !== DEFAULT_LOCATION
                        ? `No Sessions in ${selectedLocation}`
                        : 'No matches found'}
                  </h3>
                  <p className="text-xs font-bold text-black/60 mb-8 max-w-[280px] mx-auto leading-relaxed">
                    {isLandingAllListing
                      ? 'Be the first to like a session to see it trending here, or explore our full catalog below.'
                      : `We couldn't find any upcoming events in this local hub. Try broadening your location or checking "All areas".`}
                  </p>
                  <Button
                    className="px-8 py-3.5 rounded-xl bg-black text-white font-black uppercase tracking-widest text-[10px] hover:bg-[#38BDF2] transition-all transform active:scale-95 shadow-lg shadow-black/10"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedLocation(DEFAULT_LOCATION);
                      setActiveBrowseTab('ALL');
                      setSelectedCategory('all');
                      setSelectedDate('all');
                      setSelectedPrice('all');
                      setSelectedFormat('all');
                      navigate('/browse-events');
                    }}
                  >
                    Discover All Hubs
                  </Button>
                </div>
              )}


            </div>

            {/* Map Sidebar ONLY on Browse Events (!isLanding) */}
            {!isLanding && !isSpecialListing && (
              <aside className="hidden xl:block w-[340px] 2xl:w-[420px] shrink-0 sticky top-28 self-start h-[500px] max-h-[calc(100vh-140px)] rounded-xl overflow-hidden bg-[#E5E7EB] border border-[#2E2E2F]/10 z-10 shadow-sm relative">
                <div className="absolute inset-0 transition-all duration-500">
                  <iframe
                    width="100%"
                    height="100%"
                    className="absolute inset-0 z-0"
                    style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent((selectedMapEvent ? (selectedMapEvent.locationText || selectedMapEvent.eventName) : selectedLocation) || 'Philippines')}&t=&z=12&ie=UTF8&iwloc=&output=embed`}
                  />
                </div>
              </aside>
            )}

          </div>
        </div>
      </div>

      {isLanding && (
        <DestinationSlider onSelect={(city) => {
          navigate(`/browse-events?location=${encodeURIComponent(city)}`);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }} />
      )}

      {isLanding && <PricingSection />}
      <div className="mt-12">
        {isLanding && <FeaturedOrganizers />}
      </div>
      <div className="mt-12">
        {isLanding && <FAQSection />}
      </div>


      {/* Modern Announcement Modal */}
      <Modal
        isOpen={showAnnouncement}
        onClose={dismissAnnouncement}
        title="" // No internal header, custom design
        size="md"
        hideHeader
      >
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl">
          {/* Accent Header */}
          <div className={`h-24 flex items-center justify-center ${activeAnnouncement?.type === 'INFO' ? 'bg-blue-500' :
            activeAnnouncement?.type === 'SUCCESS' ? 'bg-emerald-500' :
              activeAnnouncement?.type === 'WARNING' ? 'bg-amber-500' :
                'bg-rose-500'
            } text-white shadow-lg relative`}>
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={dismissAnnouncement}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <ICONS.X className="w-5 h-5 text-white" />
              </button>
            </div>
            <ICONS.Bell className="w-10 h-10 animate-bounce" strokeWidth={2.5} />
          </div>

          <div className="p-8 text-center space-y-4">
            <div className="space-y-2">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${activeAnnouncement?.type === 'INFO' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                activeAnnouncement?.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  activeAnnouncement?.type === 'WARNING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-rose-50 text-rose-600 border-rose-200'
                }`}>
                {activeAnnouncement?.type} Announcement
              </span>
              <h3 className="text-2xl font-black text-[#2E2E2F] leading-tight px-4">
                {activeAnnouncement?.title}
              </h3>

              {/* Decorative Separator Line */}
              <div className="flex items-center mt-6 -mx-8 ">
                <div className="flex-1 border-t border-black/5" />
                <div className="w-2.5 h-2.5 rounded-full border-2 border-black/5 bg-white -mr-1.5 z-10" />
                <div className="w-8" />
              </div>
            </div>

            <p className="text-[#2E2E2F]/70 text-sm leading-relaxed px-4 whitespace-pre-wrap">
              {activeAnnouncement?.content}
            </p>

            <div className="pt-4 flex items-center justify-center">
              <Checkbox
                checked={dontShowAgain}
                onChange={setDontShowAgain}
                label={<span className="text-[11px] font-black uppercase tracking-widest text-[#2E2E2F]/70">Don't show this again</span>}
              />
            </div>

            <div className="pt-6">
              <Button
                onClick={dismissAnnouncement}
                className={`w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-widest text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-95 ${activeAnnouncement?.type === 'INFO' ? 'bg-blue-500 shadow-blue-500/20' :
                  activeAnnouncement?.type === 'SUCCESS' ? 'bg-emerald-500 shadow-emerald-500/20' :
                    activeAnnouncement?.type === 'WARNING' ? 'bg-amber-500 shadow-amber-500/20' :
                      'bg-rose-500 shadow-rose-500/20'
                  }`}
              >
                Got it, Thanks!
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const FAQSection: React.FC = () => {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I create an event?",
      answer: "Sign in as an organizer, create a draft event, configure ticket classes and order form fields, then publish when ready."
    },
    {
      question: "How do attendees receive tickets?",
      answer: "After successful checkout, attendees receive confirmation and ticket records tied to their order, including QR-enabled check-in details where configured."
    },
    {
      question: "Can my team have different access levels?",
      answer: "Yes. Organizer access can be scoped by role so teams can separate event editing, finance, marketing, and check-in responsibilities."
    },
    {
      question: "What should I do if payment fails at checkout?",
      answer: "Retry within the checkout flow. If the issue persists, use support with your order reference and timestamp for transaction review."
    },
    {
      question: "How are refunds processed?",
      answer: "Refunds follow organizer rules, event status, and platform safeguards. Duplicate refund attempts are blocked by transaction controls."
    }
  ];

  return (
    <section className="mt-20 mb-20 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <div className="text-center mb-16">
        <p className="text-xs font-bold text-[#38BDF2] mb-3 tracking-tight">Help & Support</p>
        <h2 className="text-3xl md:text-3xl font-black text-black tracking-tight leading-none mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-black text-sm md:text-base font-medium max-w-2xl mx-auto leading-relaxed">
          Quick guidance for the most common organizer and attendee workflows.
        </p>
      </div>
      <div className="max-w-4xl mx-auto space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className={`group rounded-xl overflow-hidden transition-all duration-300 border-2 ${openIndex === index
              ? 'bg-[#F2F2F2] border-[#38BDF2] shadow-[0_10px_30px_-10px_rgba(56,189,242,0.1)]'
              : 'bg-[#F2F2F2] border-black/10 shadow-none'
              }`}
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-4 sm:px-8 py-5 sm:py-7 flex items-center justify-between text-left focus:outline-none"
            >
              <span className={`text-sm sm:text-lg font-black tracking-tight transition-colors duration-300 ${openIndex === index ? 'text-[#38BDF2]' : 'text-black'}`}>
                {faq.question}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${openIndex === index ? 'bg-[#38BDF2] text-white rotate-180' : 'bg-[#F3F4F6] text-black'
                }`}>
                <ICONS.ChevronDown className="w-5 h-5" strokeWidth={3} />
              </div>
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
              <div className="overflow-hidden">
                <div className="px-8 pb-6 border-t border-black/5 mt-2">
                  <p className="text-black text-base font-medium leading-relaxed mt-4">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-16">
        <button
          onClick={() => navigate('/faq')}
          className="flex items-center gap-3 px-10 py-4 bg-[#38BDF2] text-white rounded-xl text-[13px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-[#38BDF2]/40 hover:scale-105"
        >
          Go to FAQ
          <ICONS.MessageSquare className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};

const FeaturedOrganizers: React.FC = () => {
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { followedOrganizerIds, toggleFollowing, canLikeFollow } = useEngagement();
  const { isAuthenticated } = useUser();
  const navigate = useNavigate();
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const data = await apiService.getOrganizers();
        // Sort by most followers as requested
        const sorted = (data || []).sort((a: any, b: any) => (b.followersCount || 0) - (a.followersCount || 0));
        setOrganizers(sorted);
      } catch (error) {
        console.error('Failed to fetch organizers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);



  const isDraggingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const scrollLeftRef = React.useRef(0);

  const handleScroll = () => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft;
      const card = carouselRef.current.firstElementChild as HTMLElement;
      if (!card) return;
      const cardWidth = card.offsetWidth + 24; // Width + gap-6 (1.5rem/24px)
      const newIndex = Math.round(scrollLeft / cardWidth);
      if (newIndex !== currentIndex) setCurrentIndex(newIndex);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - carouselRef.current.offsetLeft;
    scrollLeftRef.current = carouselRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    carouselRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  if (loading) {
    return (
      <section className="mt-10 mb-20 px-4 sm:px-6 lg:px-10 py-12 bg-transparent relative">
        <div className="flex flex-col items-center mb-10 text-center">
          <Skeleton variant="text" width={120} height={16} className="mb-3" />
          <Skeleton variant="text" width={240} height={32} className="mb-3" />
          <Skeleton variant="text" width={400} height={20} />
        </div>
        <div className="flex gap-6 overflow-x-hidden justify-center pb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrganizerCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (!organizers || organizers.length === 0) return null;
  const dotsCount = Math.min(5, organizers.length);
  const activeDot = Math.min(currentIndex, 4);

  return (
    <section className="mt-10 mb-20 px-4 sm:px-6 lg:px-10 py-12 bg-transparent relative group">
      <div className="flex flex-col items-center mb-10 gap-6">
        <div className="flex flex-col text-center items-center max-w-2xl">
          <p className="text-xs font-bold text-[#38BDF2] mb-3 tracking-tight uppercase">Verified Showcase</p>
          <h2 className="text-2xl md:text-3xl font-black text-black tracking-tighter mb-2">Featured Organizers</h2>
          <p className="text-xs md:text-sm font-normal text-black leading-relaxed max-w-[500px]">Stay connected with our top event creators and never miss a highlight session.</p>
        </div>

      </div>

      <div
        ref={carouselRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="flex gap-6 overflow-x-auto pb-8 pt-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-nowrap w-fit max-w-full mx-auto px-2 cursor-grab active:cursor-grabbing"
      >
        {organizers.slice(0, 5).map((org, index) => {
          const isFollowing = (followedOrganizerIds || []).includes(org.organizerId);
          return (
            <OrganizerCard
              key={org.organizerId}
              organizer={org}
              isFollowing={isFollowing}
              rank={index < 5 ? index + 1 : undefined}
              onFollow={async (e) => {
                e.stopPropagation();
                if (!isAuthenticated) {
                  navigate('/signup');
                  return;
                }
                if (!canLikeFollow) return;
                await toggleFollowing(org.organizerId);
              }}
              onClick={() => navigate(`/organizer/${org.organizerId}`)}
              className="w-[300px] sm:w-[360px] shrink-0 snap-center"
            />
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 mt-4">
        {Array.from({ length: dotsCount }).map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeDot ? 'bg-[#38BDF2] scale-125 shadow-sm shadow-[#38BDF2]/40' : 'bg-[#D1D5DB]'}`} />
        ))}
      </div>

      <div className="flex justify-center mt-10">
        <button
          onClick={() => navigate('/organizers/discover')}
          className="flex items-center gap-3 px-8 py-3 bg-[#38BDF2] border border-[#38BDF2] rounded-xl text-[13px] font-black uppercase tracking-widest text-[#F2F2F2] hover:bg-black hover:border-black transition-all hover:shadow-xl hover:shadow-[#38BDF2]/20 active:scale-95"
        >
          See organizers
          <ICONS.ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>
    </section>
  );
};
