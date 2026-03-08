import React, { useState, useEffect } from 'react';
import { Card, Button, PageLoader } from '../../components/Shared';
import { apiService } from '../../services/apiService';
import { ICONS } from '../../constants';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('all');

  useEffect(() => {
    loadTransactions();
  }, [page, filter]);

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

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'completed': 'bg-green-100 text-green-800 border-green-200',
      'succeeded': 'bg-green-100 text-green-800 border-green-200',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'processing': 'bg-blue-100 text-blue-800 border-blue-200',
      'failed': 'bg-red-100 text-red-800 border-red-200',
      'expired': 'bg-gray-100 text-gray-800 border-gray-200'
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
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#2E2E2F] tracking-tight">Reports</h1>
          <p className="text-[#2E2E2F]/60 font-medium mt-1">View all transactions and orders</p>
        </div>
        <Button 
          onClick={loadTransactions}
          className="px-4 py-2 rounded-xl font-black text-[10px]"
        >
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 rounded-2xl border-[#2E2E2F]/10 bg-gradient-to-br from-[#38BDF2]/10 to-[#38BDF2]/5">
          <p className="text-[10px] font-semibold text-[#2E2E2F]/60 uppercase tracking-widest">Total Transactions</p>
          <p className="text-3xl font-black text-[#2E2E2F] mt-2">{transactions.length}</p>
        </Card>
        
        <Card className="p-6 rounded-2xl border-[#2E2E2F]/10 bg-gradient-to-br from-green-50 to-green-100/50">
          <p className="text-[10px] font-semibold text-[#2E2E2F]/60 uppercase tracking-widest">Completed Revenue</p>
          <p className="text-3xl font-black text-green-700 mt-2">{formatCurrency(completedAmount)}</p>
        </Card>
        
        <Card className="p-6 rounded-2xl border-[#2E2E2F]/10 bg-gradient-to-br from-[#2E2E2F]/5 to-[#2E2E2F]/10">
          <p className="text-[10px] font-semibold text-[#2E2E2F]/60 uppercase tracking-widest">Total Amount</p>
          <p className="text-3xl font-black text-[#2E2E2F] mt-2">{formatCurrency(totalAmount)}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 rounded-2xl border-[#2E2E2F]/10 bg-[#F2F2F2]">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-[#2E2E2F]/60 uppercase tracking-widest mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                    filter === status
                      ? 'bg-[#38BDF2] text-white shadow-lg'
                      : 'bg-white text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="p-4 rounded-2xl border-red-200 bg-red-50">
          <p className="text-red-600 font-semibold text-sm">{error}</p>
        </Card>
      )}

      {/* Transactions Table */}
      <Card className="overflow-hidden rounded-2xl border-[#2E2E2F]/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F2F2F2] border-b border-[#2E2E2F]/10">
                <th className="text-left p-4 text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-widest">Order ID</th>
                <th className="text-left p-4 text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-widest">Event</th>
                <th className="text-left p-4 text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-widest">Customer</th>
                <th className="text-right p-4 text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-widest">Amount</th>
                <th className="text-center p-4 text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-widest">Status</th>
                <th className="text-right p-4 text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#2E2E2F]/50 font-medium">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction, index) => (
                  <tr 
                    key={transaction.orderId || index} 
                    className="border-b border-[#2E2E2F]/5 hover:bg-[#38BDF2]/5 transition-colors"
                  >
                    <td className="p-4">
                      <span className="text-xs font-mono text-[#2E2E2F]/70">
                        {transaction.orderId?.slice(0, 8) || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-semibold text-[#2E2E2F]">
                        {transaction.eventName || 'Unknown Event'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-medium text-[#2E2E2F]">
                          {transaction.customerName || 'Unknown'}
                        </p>
                        <p className="text-xs text-[#2E2E2F]/50">
                          {transaction.customerEmail || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-black text-[#2E2E2F]">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(transaction.paymentStatus)}
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-xs text-[#2E2E2F]/60">
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
          <div className="p-4 border-t border-[#2E2E2F]/10 flex justify-between items-center">
            <p className="text-xs text-[#2E2E2F]/60">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg text-[10px] font-black disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg text-[10px] font-black disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
