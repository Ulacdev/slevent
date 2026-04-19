import React, { useEffect, useState } from 'react';
import { EventCard, EventCardData } from './EventCard';
import { apiService } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { ICONS } from '../constants';
import { Button, PageLoader } from './Shared';

type EventsFeedProps = {
  search?: string;
  location?: string;
  category?: string;
  onEventClick?: (eventId: string) => void;
  showHeader?: boolean;
};

export const EventsFeed: React.FC<EventsFeedProps> = ({
  search = '',
  location = '',
  category = '',
  onEventClick,
  showHeader = true,
}) => {
  const { showToast } = useToast();
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadMoreEvents = async (pageNum: number) => {
    try {
      setLoading(true);
      const response = await apiService.getEventsFeed(pageNum, 12, search || '', location || '', category || '');

      const rawEvents = response.events || [];
      const newEvents: EventCardData[] = rawEvents.map((e: any) => ({
        ...e,
        organizerName: e.organizerName || e.employerName || 'Organizer'
      }));

      setTotalEvents(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);

      if (pageNum === 1) {
        setEvents(newEvents);
      } else {
        setEvents(prev => [...prev, ...newEvents]);
      }

      setHasMore(pageNum < (response.pagination?.totalPages || 1));
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to load events');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Load events when page, search, location, or category changes
  useEffect(() => {
    setPage(1);
    loadMoreEvents(1);
  }, [search, location, category]);

  // Count promoted vs regular events
  const promotedCount = events.filter(e => e.is_promoted).length;
  const regularCount = events.filter(e => !e.is_promoted).length;

  if (loading && page === 1) {
    return <PageLoader variant="page" />;
  }

  return (
    <div className="w-full">
      {/* Header Section */}
      {showHeader && (
        <div className="mb-12">
          {search ? (
            <div className="mb-6">
              <p className="text-sm font-bold text-[#2E2E2F] uppercase tracking-widest mb-2">Search Results</p>
              <h2 className="text-3xl md:text-4xl font-black text-[#2E2E2F] mb-2">{search}</h2>
              <p className="text-[#2E2E2F] font-bold">
                Found {totalEvents} event{totalEvents !== 1 ? 's' : ''}{promotedCount > 0 ? ` (${promotedCount} promoted)` : ''}
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎉</span>
                <p className="text-sm font-bold text-[#2E2E2F] uppercase tracking-widest">Discover Events</p>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-[#2E2E2F]">
                {location || category ? `${location || category} Events` : 'Featured Events'}
              </h2>
              <p className="text-[#2E2E2F] font-bold mt-2">
                {totalEvents} event{totalEvents !== 1 ? 's' :''} available
                {promotedCount > 0 && (
                  <>
                    {' '} • <span className="text-[#38BDF2]">{promotedCount} promoted</span>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Events Grid */}
      {events.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {events.map((event) => (
              <EventCard
                key={`${event.eventId}-${event.is_promoted ? 'promoted' : 'regular'}`}
                event={event}
                onEventClick={onEventClick}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-12">
              <Button
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  loadMoreEvents(nextPage);
                }}
                loading={loading}
                disabled={loading}
                className="px-8 py-4 bg-[#38BDF2] text-white font-black rounded-xl hover:bg-[#2E2E2F] transition-colors shadow-lg shadow-[#38BDF2]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  Load More Events
                  <ICONS.ChevronDown className="w-4 h-4" />
                </span>
              </Button>
            </div>
          )}

          {/* Pagination Info */}
          <div className="text-center mt-8 text-sm font-bold text-[#2E2E2F] uppercase tracking-widest">
            Showing {events.length} of {totalEvents} events • Page {page} of {totalPages}
          </div>
        </>
      ) : (
        <div className="py-20 text-center">
          <div className="mb-4 text-4xl">🔍</div>
          <h3 className="text-2xl font-black text-[#2E2E2F] mb-2">No Events Found</h3>
          <p className="text-[#2E2E2F] font-bold mb-8">
            {search ? `No events match "${search}"` : `No events in ${location || category || 'this category'}`}
          </p>
          <p className="text-sm text-[#2E2E2F]">Try adjusting your search filters or browse all events</p>
        </div>
      )}
    </div>
  );
};
