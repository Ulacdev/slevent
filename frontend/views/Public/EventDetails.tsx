
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Event, TicketType } from '../../types';
import { Button, Card, PageLoader } from '../../components/Shared';
import { ICONS } from '../../constants';

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

export const EventDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (slug) {
      apiService.getEventBySlug(slug).then(data => {
        setEvent(data);
        if (data && data.ticketTypes.length > 0) {
          const initialQuantities: Record<string, number> = {};
          data.ticketTypes.forEach(t => { initialQuantities[t.ticketTypeId] = 0; });
          setQuantities(initialQuantities);
        }
        setLoading(false);
      });
    }
  }, [slug]);

  if (loading) return <PageLoader label="Syncing event profile..." />;
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
      <div className="mb-8">
        <button 
          onClick={() => navigate('/')} 
          className="text-[#003E86] hover:text-[#2E2E2F] text-[11px] font-black tracking-widest uppercase flex items-center mb-10 gap-2 transition-colors"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
          BACK TO EXPLORATIONS
        </button>

        <div className="flex flex-col lg:flex-row gap-16 items-start">
          <div className="flex-1 space-y-10">
            {/* Visual Header */}
            <div className="overflow-hidden rounded-[2.5rem] border border-[#3768A2]/20">
              <img 
                src={getImageUrl(event.imageUrl)}
                alt={event.eventName} 
                className="w-full aspect-video object-cover" 
              />
            </div>

            {/* Event Profile */}
            <div>
              <h1 className="text-4xl lg:text-5xl font-black text-[#003E86] tracking-tighter mb-5 leading-tight">
                {event.eventName}
              </h1>
              <div className="flex flex-wrap gap-4 mb-12">
                <div className="flex items-center text-[#2E2E2F]/80 bg-[#F2F2F2] px-4 py-2 rounded-2xl border border-[#3768A2]/20 text-[12px] font-black">
                  <ICONS.Calendar className="w-4 h-4 mr-3 text-[#003E86]" />
                  {formatRange(event.startAt, event.endAt, event.timezone)}
                </div>
                <div className="flex items-center text-[#2E2E2F]/80 bg-[#F2F2F2] px-4 py-2 rounded-2xl border border-[#3768A2]/20 text-[12px] font-black">
                  <ICONS.MapPin className="w-4 h-4 mr-3 text-[#38BDF2]" />
                  {event.locationText}
                </div>
                <div className="flex items-center text-[#2E2E2F]/80 bg-[#F2F2F2] px-3 py-1.5 rounded-2xl border border-[#3768A2]/20 text-[11px] font-black">
                  {event.locationType}
                </div>
                <div className="flex items-center text-[#2E2E2F]/80 bg-[#F2F2F2] px-3 py-1.5 rounded-2xl border border-[#3768A2]/20 text-[11px] font-black">
                  STATUS: {event.status}
                </div>
                <div className="flex items-center text-[#2E2E2F]/80 bg-[#F2F2F2] px-3 py-1.5 rounded-2xl border border-[#3768A2]/20 text-[11px] font-black">
                  CAPACITY: {event.capacityTotal}
                </div>
                {event.timezone && (
                  <div className="flex items-center text-[#2E2E2F]/80 bg-[#F2F2F2] px-3 py-1.5 rounded-2xl border border-[#3768A2]/20 text-[11px] font-black">
                    TZ: {event.timezone}
                  </div>
                )}
                {regState && (
                  <div className="flex items-center text-[#2E2E2F]/80 bg-[#F2F2F2] px-3 py-1.5 rounded-2xl border border-[#3768A2]/20 text-[11px] font-black">
                    {regState}
                  </div>
                )}
              </div>

              <div className="p-8 bg-[#F2F2F2] rounded-[2rem] border border-[#3768A2]/20">
                <h3 className="text-[10px] font-black text-[#3768A2] uppercase tracking-[0.4em] mb-6">EVENT OVERVIEW</h3>
                <p className="text-[#2E2E2F]/70 leading-relaxed text-base font-medium whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </div>
          </div>

          {/* Secure Access Sidebar */}
          <div className="w-full lg:w-[380px] shrink-0">
            <Card className="p-8 sticky top-10 rounded-[2.5rem] bg-[#F2F2F2] border border-[#3768A2]/20">
              <h2 className="text-xl font-black text-[#003E86] mb-8 tracking-tight">
                Secure Access
              </h2>
              
              <div className="space-y-5 mb-10">
                {event.ticketTypes.map(ticket => {
                  const qty = quantities[ticket.ticketTypeId] || 0;
                  const available = ticket.quantityTotal - ticket.quantitySold;
                  const isSoldOut = available <= 0;

                  return (
                    <div 
                      key={ticket.ticketTypeId}
                      className={`p-6 rounded-[1.75rem] border-2 transition-colors ${
                        qty > 0 ? 'border-[#003E86] bg-[#F2F2F2]' : 'border-[#3768A2]/20 bg-[#F2F2F2] hover:border-[#003E86]/40'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-black text-[#003E86] text-[13px] uppercase tracking-wider">{ticket.name}</span>
                        <span className={`text-[#F2F2F2] text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${isSoldOut ? 'bg-[#2E2E2F]' : 'bg-[#003E86]'}`}>
                          {isSoldOut ? 'SOLD OUT' : 'AVAILABLE'}
                        </span>
                      </div>
                      <div className="text-xl font-black text-[#003E86] mb-6 tracking-tighter">
                        {ticket.priceAmount === 0 ? 'FREE' : `PHP ${ticket.priceAmount.toLocaleString()}.00`}
                      </div>
                      
                      <div className="pt-6 border-t border-[#3768A2]/20 flex items-center justify-between">
                        <span className="text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em]">QUANTITY</span>
                        <div className="flex items-center gap-5">
                          <button 
                            onClick={() => updateQuantity(ticket.ticketTypeId, -1, available)}
                            disabled={qty === 0}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                              qty > 0 ? 'hover:bg-[#38BDF2]/10 text-[#003E86] border border-[#3768A2]/30' : 'text-[#2E2E2F]/30 cursor-not-allowed'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M20 12H4"/></svg>
                          </button>
                          <span className="font-black text-lg text-[#003E86] w-4 text-center">{qty}</span>
                          <button 
                            onClick={() => updateQuantity(ticket.ticketTypeId, 1, available)}
                            disabled={isSoldOut || qty >= available}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl text-[#F2F2F2] transition-colors ${
                              isSoldOut || qty >= available ? 'bg-[#F2F2F2] text-[#2E2E2F]/40 cursor-not-allowed border border-[#3768A2]/20' : 'bg-[#003E86] hover:bg-[#3768A2]'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-6">
                <Button 
                  size="lg"
                  className="w-full py-4 rounded-[1.25rem]" 
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
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
