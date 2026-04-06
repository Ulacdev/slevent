import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Event } from '../../types';
import { Card, Button, PageLoader } from '../../components/Shared';
import { EventCardSkeleton } from '../../components/Shared/Skeleton';
import { ICONS } from '../../constants';
// Removed static category helpers to use dynamic DB-driven ones


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

function formatTime(dateString: string, timezone?: string) {
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timezone ? { timeZone: timezone } : {})
  }).replace(':00', '');
}

const CategoryEventCard: React.FC<{ event: Event }> = ({ event }) => {
  const navigate = useNavigate();

  // Completion calculation
  const now = new Date();
  const eventStart = event.startAt ? new Date(event.startAt) : null;
  const eventEnd = event.endAt ? new Date(event.endAt) : (eventStart ? new Date(eventStart.getTime() + 2 * 60 * 60 * 1000) : null);
  const isDone = eventEnd && now > eventEnd;

  // Date Badge calculations
  const eventDate = eventStart || new Date();
  const month = eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = eventDate.getDate();

  const minPrice = event.ticketTypes?.length
    ? Math.min(...event.ticketTypes.map(t => t.priceAmount))
    : 0;

  const formatTimeRange = (start: string, end?: string, timezone?: string) => {
    if (!start) return '';
    const startTime = formatTime(start, timezone);
    if (!end) return startTime;
    const endTime = formatTime(end, timezone);
    return `${startTime} - ${endTime}`;
  };

  return (
    <Card
      className="group flex flex-col h-full border border-black/5 rounded-[5px] overflow-hidden bg-[#F2F2F2] transition-all duration-500 cursor-pointer hover:shadow-xl hover:translate-y-[-4px]"
      onClick={() => navigate(`/events/${event.slug || event.eventId}`)}
    >
      {/* Image Section */}
      <div className="relative h-44 sm:h-52 overflow-hidden">
        {/* Tags Overlay (Promoted) */}
        <div className="absolute bottom-4 left-4 z-30 flex flex-col gap-2 items-start">
          {(event.is_promoted || (event as any).isPromoted) && (
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
            <div className="w-16 h-16 opacity-20 grayscale flex items-center justify-center">
              <ICONS.Layout className="w-full h-full" />
            </div>
          </div>
        )}

        {/* Date Badge Overlay */}
        <div className="absolute top-3 left-3 z-20 flex flex-col items-center justify-center bg-[#38BDF2] text-white rounded-md py-1.5 px-3 min-w-[54px] shadow-lg">
          <span className="text-[10px] font-bold tracking-widest text-white/90">{month}</span>
          <span className="text-xl font-bold leading-none mt-0.5">{day}</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <h4 className="text-[#1A1A1A] text-lg sm:text-xl font-bold leading-tight mb-3 line-clamp-2">
          {event.eventName}
        </h4>

        <div className="flex flex-col gap-2 mb-4 text-[#4A4A4A]">
          {/* Location */}
          <div className="flex items-start gap-2.5">
            <ICONS.MapPin className="w-4 h-4 shrink-0 mt-0.5 text-black/60" />
            <span className="text-[14px] leading-tight line-clamp-1">{event.locationText}</span>
          </div>

          {/* Time */}
          <div className="flex items-start gap-2.5">
            <ICONS.Clock className="w-4 h-4 shrink-0 mt-0.5 text-black/60" />
            <span className="text-[14px] leading-tight">
              {formatTimeRange(event.startAt, event.endAt, event.timezone)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-end pt-3">
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

export const CategoryEvents: React.FC = () => {
  const { categoryKey = '' } = useParams<{ categoryKey: string }>();
  const [categories, setCategories] = React.useState<any[]>([]);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  const category = React.useMemo(() => {
    const normalized = categoryKey.toUpperCase().replace(/-/g, '_');
    return categories.find(c => c.key === normalized);
  }, [categories, categoryKey]);

  React.useEffect(() => {
    const fetchCategories = async () => {

      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/categories`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setCategories(data.map(c => ({
            ...c,
            Icon: (ICONS as any)[c.icon_name] || ICONS.Layout
          })));
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const fetchAllEvents = async () => {
      if (!category) {
        // If categories are still loading, don't stop yet
        if (categories.length > 0) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const pageSize = 50;
        const firstPage = await apiService.getEvents(1, pageSize, '');
        let mergedEvents: Event[] = firstPage.events || [];
        const totalPages = Math.max(1, firstPage.pagination?.totalPages || 1);

        if (totalPages > 1) {
          const fetchers: Promise<{ events: Event[]; pagination: any }>[] = [];
          for (let page = 2; page <= totalPages; page += 1) {
            fetchers.push(apiService.getEvents(page, pageSize, ''));
          }
          const remaining = await Promise.all(fetchers);
          mergedEvents = mergedEvents.concat(...remaining.map((result) => result.events || []));
        }

        // Dynamic keyword filtering
        const keywords = Array.isArray(category.keywords) ? category.keywords : [];
        const filtered = mergedEvents.filter((event) => {
          const sourceText = `${event.eventName || ''} ${event.description || ''} ${event.locationText || ''}`.toLowerCase();
          return keywords.some((keyword: string) => sourceText.includes(keyword.toLowerCase()));
        });

        if (!cancelled) setEvents(filtered);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAllEvents();
    return () => { cancelled = true; };
  }, [category, categories.length]);

  const visibleEvents = React.useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((event) => {
      const text = `${event.eventName || ''} ${event.description || ''} ${event.locationText || ''}`.toLowerCase();
      return text.includes(needle);
    });
  }, [events, searchTerm]);

  if (loading) {
    return <PageLoader label={`Syncing ${category?.label || 'category'} sessions...`} variant="page" />;
  }

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-20">
        <div className="py-20 px-8 text-center bg-[#F2F2F2] rounded-xl border border-[#2E2E2F]/10">
          <h3 className="text-2xl font-bold text-[#2E2E2F] tracking-tight mb-4">Category not found</h3>
          <Link to="/">
            <Button variant="outline" className="px-4">Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20">
      <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 h-[260px] sm:h-[300px] lg:h-[350px] overflow-hidden mb-10">
        <div className="absolute inset-0 bg-[linear-gradient(116deg,#38BDF2_0%,#38BDF2_44%,#F2F2F2_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,62,134,0.45)_0%,rgba(0,62,134,0.2)_34%,rgba(0,62,134,0)_72%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_32%,rgba(255,255,255,0.34),transparent_46%),linear-gradient(90deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_26%,rgba(255,255,255,0)_52%)]" />
        
        <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl items-center px-6">
          <div className="max-w-[840px] flex items-center gap-8">
            <div className="hidden sm:flex w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 items-center justify-center text-white shrink-0 shadow-2xl">
              <category.Icon className="w-12 h-12" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Link
                  to="/"
                  className="text-white/80 hover:text-white text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-2 transition-colors"
                >
                  <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg>
                  Back to Events
                </Link>
                <span className="text-white/40">•</span>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Category Browse</p>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-none tracking-tight text-white mb-4">
                {category.label}
              </h1>
              <p className="max-w-[600px] text-base sm:text-lg leading-relaxed text-white/95 font-medium">
                Explore all published sessions under {category.label.toLowerCase()} and find your next opportunity.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8">
        <div className="flex-1">
          <h2 className="text-3xl lg:text-4xl font-black text-[#2E2E2F] tracking-tight mb-2">{visibleEvents.length} Event{visibleEvents.length === 1 ? '' : 's'}</h2>
          <p className="text-[#2E2E2F] font-medium">Refined by category: {category.label}</p>
        </div>
        <div className="w-full md:w-[280px] lg:w-[360px]">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#2E2E2F] group-focus-within:text-[#38BDF2] transition-colors">
              <ICONS.Search className="h-4 w-4" strokeWidth={3} />
            </div>
            <input
              type="text"
              placeholder="Search in this category..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="block w-full pl-12 pr-12 py-3 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-xl text-[13px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/20 focus:border-[#38BDF2] placeholder:text-[#2E2E2F]"
            />
          </div>
        </div>
      </div>

      {visibleEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {visibleEvents.map((event) => (
            <div key={event.eventId}>
              <CategoryEventCard event={event} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 px-8 text-center bg-[#F2F2F2] rounded-xl border border-[#2E2E2F]/10">
          <div className="w-14 h-14 bg-[#F2F2F2] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#2E2E2F]/10">
            <ICONS.Search className="w-7 h-7 text-[#2E2E2F]" />
          </div>
          <h3 className="text-2xl font-bold text-[#2E2E2F] tracking-tight mb-4">No events found in {category.label}</h3>
          <Link to="/">
            <Button variant="outline" className="px-4">Back to Events</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

