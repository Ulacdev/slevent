import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';

export type EventCardData = {
  eventId: string;
  eventName: string;
  image_url?: string;
  startAt: string;
  locationText: string;
  organizerName: string;
  price_min?: number;
  is_promoted?: boolean;
  promotionEndDate?: string;
  likesCount?: number;
  ticketsAvailable?: number;
  totalTickets?: number;
  avgRating?: number;
  reviewCount?: number;
};

type EventCardProps = {
  event: EventCardData;
  onEventClick?: (eventId: string) => void;
};

const BRAND_LOGO_URL = 'https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg';

export const EventCard: React.FC<EventCardProps> = ({ event, onEventClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onEventClick) {
      onEventClick(event.eventId);
    } else {
      navigate(`/events/${event.eventId}`);
    }
  };

  const eventDate = event.startAt ? new Date(event.startAt) : null;
  const dateStr = eventDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || '';
  const timeStr = eventDate?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) || '';

  const ticketPercentage = event.totalTickets && event.ticketsAvailable
    ? ((event.totalTickets - event.ticketsAvailable) / event.totalTickets) * 100
    : 0;

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer group rounded-xl overflow-hidden border border-transparent hover:border-[#E5E7EB] bg-[#F2F2F2] transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative overflow-hidden h-64 md:h-72 bg-[#F2F2F2]">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.eventName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-gradient-to-br from-[#38BDF2] to-black">
            <img
              src={BRAND_LOGO_URL}
              alt="StartupLab"
              className="w-20 h-20 object-contain brightness-0 invert drop-shadow-2xl"
            />
          </div>
        )}

        {/* Promoted Badge - Top Left */}
        {event.is_promoted && (
          <div className="absolute top-5 left-5 bg-[#38BDF2] px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest text-white flex items-center gap-1.5 shadow-lg animate-in fade-in zoom-in duration-500 z-20">
            <ICONS.Info className="w-3.5 h-3.5 text-white" strokeWidth={5} />
            <span>PROMOTED</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="font-black text-black text-2xl line-clamp-2 group-hover:text-[#38BDF2] transition-colors leading-tight">
          {event.eventName}
        </h3>

        {/* Core Info - 4 Symmetrical Points (Following Location Style) */}
        <div className="space-y-2 text-sm text-[#2E2E2F] font-normal mt-2">
          {/* 1. Likes */}
          <div className="flex items-center gap-3">
            <ICONS.Heart className="w-4 h-4 shrink-0 text-[#38BDF2]" strokeWidth={2} />
            <span>{event.likesCount || 0} likes</span>
          </div>

          {/* 2. Registered */}
          <div className="flex items-center gap-3">
            <ICONS.Users className="w-4 h-4 shrink-0 text-black" strokeWidth={2} />
            <span className="text-[#38BDF2]">{event.totalTickets && event.ticketsAvailable ? (event.totalTickets - event.ticketsAvailable) : 0} Registered</span>
          </div>
          
          {/* 3. Location */}
          <div className="flex items-center gap-3">
            <ICONS.MapPin className="w-4 h-4 shrink-0 text-black" strokeWidth={2} />
            <span className="line-clamp-1">{event.locationText}</span>
          </div>

          {/* 4. Date & Time */}
          <div className="flex items-center gap-3">
            <ICONS.Calendar className="w-4 h-4 shrink-0 text-black" strokeWidth={2} />
            <span>{dateStr}{timeStr && <span className="mx-1">•</span>}{timeStr}</span>
          </div>
        </div>

        {/* Secondary Marketplace Info (Price) */}
        <div className="pt-3 flex items-center justify-between border-t border-[#2E2E2F]/5 mt-2">
          <div className="flex items-center gap-2 text-[#38BDF2] font-black uppercase tracking-widest text-[11px]">
            {(() => {
              const now = new Date();
              const eventStart = event.startAt ? new Date(event.startAt) : null;
              const eventEnd = eventStart ? new Date(eventStart.getTime() + 2 * 60 * 60 * 1000) : null;
              const isDone = eventEnd && now > eventEnd;

              if (isDone) return <span className="text-black opacity-40 font-bold">Event Ended</span>;

              return event.price_min === 0 ? "FREE SESSION" : `₱${event.price_min?.toLocaleString()}`;
            })()}
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#65676B] opacity-60">
             ⭐ {event.avgRating && event.avgRating > 0 ? event.avgRating.toFixed(1) : "N/A"}
          </div>
        </div>

        {/* Promoted Duration (if promoted) */}
        {event.is_promoted && event.promotionEndDate && (
          <div className="pt-2">
            <p className="text-[8px] text-[#38BDF2] font-bold uppercase tracking-widest flex items-center gap-2">
              <ICONS.Info className="w-3 h-3 shrink-0" strokeWidth={2.5} />
              {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
                new Date(event.promotionEndDate)
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

