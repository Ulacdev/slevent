
import React, { useState, useEffect } from 'react';
import { Card, PageLoader } from '../../components/Shared';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { ICONS } from '../../constants';
import { useToast } from '../../context/ToastContext';

export const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminSmtp, setAdminSmtp] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketMessages, setTicketMessages] = useState<Record<string, any[]>>({});
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === tickets.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(tickets.map(t => t.notification_id)));
    }
  };

  const handlePrintTickets = () => {
    const selected = tickets.filter(t => selectedRows.has(t.notification_id));
    const printData = selected.length > 0 ? selected : tickets;
    const watermarkLogo = 'https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg';

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Support Tickets Report</title>
        <style>
          @page { size: portrait; margin: 20mm; }
          body { font-family: 'Inter', sans-serif; color: #2E2E2F; padding: 0; margin: 0; position: relative; min-height: 100vh; }
          .watermark-container {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            z-index: -1000;
            pointer-events: none;
            overflow: hidden;
          }
          .watermark {
            width: 120%;
            max-width: none;
            opacity: 0.04; 
            transform: rotate(-25deg);
            filter: grayscale(100%);
          }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #38BDF2; padding-bottom: 15px; margin-bottom: 40px; }
          .logo { height: 70px; object-fit: contain; }
          .report-info { text-align: right; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #2E2E2F; line-height: 1.5; }
          h1 { margin: 0; font-size: 32px; letter-spacing: -0.06em; font-weight: 900; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; position: relative; z-index: 10; background: rgba(255,255,255,0.7); }
          th { background: #2E2E2F; color: white; border: 1px solid #2E2E2F; padding: 14px 10px; text-align: left; text-transform: uppercase; letter-spacing: 0.15em; font-size: 11px; }
          td { border: 1px solid #ddd; padding: 14px 10px; vertical-align: top; background: transparent; }
          .status { font-weight: 900; text-transform: uppercase; font-size: 10px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; }
          .resolved { color: #10B981; border-color: #10B981; }
          .pending { color: #F59E0B; border-color: #F59E0B; }
        </style>
      </head>
      <body>
        <div class="watermark-container">
          <img src="${watermarkLogo}" class="watermark" />
        </div>
        <div class="header">
          <div>
            <h1>Administrative Support Inbox</h1>
            <p style="margin: 5px 0 0; font-size: 14px; font-weight: 600; color: #38BDF2;">Ticketing & Safety Control Logs</p>
          </div>
          <div class="report-info">
            <img src="${watermarkLogo}" class="logo" /><br/>
            Ref: ADM-LOG-${Date.now().toString().slice(-6)}<br/>
            Date: ${new Date().toLocaleDateString()}<br/>
            Inbound: ${printData.length} Records
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Type / Source</th>
              <th>Subject / Incident</th>
              <th style="width: 100px;">Status</th>
              <th style="width: 110px;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${printData.map(t => {
      const typeLabel = t.type === 'EVENT_REPORT' ? 'INCIDENT' : 'SUPPORT';
      const sourceLabel = t.type === 'EVENT_REPORT' ? (t.metadata?.reporterEmail || 'Reporter') : (t.organizer?.organizerName || t.metadata?.orgName || t.actor?.name || 'Someone');
      return `
              <tr>
                <td style="font-size: 10px; font-weight: 900; color: #666;">
                  ${typeLabel}<br/>
                  <span style="color: #000; text-transform: none; font-size: 11px;">${sourceLabel}</span>
                </td>
                <td>
                  <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px; color: #000;">${t.title}</div>
                  <div style="font-size: 11px; color: #444; line-height: 1.4;">
                    ${t.message ? t.message.substring(0, 200) + (t.message.length > 200 ? '...' : '') : 'N/A'}
                  </div>
                </td>
                <td style="text-align: center;">
                  <span class="status ${t.metadata?.status === 'resolved' || t.is_read ? 'resolved' : 'pending'}">
                    ${t.metadata?.status === 'resolved' || t.is_read ? 'Resolved' : 'Pending'}
                  </span>
                </td>
                <td style="text-align: right; font-weight: 600;">${new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportTickets = () => {
    const selected = tickets.filter(t => selectedRows.has(t.notification_id));
    const exportData = selected.length > 0 ? selected : tickets;
    const csvContent = `Type,Source,Subject,Status,Date\n${exportData.map(t => `${t.type === 'EVENT_REPORT' ? 'Report' : 'Support'},"${t.organizer?.organizerName || t.metadata?.orgName || t.actor?.name || t.metadata?.reporterEmail || 'N/A'}",${t.title},${t.metadata?.status === 'resolved' ? 'Resolved' : 'Pending'},${new Date(t.created_at).toLocaleDateString()}`).join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_support_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getAdminSupportTickets();
      setTickets(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (ticketId: string) => {
    try {
      await apiService.resolveSupportTicket(ticketId);
      setTickets(prev =>
        prev.map(t =>
          t.notification_id === ticketId
            ? { ...t, is_read: true, metadata: { ...t.metadata, status: 'resolved' } }
            : t
        )
      );
      showToast('success', 'Resolved successfully');
      if (selectedTicket?.notification_id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, is_read: true, metadata: { ...prev.metadata, status: 'resolved' } } : null);
      }
    } catch (err) {
      showToast('error', 'Failed to update record');
    }
  };

  const handleBulkResolve = async () => {
    if (selectedRows.size === 0) return;
    try {
      setRefreshing(true);
      const ids = Array.from(selectedRows);
      await Promise.all(ids.map(id => apiService.resolveSupportTicket(id)));

      setTickets(prev =>
        prev.map(t =>
          selectedRows.has(t.notification_id)
            ? { ...t, is_read: true, metadata: { ...t.metadata, status: 'resolved' } }
            : t
        )
      );

      showToast('success', `${selectedRows.size} records updated`);
      setSelectedRows(new Set());
    } catch (err) {
      showToast('error', 'Failed to resolve some threads');
    } finally {
      setRefreshing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedRows.size} records? This action cannot be undone.`)) return;
    
    try {
      setRefreshing(true);
      const ids = Array.from(selectedRows);
      await apiService.bulkDeleteSupportTickets(ids);

      setTickets(prev => prev.filter(t => !selectedRows.has(t.notification_id)));
      showToast('success', `${selectedRows.size} records deleted`);
      setSelectedRows(new Set());
    } catch (err) {
      showToast('error', 'Failed to delete some records');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    
    try {
      setRefreshing(true);
      await apiService.deleteSupportTicket(ticketId);
      setTickets(prev => prev.filter(t => t.notification_id !== ticketId));
      showToast('success', 'Record deleted successfully');
      if (selectedTicket?.notification_id === ticketId) {
        setSelectedTicket(null);
      }
    } catch (err) {
      showToast('error', 'Failed to delete record');
    } finally {
      setRefreshing(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      setRefreshing(true);
      const data = await apiService.getSupportMessages(ticketId);
      setTicketMessages(prev => ({ ...prev, [ticketId]: data }));
    } catch (err) {
      console.warn('Failed to load messages');
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const openThread = (ticket: any) => {
    setSelectedTicket(ticket);
    if (ticket.type !== 'EVENT_REPORT') {
      loadMessages(ticket.notification_id);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || isSending || !selectedTicket) return;
    try {
      setIsSending(true);
      await apiService.replyToSupportTicket(selectedTicket.notification_id, replyText);
      setReplyText("");
      await loadMessages(selectedTicket.notification_id);
      showToast('success', 'Reply sent successfully');
    } catch (err) {
      showToast('error', 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const renderMessageContent = (message: string) => {
    if (!message) return null;

    // Check for [IMAGE_URL: some_url]
    const imageMatch = message.match(/\[IMAGE_URL: (.*?)\]/);
    if (imageMatch) {
      const imageUrl = imageMatch[1];
      const textPart = message.replace(/\[IMAGE_URL: (.*?)\]/g, '').trim();

      return (
        <div className="space-y-3">
          {textPart && <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{textPart}</p>}
          <div className="relative group cursor-pointer" onClick={() => window.open(imageUrl, '_blank')}>
            <img
              src={imageUrl}
              alt="Attachment"
              className="max-h-60 rounded-lg border-2 border-white/20 shadow-sm transition-all group-hover:scale-[1.02]"
            />
          </div>
        </div>
      );
    }

    return <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed text-[#2E2E2F]">{message}</p>;
  };

  if (loading) return <PageLoader variant="page" label="Syncing Safety Inbox..." />;

  const getStatusBadge = (ticket: any) => {
    const isResolved = ticket.metadata?.status === 'resolved' || ticket.is_read;
    if (isResolved) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F2F2] text-[#2E2E2F] text-[10px] font-black uppercase border border-[#2E2E2F]/10">
          <ICONS.CheckCircle className="w-3.5 h-3.5" />
          Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38BDF2] text-white text-[10px] font-black uppercase shadow-md">
        <ICONS.Clock className="w-3.5 h-3.5" />
        {ticket.type === 'EVENT_REPORT' ? 'Investigation' : 'Open'}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl pb-20 relative min-h-[600px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 px-2">
        <div className="hidden">
          <h1 className="text-3xl font-bold text-text dark:text-white tracking-tight">Support Inbox</h1>
          <p className="text-text dark:text-white/60 font-medium text-sm mt-1">Manage administrative inquiries and investigation reports.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
              <button 
                onClick={handleBulkResolve}
                className="inline-flex items-center justify-center font-black tracking-wide rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 !bg-transparent border-2 border-solid border-[#38BDF2] !text-[#38BDF2] px-6 py-2.5 text-[13px] hover:!bg-[#38BDF2] hover:!text-white flex items-center gap-2 group"
              >
                <ICONS.CheckCircle className="w-5 h-5 text-[#38BDF2] group-hover:text-white transition-colors" />
                BULK DISMISS ({selectedRows.size})
              </button>
              <button 
                onClick={handleBulkDelete}
                className="inline-flex items-center justify-center font-black tracking-wide rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 !bg-transparent border-2 border-solid border-red-500 !text-red-500 px-6 py-2.5 text-[13px] hover:!bg-red-500 hover:!text-white flex items-center gap-2 group"
              >
                <ICONS.Trash className="w-5 h-5 text-red-500 group-hover:text-white transition-colors" />
                BULK DELETE ({selectedRows.size})
              </button>
              <div className="w-[1px] h-6 bg-sidebar-border mx-1" />
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintTickets}
              className="w-10 h-10 flex items-center justify-center bg-[#38BDF2] border-2 border-[#38BDF2] rounded-full text-white hover:bg-[#2E2E2F] hover:border-[#2E2E2F] transition-all shadow-md group"
              title="Print List"
            >
              <ICONS.Printer className="w-5 h-5" />
            </button>
            <button
              onClick={handleExportTickets}
              className="w-10 h-10 flex items-center justify-center bg-[#38BDF2] border-2 border-[#38BDF2] rounded-full text-white hover:bg-[#2E2E2F] hover:border-[#2E2E2F] transition-all shadow-md group"
              title="Export CSV"
            >
              <ICONS.Download className="w-5 h-5" />
            </button>
            <button onClick={loadTickets} className="w-10 h-10 flex items-center justify-center bg-transparent border-2 border-sidebar-border rounded-full hover:bg-background transition-all group dark:text-white" title="Refresh">
              <ICONS.RefreshCw className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500`} />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <Card className="p-6 bg-red-50 text-red-700 border-red-200 font-bold border rounded-xl">
          {error}
        </Card>
      ) : tickets.length === 0 ? (
        <Card className="p-16 text-center border-2 border-dashed border-sidebar-border rounded-xl bg-surface">
          <div className="w-20 h-20 mx-auto bg-background text-text dark:text-white rounded-full flex items-center justify-center mb-6 text-text/20 dark:text-white/20">
            <ICONS.ShieldCheck className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-text dark:text-white mb-2 tracking-tight">Queue is Clear</h3>
          <p className="text-text/40 dark:text-white/40 text-sm font-semibold uppercase tracking-widest">No pending reports or support tickets</p>
        </Card>
      ) : (
        <div className="border border-sidebar-border rounded-xl overflow-hidden bg-surface shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-background border-b border-sidebar-border">
              <tr>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text dark:text-white/60 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={tickets.length > 0 && selectedRows.size === tickets.length}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-2 border-sidebar-border cursor-pointer accent-[#38BDF2]"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text dark:text-white/60">Type</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text dark:text-white/60">Source</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text dark:text-white/60">Subject / Reason</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text dark:text-white/60">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text dark:text-white/60 text-right">Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text dark:text-white/60 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sidebar-border">
              {tickets.map((t) => (
                <tr key={t.notification_id} className={`hover:bg-background transition-colors cursor-pointer ${selectedRows.has(t.notification_id) ? 'bg-[#38BDF2]/5' : ''} ${(t.metadata?.status === 'resolved' || t.is_read) ? 'opacity-50' : ''}`} onClick={() => openThread(t)}>
                  <td className="px-4 py-5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(t.notification_id)}
                      onChange={() => toggleRow(t.notification_id)}
                      className="w-4 h-4 rounded border-2 border-sidebar-border cursor-pointer accent-[#38BDF2]"
                    />
                  </td>
                  <td className="px-6 py-5">
                    {t.type === 'EVENT_REPORT' ? (
                      <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Event Report</span>
                    ) : (
                      <span className="bg-[#38BDF2] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Support</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-surface border border-sidebar-border text-text dark:text-white rounded-lg flex items-center justify-center text-[11px] font-black shadow-sm overflow-hidden">
                        {t.organizer?.profileImageUrl ? (
                          <img src={t.organizer.profileImageUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          (t.organizer?.organizerName || t.metadata?.orgName || t.actor?.name || t.metadata?.reporterEmail || 'R').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-text dark:text-white truncate max-w-[120px]">
                          {t.organizer?.organizerName || t.metadata?.orgName || t.actor?.name || (t.type === 'EVENT_REPORT' ? 'Guest Reporter' : 'Someone')}
                        </p>
                        <p className="text-[10px] font-bold text-text/40 dark:text-white/40">{t.actor?.email || t.metadata?.reporterEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[13px] font-bold text-text dark:text-white">{t.title}</p>
                    <p className="text-[11px] text-text/60 dark:text-white/60 font-medium truncate max-w-[200px]">
                      {t.message?.replace(/\[IMAGE_URL: (.*?)\]/g, ' [Image] ')}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    {getStatusBadge(t)}
                  </td>
                  <td className="px-6 py-5 text-right w-32">
                    <p className="text-[11px] font-black text-text dark:text-white">
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-[9px] font-black text-text/30 dark:text-white/30 uppercase tracking-tighter">
                      {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        className="w-8 h-8 rounded-full border border-sidebar-border flex items-center justify-center text-text/40 dark:text-white/40 hover:bg-[#38BDF2] hover:text-white hover:border-[#38BDF2] transition-all"
                        onClick={(e) => { e.stopPropagation(); openThread(t); }}
                      >
                        <ICONS.Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="w-8 h-8 rounded-full border border-sidebar-border flex items-center justify-center text-text/40 dark:text-white/40 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.notification_id); }}
                      >
                        <ICONS.Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-300" onClick={() => setSelectedTicket(null)}>
          <div className="relative w-full max-w-xl max-h-[85vh] bg-surface shadow-2xl rounded-2xl border border-sidebar-border overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-sidebar-border flex items-center justify-between bg-surface/50 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedTicket(null)} className="w-8 h-8 flex items-center justify-center hover:bg-background rounded-lg text-text dark:text-white transition-all">
                  <ICONS.ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-base font-black text-text dark:text-white tracking-tight">{selectedTicket.type === 'EVENT_REPORT' ? 'Incident Investigation' : 'Ticket Resolution'}</h3>
                  <p className="text-[8px] font-black text-text/40 dark:text-white/40 uppercase tracking-[0.2em]">{selectedTicket.notification_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedTicket.type !== 'EVENT_REPORT' && (
                  <button
                    onClick={() => loadMessages(selectedTicket.notification_id)}
                    className="p-1.5 hover:bg-background rounded-lg text-text dark:text-white transition-all"
                    title="Refresh thread"
                  >
                    <ICONS.RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <div className="px-2 py-0.5 bg-background border border-sidebar-border rounded-md text-[9px] font-black uppercase text-text/60 dark:text-white/60">
                  {selectedTicket.type === 'EVENT_REPORT' ? 'Public' : 'Private'}
                </div>
                <button
                  onClick={() => handleDelete(selectedTicket.notification_id)}
                  className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-all"
                  title="Delete case"
                >
                  <ICONS.Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col items-center bg-background/30">
              {/* Main Message (Incident or Ticket Start) */}
              <div className="w-full max-w-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-background border border-sidebar-border flex shrink-0 items-center justify-center shadow-sm overflow-hidden mb-4">
                  {selectedTicket.organizer?.profileImageUrl ? (
                    <img src={selectedTicket.organizer.profileImageUrl} alt="O" className="w-full h-full object-cover" />
                  ) : (
                    <ICONS.ShieldCheck className="w-6 h-6 text-[#38BDF2]" />
                  )}
                </div>

                <div className="w-full space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-col items-center">
                      <h4 className="text-base font-black text-text dark:text-white tracking-tight">{selectedTicket.title}</h4>
                      <span className="text-[8px] font-black text-text/30 dark:text-white/30 uppercase tracking-widest mt-1">{new Date(selectedTicket.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>

                    <div className="p-4 bg-background rounded-2xl border border-sidebar-border w-full shadow-inner">
                      <p className="text-[8px] font-black text-text/30 dark:text-white/30 uppercase tracking-widest mb-2">Message Payload</p>
                      <div className="text-[12px] text-text/70 dark:text-white/70 leading-relaxed">
                        {renderMessageContent(selectedTicket.message)}
                      </div>

                      {/* If it's an Event Report, show the imageUrl if provided in metadata */}
                      {selectedTicket.type === 'EVENT_REPORT' && selectedTicket.metadata?.imageUrl && (
                        <div className="mt-4">
                          <p className="text-[8px] font-black text-text/30 dark:text-white/30 uppercase tracking-widest mb-2">Attachment</p>
                          <img
                            src={selectedTicket.metadata.imageUrl}
                            alt="Report Proof"
                            className="w-full max-h-[180px] object-contain rounded-xl border border-sidebar-border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(selectedTicket.metadata.imageUrl, '_blank')}
                          />
                        </div>
                      )}

                      {/* Additional Info for Reports */}
                      {selectedTicket.type === 'EVENT_REPORT' && (
                        <div className="mt-5 pt-4 border-t border-sidebar-border">
                          <div className="grid grid-cols-2 gap-3 text-left">
                            <div className="min-w-0">
                              <p className="text-[7px] font-black text-text/20 dark:text-white/20 uppercase tracking-widest mb-0.5">Reporter</p>
                              <p className="text-[10px] font-bold text-text dark:text-white truncate">{selectedTicket.metadata?.reporterEmail}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[7px] font-black text-text/20 dark:text-white/20 uppercase tracking-widest mb-0.5">Event</p>
                              <p className="text-[10px] font-bold text-[#38BDF2] truncate">{selectedTicket.metadata?.eventName || 'Unknown'}</p>
                            </div>
                          </div>
                          <div className="mt-5 flex gap-2">
                            <button
                              onClick={() => navigate('/events')}
                              className="flex-1 bg-text dark:bg-white text-background dark:text-[#2E2E2F] py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md"
                            >
                              Moderate
                            </button>
                            <button
                              onClick={() => handleResolve(selectedTicket.notification_id)}
                              className="flex-1 bg-text/10 dark:bg-white/10 text-text dark:text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-text/20 dark:hover:bg-white/20 transition-all"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reply Thread (Only for Support Tickets) */}
                  {selectedTicket.type !== 'EVENT_REPORT' && (
                    <div className="space-y-4 pt-2 w-full">
                      {(ticketMessages[selectedTicket.notification_id] || []).map((m) => (
                        <div key={m.message_id} className={`flex flex-col gap-1 ${m.is_admin_reply ? 'items-end' : 'items-start'}`}>
                          <div className={`flex items-end gap-2 ${m.is_admin_reply ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center border border-sidebar-border bg-background shadow-sm overflow-hidden`}>
                              {m.is_admin_reply ? (
                                <img src="/lgo.webp" alt="S" className="w-full h-full object-contain p-0.5" />
                              ) : (
                                selectedTicket.organizer?.profileImageUrl ? (
                                  <img src={selectedTicket.organizer.profileImageUrl} alt="O" className="w-full h-full object-cover" />
                                ) : (
                                  <ICONS.User className="w-3 h-3 text-text/20 dark:text-white/20" />
                                )
                              )}
                            </div>
                            <div className={`px-3 py-2 rounded-xl text-[11px] text-left shadow-sm ${m.is_admin_reply
                                ? 'bg-[#38BDF2] text-white rounded-br-none'
                                : 'bg-background text-text dark:text-white rounded-bl-none border border-sidebar-border'
                              }`}>
                              {renderMessageContent(m.message)}
                            </div>
                          </div>
                          <p className={`text-[7px] font-black uppercase tracking-tighter text-text/30 dark:text-white/30 ${m.is_admin_reply ? 'mr-8' : 'ml-8'}`}>
                            {m.is_admin_reply ? 'Admin' : (selectedTicket.organizer?.organizerName || 'Org')} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reply Footer (Only for Support Tickets) */}
            {selectedTicket.type !== 'EVENT_REPORT' && (
              <div className="p-4 bg-surface border-t border-sidebar-border">
                {!(selectedTicket.metadata?.status === 'resolved' || selectedTicket.is_read) ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <textarea
                        placeholder="Type response..."
                        className="w-full py-2.5 pl-4 pr-12 bg-background border-2 border-transparent rounded-xl text-[11px] font-bold focus:border-[#38BDF2]/40 transition-all outline-none text-text dark:text-white resize-none min-h-[60px]"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button
                        disabled={!replyText.trim() || isSending}
                        onClick={handleReply}
                        className="absolute right-2 bottom-2 w-8 h-8 bg-transparent border-2 border-[#38BDF2] text-[#38BDF2] rounded-lg flex items-center justify-center hover:bg-[#38BDF2] hover:text-white transition-all shadow-sm disabled:opacity-20"
                      >
                        <ICONS.Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleResolve(selectedTicket.notification_id)}
                      className="w-full text-[8px] font-black uppercase tracking-widest text-text/20 dark:text-white/20 hover:text-text dark:hover:text-white transition-all py-1"
                    >
                      Mark Resolved
                    </button>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-[11px] font-black text-text/20 dark:text-white/20 uppercase tracking-[0.4em]">Administrative Case Closed</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
