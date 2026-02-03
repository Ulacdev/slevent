
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Order } from '../../types';
import { Card, Button } from '../../components/Shared';
import { ICONS } from '../../constants';
import QRCode from 'react-qr-code';

export const PaymentStatusView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'pending' | 'expired'>('checking');
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    let isMounted = true;
    let pollId: number | undefined;

    const checkStatus = async () => {
      try {
        const data = await apiService.getPaymentStatus(sessionId);
        if (!isMounted) return;
        if (data) {
          setOrder(data);
          if (data.status === 'PAID') {
            setStatus('success');
            const tix = await apiService.getTicketsByOrder(sessionId);
            if (isMounted) setTickets(Array.isArray(tix) ? tix : []);
            if (pollId) window.clearInterval(pollId);
          } else if (data.status === 'FAILED') {
            setStatus('failed');
            if (pollId) window.clearInterval(pollId);
          } else if (data.status === 'EXPIRED') {
            setStatus('expired');
            if (pollId) window.clearInterval(pollId);
          } else {
            setStatus('pending');
          }
        } else {
          setStatus('failed');
          if (pollId) window.clearInterval(pollId);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setStatus('failed');
        if (pollId) window.clearInterval(pollId);
      }
    };

    checkStatus();
    pollId = window.setInterval(checkStatus, 5000);

    return () => {
      isMounted = false;
      if (pollId) window.clearInterval(pollId);
    };
  }, [sessionId]);

  const renderContent = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="flex flex-col items-center py-16">
            <div className="w-10 h-10 border-4 border-[#3768A2]/30 border-t-[#003E86] rounded-full animate-spin mb-4"></div>
            <h2 className="text-lg font-bold text-[#003E86]">Verifying Payment...</h2>
            <p className="text-[#2E2E2F]/70">Please do not refresh this page.</p>
          </div>
        );
      case 'pending':
        return (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-10 h-10 border-4 border-[#3768A2]/30 border-t-[#38BDF2] rounded-full animate-spin mb-4"></div>
            <h2 className="text-lg font-bold text-[#003E86]">Payment Pending</h2>
            <p className="text-[#2E2E2F]/70 max-w-sm">
              We’re waiting for confirmation from the payment gateway. This can take a few minutes.
              Please keep this tab open.
            </p>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center py-8 px-6 text-center">
            <div className="w-14 h-14 bg-[#38BDF2]/20 text-[#003E86] rounded-full flex items-center justify-center mb-5">
              <ICONS.CheckCircle className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-[#003E86] mb-2">Payment Successful!</h1>
            <p className="text-[#2E2E2F]/70 max-w-sm mb-6">
              Your registration order <strong>#{order?.orderId}</strong> is confirmed. A copy of your ticket has been sent to your email.
            </p>
            <div className="space-y-3 w-full max-w-xs">
              <Button className="w-full" size="md" onClick={() => navigate(`/tickets/${sessionId}`)}>
                View Digital Ticket
              </Button>
              <Button variant="outline" size="md" className="w-full" onClick={() => navigate('/events')}>
                Back to Events
              </Button>
            </div>

            {tickets.length > 0 && (
              <div className="w-full mt-10 text-left">
                <h3 className="text-sm font-black text-[#3768A2] uppercase tracking-[0.2em] mb-4">Tickets</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tickets.map((t) => (
                    <a
                      key={t.ticketId}
                      href={`#/tickets/${t.ticketId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-[#3768A2]/20 rounded-2xl p-4 bg-[#F2F2F2] flex flex-col items-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#38BDF2]"
                      title="Open this ticket"
                    >
                      <QRCode value={t.qrPayload || t.ticketCode} size={140} />
                      <div className="text-xs text-[#2E2E2F]/60 break-all text-center">
                        {t.ticketCode}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#003E86]">{t.status}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'failed':
        return (
          <div className="flex flex-col items-center py-8 px-6 text-center">
            <div className="w-14 h-14 bg-[#2E2E2F]/10 text-[#2E2E2F] rounded-full flex items-center justify-center mb-5">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </div>
            <h1 className="text-2xl font-black text-[#2E2E2F] mb-2">Payment Failed</h1>
            <p className="text-[#2E2E2F]/70 max-w-sm mb-8">
              We couldn't process your payment. Please try again or contact support if the issue persists.
            </p>
            <Button className="w-full max-w-xs" variant="primary" size="md" onClick={() => navigate('/events')}>
              Try Again
            </Button>
          </div>
        );
      case 'expired':
        return (
          <div className="flex flex-col items-center py-8 px-6 text-center">
            <div className="w-14 h-14 bg-[#2E2E2F]/10 text-[#2E2E2F] rounded-full flex items-center justify-center mb-5">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v5m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h1 className="text-2xl font-black text-[#2E2E2F] mb-2">Reservation Expired</h1>
            <p className="text-[#2E2E2F]/70 max-w-sm mb-8">
              Your payment window expired before completion. Please select your tickets again to continue.
            </p>
            <Button className="w-full max-w-xs" variant="primary" size="md" onClick={() => navigate('/events')}>
              Back to Events
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card>
        {renderContent()}
      </Card>
    </div>
  );
};
