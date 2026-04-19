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
  layout?: 'vertical' | 'horizontal';
};

const BRAND_LOGO_URL = 'https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg';

export const EventCard: React.FC<EventCardProps> = ({ event, onEventClick, layout = 'vertical' }) => {
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

  const isHorizontal = layout === 'horizontal';

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer group flex transition-all duration-300 hover:shadow-[0_12px_40px_rgba(46,46,47,0.15)] border border-[#2E2E2F]/10 hover:border-[#38BDF2]/30 ${isHorizontal ? 'flex-row rounded-2xl p-4 gap-6 bg-[#F2F2F2]' : 'flex-col rounded-2xl overflow-hidden bg-[#F2F2F2] shadow-sm'}`}
      style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      {/* Image Container */}
      <div className={`relative overflow-hidden bg-[#F2F2F2] shrink-0 ${isHorizontal ? 'w-[280px] h-[190px] rounded-xl' : 'h-56 w-full'}`}>
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.eventName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-gradient-to-br from-[#38BDF2]/10 to-[#F2F2F2]">
            <img
              src={BRAND_LOGO_URL}
              alt="StartupLab"
              className="w-20 h-20 object-contain drop-shadow-xl opacity-20"
            />
          </div>
        )}

        {/* Promoted Badge - Top Left */}
        {event.is_promoted && (
          <div className="absolute top-4 left-4 bg-[#38BDF2] px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest text-white flex items-center gap-1.5 shadow-lg animate-in fade-in zoom-in duration-500 z-20">
            <span>PROMOTED</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-col ${isHorizontal ? 'flex-1 py-1' : 'p-5 space-y-4'}`}>
        <h3 className={`font-black text-lg md:text-xl line-clamp-2 transition-colors leading-tight text-[#2E2E2F] group-hover:text-[#38BDF2]`}>
          {event.eventName}
        </h3>

        {/* Core Info */}
        <div className="space-y-2.5 text-[13px] text-[#2E2E2F]/70 font-semibold">
          {/* 1. Registered & Likes Row */}
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <ICONS.Users className="w-4 h-4 text-[#38BDF2]" strokeWidth={2.5} />
                <span className="text-[#38BDF2]">{event.totalTickets && event.ticketsAvailable ? (event.totalTickets - event.ticketsAvailable) : 0} Registered</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-60">
                <ICONS.Heart className="w-3.5 h-3.5" />
                <span>{event.likesCount || 0}</span>
              </div>
          </div>
          
          {/* 2. Location */}
          <div className="flex items-center gap-3">
            <ICONS.MapPin className="w-4 h-4 shrink-0 text-[#2E2E2F]/40" />
            <span className="line-clamp-1">{event.locationText}</span>
          </div>

          {/* 3. Date & Time */}
          <div className="flex items-center gap-3">
            <ICONS.Calendar className="w-4 h-4 shrink-0 text-[#2E2E2F]/40" />
            <span>{dateStr}{timeStr && <span className="mx-1 opacity-30">•</span>}{timeStr}</span>
          </div>
        </div>

        {/* Secondary Info */}
        <div className="pt-4 flex items-center justify-between border-t border-[#2E2E2F]/5">
          <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[11px]">
            {(() => {
              const now = new Date();
              const eventStart = event.startAt ? new Date(event.startAt) : null;
              const eventEnd = eventStart ? new Date(eventStart.getTime() + 2 * 60 * 60 * 1000) : null;
              const isDone = eventEnd && now > eventEnd;

              if (isDone) return <span className="text-[#2E2E2F] opacity-30 font-black">Event Ended</span>;

              return (
                <div className="flex items-center gap-2">
                    <span className="text-[#38BDF2]">{event.price_min === 0 ? "FREE" : `₱${event.price_min?.toLocaleString()}`}</span>
                    <span className="text-[#2E2E2F]/20">/ SESSION</span>
                </div>
              );
            })()}
          </div>
          
          {event.avgRating && event.avgRating > 0 ? (
            <div className="flex items-center gap-1.5 text-[10px] font-black text-[#2E2E2F]/40 bg-[#2E2E2F]/5 px-2 py-1 rounded-md">
              ⭐ {event.avgRating.toFixed(1)}
            </div>
          ) : null}
        </div>

        {/* Promoted Duration */}
        {event.is_promoted && event.promotionEndDate && (
          <div className="pt-1">
            <p className="text-[9px] text-[#38BDF2] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <ICONS.Zap className="w-3 h-3" />
              Featured until {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(event.promotionEndDate))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

