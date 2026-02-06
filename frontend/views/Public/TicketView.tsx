
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { RegistrationView } from '../../types';
import { Card, Badge, Button, PageLoader } from '../../components/Shared';
import { ICONS } from '../../constants';
import QRCode from 'react-qr-code';

export const TicketView: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<RegistrationView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ticketId) {
      apiService.getTicketDetails(ticketId).then(data => {
        setTicket(data);
        setLoading(false);
      });
    }
  }, [ticketId]);

  if (loading) return <PageLoader label="Loading ticket..." variant="page" />;
  if (!ticket) return <div className="p-20 text-center text-[#2E2E2F]/60">Ticket not found.</div>;

  const isCheckedIn = ticket.status === 'USED';
  const paymentLabel = ticket.paymentStatus ? ticket.paymentStatus.replace('_', ' ') : 'PENDING';
  const checkInLabel = ticket.checkInTimestamp ? new Date(ticket.checkInTimestamp).toLocaleString() : 'Not checked in';
  const isOnlineEvent = ticket.locationType === 'ONLINE';
  const meetLink = (ticket.locationText || '').trim();
  const showMeetLinkOnly = Boolean(isOnlineEvent && meetLink);

  return (
    <div className="w-full max-w-md mx-auto px-2 sm:px-4 py-6 sm:py-10">
      <div className="mb-5 sm:mb-6 text-center">
        <h1 className="text-xl font-black text-[#2E2E2F] mb-1">
          {showMeetLinkOnly ? 'Join Your Online Session' : 'Your Digital Ticket'}
        </h1>
        <p className="text-[#2E2E2F]/60 text-xs">
          {showMeetLinkOnly
            ? 'Use the Google Meet link below to enter the session.'
            : 'Present this QR code at the event entrance for check-in.'}
        </p>
      </div>

      <Card className="overflow-visible relative">
        <div className="hidden sm:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F2F2F2] border border-[#2E2E2F]/10"></div>
        <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F2F2F2] border border-[#2E2E2F]/10"></div>

        <div className="p-4 sm:p-5 text-center border-b border-dashed border-[#2E2E2F]/10 pb-5 sm:pb-8">
          <Badge
            type="neutral"
            className={`mb-4 ${isCheckedIn ? 'bg-[#38BDF2]/20 text-[#2E2E2F]' : 'bg-[#38BDF2]/20 text-[#2E2E2F]'}`}
          >
            {isCheckedIn ? 'CHECKED IN' : 'VALID TICKET'}
          </Badge>
          <h2 className="text-base sm:text-lg font-black text-[#2E2E2F] line-clamp-2 mb-2">{ticket.eventName}</h2>
          <p className="text-[#2E2E2F]/60 text-[10px] sm:text-xs mb-4 sm:mb-5 uppercase tracking-widest font-semibold">{ticket.ticketName}</p>
          
          {showMeetLinkOnly ? (
            <div className="bg-[#F2F2F2] p-3 inline-block rounded-xl border border-[#2E2E2F]/10 mx-auto mb-4 w-full max-w-xs">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]/60 mb-3">Google Meet Link</p>
              <Button size="md" variant="primary" className="w-full" onClick={() => { window.location.href = meetLink; }}>
                Join Google Meet
              </Button>
              <a
                href={meetLink}
                className="mt-3 block text-[11px] font-bold text-[#38BDF2] break-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                {meetLink}
              </a>
            </div>
          ) : (
            <div className="bg-[#F2F2F2] p-2 sm:p-3 inline-block rounded-xl border border-[#2E2E2F]/10 mx-auto mb-4">
              <div className="w-36 h-36 sm:w-44 sm:h-44 bg-[#F2F2F2] flex items-center justify-center border border-[#2E2E2F]/10 rounded-lg">
                <QRCode value={ticket.qrPayload || ticket.ticketCode} size={window.innerWidth < 640 ? 110 : 140} fgColor="#2E2E2F" bgColor="#F2F2F2" />
              </div>
              <p className="text-[10px] sm:text-xs font-mono text-[#2E2E2F]/60 mt-2 break-all">{ticket.ticketCode}</p>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex justify-between items-center text-sm">
             <span className="text-[#2E2E2F]/60 font-medium">Attendee</span>
             <span className="text-[#2E2E2F] font-bold">{ticket.attendeeName}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
             <span className="text-[#2E2E2F]/60 font-medium">Email</span>
             <span className="text-[#2E2E2F] font-semibold truncate max-w-[60%] text-right">{ticket.attendeeEmail}</span>
          </div>
          {ticket.attendeePhone && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#2E2E2F]/60 font-medium">Phone</span>
              <span className="text-[#2E2E2F] font-semibold">{ticket.attendeePhone}</span>
            </div>
          )}
          {ticket.attendeeCompany && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#2E2E2F]/60 font-medium">Company</span>
              <span className="text-[#2E2E2F] font-semibold truncate max-w-[60%] text-right">{ticket.attendeeCompany}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
             <span className="text-[#2E2E2F]/60 font-medium">Order ID</span>
             <span className="text-[#2E2E2F] font-mono font-bold">#{ticket.orderId}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
             <span className="text-[#2E2E2F]/60 font-medium">Payment Status</span>
             <span className={`font-bold ${ticket.paymentStatus === 'PAID' ? 'text-[#38BDF2]' : 'text-[#2E2E2F]/60'}`}>{paymentLabel}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
             <span className="text-[#2E2E2F]/60 font-medium">Amount</span>
             <span className="text-[#2E2E2F] font-bold">{ticket.currency} {Number(ticket.amountPaid || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
             <span className="text-[#2E2E2F]/60 font-medium">Check-in</span>
             <span className={`font-semibold ${isCheckedIn ? 'text-[#38BDF2]' : 'text-[#2E2E2F]'}`}>{checkInLabel}</span>
          </div>
        </div>
      </Card>

      <div className="mt-5 sm:mt-6 flex flex-col gap-2 sm:gap-3">
        {!showMeetLinkOnly && (
          <Button size="md" variant="primary" className="w-full" onClick={() => window.print()}>
            Download PDF
          </Button>
        )}
        <Button size="md" variant="ghost" className="w-full" onClick={() => navigate('/')}>
          Back to Events
        </Button>
      </div>
    </div>
  );
};
