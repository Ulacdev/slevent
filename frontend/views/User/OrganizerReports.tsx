import React, { useState, useEffect } from 'react';
import { Card, Button, PageLoader, Checkbox } from '../../components/Shared';
import { apiService } from '../../services/apiService';
import { ICONS } from '../../constants';
import { useToast } from '../../context/ToastContext';

interface Transaction {
  orderId: string;
  eventId: string;
  eventName: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  createdAt: string;
  quantity?: number;
}

const formatCurrency = (amount: number, currency: string = 'SGD') => {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export const OrganizerReports: React.FC = () => {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

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
    if (selectedRows.size === transactions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(transactions.map(t => t.orderId || '')));
    }
  };

  const handlePrintReports = () => {
    const selectedData = transactions.filter(t => selectedRows.has(t.orderId || ''));
    const printContent = selectedData.length > 0 ? selectedData : transactions;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Transactions Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
        </style></head><body>
        <h1>Transactions Report</h1>
        <table>
          <thead><tr><th>Order ID</th><th>Event</th><th>Attendee</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${printContent.map(t => `<tr><td>${t.orderId || ''}</td><td>${t.eventName || ''}</td><td>${t.customerName || ''}</td><td>${t.amount || 0}</td><td>${t.paymentStatus || ''}</td><td>${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}</td></tr>`).join('')}
          </tbody>
        </table></body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportReports = () => {
    const selectedData = transactions.filter(t => selectedRows.has(t.orderId || ''));
    const exportData = selectedData.length > 0 ? selectedData : transactions;
    const csvContent = `Order ID,Event,Attendee,Email,Amount,Status,Date\n${exportData.map(t => `${t.orderId || ''},${t.eventName || ''},${t.customerName || ''},${t.customerEmail || ''},${t.amount || 0},${t.paymentStatus || ''},${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}`).join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkArchive = async () => {
    if (selectedRows.size === 0) return;
    if (!confirm(`Are you sure you want to archive ${selectedRows.size} transactions?`)) return;
    
    setLoading(true);
    try {
      const selectedIds = Array.from(selectedRows);
      await apiService.bulkArchiveTransactions(selectedIds);
      showToast('success', `${selectedRows.size} transactions moved to archive.`);
      setSelectedRows(new Set());
      loadTransactions();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to archive transactions.');
    } finally {
      setLoading(false);
    }
  };

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadTransactions();
    loadProfile();
  }, [page, filter]);

  const loadProfile = async () => {
    try {
      const organizer = await apiService.getMyOrganizer();
      setProfile(organizer);
    } catch (err) {
      console.error('Failed to load organizer profile for reports plan check', err);
    }
  };

  const hasAdvancedReports = Boolean(profile?.plan?.features?.enable_advanced_reports || profile?.plan?.features?.advanced_reports);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getRecentTransactions(page, 20);

      let filtered = data.transactions || [];

      // Filter by payment status
      if (filter !== 'all') {
        filtered = filtered.filter((t: Transaction) =>
          t.paymentStatus?.toLowerCase() === filter
        );
      }

      setTransactions(filtered);
      setTotalPages(Math.ceil((data.total || 1) / 20));
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!hasAdvancedReports) {
      showToast('info', 'Advanced Reports are only available on Professional and Enterprise plans.');
      return;
    }
    // Call the new backend API to trigger spreadsheet download
    apiService.exportAllReports();
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'completed': 'bg-green-500/10 text-green-500 border-green-500/20',
      'succeeded': 'bg-green-500/10 text-green-500 border-green-500/20',
      'pending': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'processing': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'failed': 'bg-red-500/10 text-red-500 border-red-500/20',
      'expired': 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    };

    const colorClass = statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';

    return (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
        {status || 'Unknown'}
      </span>
    );
  };

  // Calculate totals
  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const completedAmount = transactions
    .filter(t => t.paymentStatus?.toLowerCase() === 'completed' || t.paymentStatus?.toLowerCase() === 'succeeded')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  if (loading && transactions.length === 0) {
    return <PageLoader label="Loading reports..." />;
  }

  return (
    <div className="pb-16 space-y-6">
      {/* Page Header */}
      <div className="px-2 bg-transparent border-2 border-sidebar-border rounded-xl p-6 md:p-8 mb-4">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-[2rem] font-semibold text-[#2E2E2F] dark:text-white tracking-tight uppercase">
              Transaction Reports
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#2E2E2F] dark:text-white/60">
              Analyze revenue flow, monitor audience conversions, and export operational datasets.
            </p>
          </div>
          <div className="flex flex-row md:flex-col gap-3 shrink-0">
            <Button
              onClick={handleExport}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${!hasAdvancedReports ? 'opacity-50 grayscale bg-[#2E2E2F]/10 text-[#2E2E2F] dark:text-white' : 'bg-[#38BDF2] text-white hover:bg-[#2E2E2F] hover:-translate-y-0.5 shadow-sm'}`}
            >
              {!hasAdvancedReports && <ICONS.Shield className="w-4 h-4" />}
              Export CSV
            </Button>
            <Button
              onClick={loadTransactions}
              className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-transparent border border-sidebar-border text-[#2E2E2F] dark:text-white hover:bg-background/5 dark:bg-white/5"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group bg-transparent border-2 border-sidebar-border rounded-xl p-6 transition-all duration-300 hover:border-[#38BDF2] hover:shadow-sm">
          <p className="text-xs font-bold text-[#38BDF2] uppercase tracking-widest mb-3">Total Transactions</p>
          <p className="text-3xl font-extrabold text-[#2E2E2F] dark:text-white leading-none mb-1">{transactions.length}</p>
        </div>

        <div className="group bg-transparent border-2 border-sidebar-border rounded-xl p-6 transition-all duration-300 hover:border-green-500 hover:shadow-sm">
          <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-3">Completed Revenue</p>
          <p className="text-3xl font-extrabold text-[#2E2E2F] dark:text-white leading-none mb-1">{formatCurrency(completedAmount)}</p>
        </div>

        <div className={`relative group bg-transparent border-2 border-sidebar-border rounded-xl p-6 transition-all duration-300 ${!hasAdvancedReports ? 'cursor-not-allowed border-sidebar-border/20' : 'hover:border-[#2E2E2F] dark:hover:border-white/40 hover:shadow-sm'}`}>
          <p className="text-xs font-bold text-[#2E2E2F] dark:text-white/60 uppercase tracking-widest mb-3">Total Pending & Failed</p>
          <div className={`${!hasAdvancedReports ? 'blur-md select-none opacity-50' : ''}`}>
             <p className="text-3xl font-extrabold text-[#2E2E2F] dark:text-white leading-none mb-1">{formatCurrency(totalAmount - completedAmount)}</p>
          </div>
          {!hasAdvancedReports && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center z-10">
              <div className="bg-surface border border-sidebar-border text-[#2E2E2F] dark:text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg">
                <ICONS.Shield className="w-3.5 h-3.5 text-[#38BDF2]" />
                Pro Feature
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex bg-transparent border-2 border-sidebar-border/10 rounded-xl p-1.5 w-full md:w-auto">
          {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === status
                  ? 'bg-surface text-[#2E2E2F] dark:text-white shadow-lg border border-sidebar-border'
                  : 'bg-transparent text-[#2E2E2F] dark:text-white/60 hover:text-[#2E2E2F] dark:hover:text-white'
                }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-3 mr-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-2 h-2 rounded-full bg-[#38BDF2] animate-pulse" />
              <span className="text-[10px] font-black text-[#2E2E2F] dark:text-white uppercase tracking-widest bg-surface px-3.5 py-1.5 rounded-lg border border-sidebar-border">
                {selectedRows.size} Selected
              </span>
              <button 
                onClick={handleBulkArchive} 
                className="inline-flex items-center justify-center font-black tracking-wide rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 !bg-transparent border-2 border-solid border-red-500 !text-red-500 px-6 py-2.5 text-[12px] hover:!bg-red-500 hover:!text-white flex items-center gap-2 group"
              >
                <ICONS.Trash className="w-5 h-5 text-red-500 group-hover:text-white transition-colors" />
                ARCHIVE ({selectedRows.size})
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 ml-2">
            <button 
              onClick={handlePrintReports} 
              className="flex items-center justify-center h-[52px] w-[52px] bg-[#38BDF2] border-2 border-[#38BDF2] rounded-2xl text-white hover:bg-[#2E2E2F] hover:border-[#2E2E2F] transition-all shadow-md group" 
              title="Print Reports"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            </button>
            <button 
              onClick={handleExportReports} 
              className="flex items-center justify-center h-[52px] w-[52px] bg-[#38BDF2] border-2 border-[#38BDF2] rounded-2xl text-white hover:bg-[#2E2E2F] hover:border-[#2E2E2F] transition-all shadow-md group" 
              title="Export CSV"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 rounded-xl border-red-500 border-2 bg-red-50 text-red-700 font-bold text-sm">
          {error}
        </Card>
      )}

      {/* Transactions Table */}
      <div className="bg-transparent border-2 border-sidebar-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-transparent border-b border-sidebar-border">
                <th className="px-4 py-4 text-xs font-bold text-[#2E2E2F] dark:text-white uppercase tracking-widest whitespace-nowrap w-12 text-center align-middle">
                   <div className="flex justify-center">
                      <Checkbox 
                        checked={selectedRows.size === transactions.length && transactions.length > 0} 
                        onChange={toggleAll} 
                        size="sm"
                      />
                   </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-[#2E2E2F] dark:text-white uppercase tracking-widest whitespace-nowrap">Order ID</th>
                <th className="px-6 py-4 text-xs font-bold text-[#2E2E2F] dark:text-white uppercase tracking-widest whitespace-nowrap">Event</th>
                <th className="px-6 py-4 text-xs font-bold text-[#2E2E2F] dark:text-white uppercase tracking-widest whitespace-nowrap">Attendee</th>
                <th className="px-6 py-4 text-xs font-bold text-[#2E2E2F] dark:text-white uppercase tracking-widest text-right whitespace-nowrap">Size</th>
                <th className="px-6 py-4 text-xs font-bold text-[#2E2E2F] dark:text-white uppercase tracking-widest text-right whitespace-nowrap">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-[#2E2E2F] dark:text-white uppercase tracking-widest text-center whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-[#2E2E2F] dark:text-white uppercase tracking-widest text-right whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#2E2E2F] dark:text-white font-bold text-sm">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction, index) => (
                  <tr
                    key={transaction.orderId || index}
                    className={`border-b border-sidebar-border hover:bg-[#38BDF2]/5 transition-colors ${selectedRows.has(transaction.orderId || '') ? 'bg-[#38BDF2]/10' : ''}`}
                  >
                    <td className="px-4 py-4 align-middle">
                      <div className="flex justify-center">
                        <Checkbox 
                          checked={selectedRows.has(transaction.orderId || '')} 
                          onChange={() => toggleRow(transaction.orderId || '')} 
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-bold font-mono text-[#2E2E2F] dark:text-white uppercase tracking-widest bg-background rounded">
                        {transaction.orderId?.slice(0, 8) || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-[#2E2E2F] dark:text-white truncate max-w-[200px] inline-block">
                        {transaction.eventName || 'Unknown Event'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-[#2E2E2F] dark:text-white">
                          {transaction.customerName || 'Unknown'}
                        </p>
                        <p className="text-xs font-medium text-[#2E2E2F] dark:text-white/60 mt-0.5">
                          {transaction.customerEmail || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[14px] font-bold text-[#2E2E2F] dark:text-white">{transaction.quantity || 1}</span>
                        <span className="text-[10px] font-black text-[#2E2E2F] dark:text-white uppercase tracking-widest">Tickets</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-[#2E2E2F] dark:text-white">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(transaction.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-medium text-[#2E2E2F] dark:text-white/60">
                        {formatDate(transaction.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-8 py-5 border-t-2 border-sidebar-border flex justify-between items-center bg-surface">
            <p className="text-[10px] font-black text-[#2E2E2F] dark:text-white uppercase tracking-widest">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-background border-2 border-sidebar-border text-[#2E2E2F] dark:text-white hover:border-[#2E2E2F]/20 disabled:opacity-50 transition-all"
              >
                Previous
              </Button>
              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-background border-2 border-sidebar-border text-[#2E2E2F] dark:text-white hover:border-[#2E2E2F]/20 disabled:opacity-50 transition-all"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
