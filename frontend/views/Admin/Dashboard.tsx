
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { AnalyticsSummary, UserRole, AdminPlan, OrganizerProfile } from '../../types';
import { Card, PageLoader, Modal, Button, Badge } from '../../components/Shared';
import { ICONS } from '../../constants';
import { useUser } from '../../context/UserContext';
import { CreatePlanModal } from '../../components/CreatePlanModal';
import { PortalSkeleton, PortalCardSkeleton } from '../../components/Shared/Skeleton';

// ── Types ─────────────────────────────────────────────────────────────────
type PlanMetrics = {
  revenueByPlan: { name: string; value: number }[];
  dailyMetrics: { date: string; count: number; revenue: number }[];
};
type HealthMetrics = {
  planDistribution: { name: string; count: number }[];
  totalOrganizers: number;
  activeSubscribers: number;
};

// ── Hero Stat Card ─────────────────────────────────────────────────────────
const HeroCard = React.memo<{
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  trendColor: string;
}>(({ title, value, sub, icon, iconBg, trendColor }) => (
  <div className="p-4 sm:p-5 rounded-2xl border border-sidebar-border bg-surface flex items-center gap-4 hover:scale-[1.01] transition-transform cursor-default shadow-sm">
    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${iconBg}`}>
      <div className="[&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6">{icon}</div>
    </div>
    <div>
      <p className="text-[10px] sm:text-xs font-bold text-text/50 dark:text-white/40 mb-0.5 uppercase tracking-wider">{title}</p>
      <p className="text-xl sm:text-2xl font-black text-text dark:text-white">{value}</p>
      <p className={`text-[9px] sm:text-[10px] font-bold mt-1 ${trendColor}`}>{sub}</p>
    </div>
  </div>
));

// ── Metric Detail Card ─────────────────────────────────────────────────────
const MetricCard = React.memo<{
  title: string;
  value: string | number;
  trend: string;
  trendColor: string;
  icon: React.ReactNode;
  link?: () => void;
}>(({ title, value, trend, trendColor, icon, link }) => (
  <Card className="p-5 sm:p-6 bg-surface border border-sidebar-border rounded-2xl shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-2xl sm:text-3xl font-black text-text dark:text-white">{value}</p>
        <p className="text-xs sm:text-sm font-bold text-text/40 dark:text-white/40 mt-1">{title}</p>
      </div>
      <div className="text-text/20 dark:text-white/20 [&>svg]:w-6 [&>svg]:h-6 sm:[&>svg]:w-8 sm:[&>svg]:h-8">{icon}</div>
    </div>
    <div className="flex justify-between items-center mt-6 sm:mt-8">
      <span className={`text-[10px] sm:text-xs font-black ${trendColor}`}>{trend}</span>
      {link && (
        <button onClick={link} className="text-[10px] sm:text-xs font-black text-[#38BDF2] hover:underline">View</button>
      )}
    </div>
  </Card>
));

// ── Main Dashboard ─────────────────────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useUser();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [planMetrics, setPlanMetrics] = useState<PlanMetrics | null>(null);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);

  // Date Range Filter
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const csvRows = [
      ['Dashboard Summary Report'],
      ['Date Range', `${dateRange.start} to ${dateRange.end}`],
      [''],
      ['Metric', 'Value'],
      ['Total Organizers', totalOrganizers],
      ['Total Plan Revenue', `PHP ${totalRevenue.toLocaleString()}`],
      ['Active Subscribers', activeSubscribers],
      ['Support Queue', pendingSupport],
      [''],
      ['Plan Distribution'],
      ...plans.map(p => [p.name, health?.planDistribution.find(d => d.name === p.name)?.count || 0])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const start = dateRange.start;
        const end = dateRange.end;

        const [analytics, pm, h, adminPlans, orgs, txData, logs, mp] = await Promise.allSettled([
          apiService.getAnalytics(undefined, start, end),
          apiService.getPlanMetrics(start, end),
          apiService.getSubscriptionHealth(start, end),
          apiService.getAdminPlans(),
          apiService.getOrganizers(),
          apiService.getRecentTransactions(1, 5, start, end),
          apiService.getAuditLogs(1, 15),
          apiService.getManagedPayouts()
        ]);
        let supportResult: any[] = [];
        try {
          const s = await (apiService.getAdminSupportTickets as any)(start, end);
          supportResult = Array.isArray(s) ? s : s?.tickets || [];
        } catch { }
        setSupportTickets(supportResult);
        if (analytics.status === 'fulfilled') setAnalytics(analytics.value);
        if (pm.status === 'fulfilled') setPlanMetrics(pm.value);
        if (h.status === 'fulfilled') setHealth(h.value);
        if (adminPlans.status === 'fulfilled') setPlans(adminPlans.value);
        if (orgs.status === 'fulfilled') setOrganizers(orgs.value);
        if (txData.status === 'fulfilled') setRecentTx((txData.value as any)?.transactions || (txData.value as any)?.items || (txData.value as any)?.data || []);
        if (logs.status === 'fulfilled') {
          const l = logs.value;
          setAuditLogs((l as any)?.items || (l as any)?.data || (l as any)?.logs || (Array.isArray(l) ? l : []));
        }
        if (mp.status === 'fulfilled') {
          setPayouts((mp.value as any)?.items || []);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dateRange.start, dateRange.end]);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const handleMarkPaid = async (orderId: string) => {
    const ref = window.prompt("Enter payment reference (optional):");
    if (ref === null) return;
    try {
      setUpdatingId(orderId);
      await apiService.updatePayoutStatus(orderId, {
        status: 'DISTRIBUTED',
        referenceId: ref,
        notes: `Platform distribution confirmed on ${new Date().toLocaleDateString()}`
      });
      // Refresh
      const mpResp = await apiService.getManagedPayouts();
      setPayouts(mpResp.items || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <PageLoader variant="page" label="Loading Dashboard..." />;

  // Computed values
  const totalRevenue = planMetrics?.revenueByPlan.reduce((s, p) => s + p.value, 0) || 0;
  const activeSubscribers = health?.activeSubscribers || analytics?.activeSubscriptions || 0;
  const totalOrganizers = health?.totalOrganizers || organizers.length || 0;
  const activePlans = plans.filter(p => p.isActive).length;
  const totalPlans = plans.length;
  const pendingSupport = supportTickets.filter(t => t.status === 'open' || t.status === 'OPEN' || !t.resolvedAt).length;

  const totalTicketingFees = payouts.reduce((sum, p) => {
    const b = p.metadata?.payout?.breakdown;
    // Show only the actual Platform/System Commission to Admin
    return sum + (b ? Number(b.platformFee || 0) : 0);
  }, 0);
  const planDist = health?.planDistribution || planMetrics?.revenueByPlan.map(p => ({ name: p.name, count: 0 })) || [];
  const barData = planMetrics?.dailyMetrics?.slice(-10).map(d => d.count) || [3, 6, 4, 8, 5, 9, 4, 6, 10, 7];
  const barMax = Math.max(...barData, 1);

  // Plan colors
  const planColors: Record<string, string> = {
    Basic: '#38BDF2',
    Silver: '#64748B',
    Gold: '#EAB308',
    default: '#38BDF2',
  };

  return (
    <>
      {/* Print-Only Elements - Placed outside zoomed container for fixed positioning to work on all pages */}
      <div className="print-watermark no-print-screen">
        <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg" alt="Watermark" />
      </div>

      <div className="print-report-header-repeated no-print-screen">
        <div className="flex items-center justify-between border-b-2 border-[#38BDF2] pb-3 mb-6">
          <div>
            <p className="text-lg font-black text-[#1E3A8A] leading-tight">StartupLab Business Ticketing</p>
            <p className="text-[10px] font-bold text-[#38BDF2] uppercase tracking-[0.2em]">Platform Analytics Report</p>
          </div>
          <div className="text-right flex flex-col justify-end">
            <p className="text-[10px] font-bold text-gray-800">Range: {dateRange.start} — {dateRange.end}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Admin Report • {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8" style={{ zoom: 0.85 }}>
        <style>{`
          @media screen {
            .no-print-screen { display: none !important; }
          }
          @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          /* Hide non-essential UI */
          .sidebar, .nav-header, button, .no-print, .date-range-picker {
            display: none !important;
          }

          /* Watermark - Repeats on every page due to position: fixed */
          .print-watermark {
            display: flex !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            opacity: 0.15 !important;
            z-index: 9999 !important;
            pointer-events: none !important;
            justify-content: center;
            align-items: center;
          }

          .print-watermark img {
            width: 700px;
            height: auto;
          }

          /* Small logo that repeats at the top of every page */
          .print-report-header-repeated {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            padding: 10px 40px !important;
            z-index: 9998 !important;
            background: white !important;
          }

          /* Professional Report Header */
          .print-header {
            display: block !important;
            margin-bottom: 40px;
            border-bottom: 2px solid #38BDF2;
            padding-bottom: 20px;
          }

          .print-header h1 {
            font-size: 28px !important;
            font-weight: 800 !important;
            margin-bottom: 4px !important;
          }

          .print-header p {
            font-size: 14px !important;
            color: #64748B !important;
          }

          /* Card optimization for print */
          .p-4, .p-5, .p-6 {
            border: 1px solid #E2E8F0 !important;
            box-shadow: none !important;
            break-inside: avoid;
            background: white !important;
          }

          .space-y-8 {
            gap: 20px !important;
          }

          /* Force black text for contrast */
          p, h1, h2, h3, span, td, th {
            color: black !important;
          }

          .text-white {
            color: black !important;
          }

          /* Hide the main dashboard layout */
          .dashboard-main-content {
            display: none !important;
          }

          .print-report-content {
            display: block !important;
            margin-top: 80px !important;
          }

          /* Force full width and table layout, overriding any mobile block styles */
          table {
            display: table !important;
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            margin-bottom: 40px !important;
            border: 1px solid #E5E7EB !important;
            background-color: transparent !important;
          }

          thead { display: table-header-group !important; }
          tbody { display: table-row-group !important; }
          tr { display: table-row !important; }
          th, td { 
            display: table-cell !important;
            border: 1px solid #E5E7EB !important;
            padding: 14px 18px !important;
            text-align: left !important;
            font-size: 13px !important;
            color: #111827 !important;
            vertical-align: middle !important;
          }

          th {
            background-color: #F9FAFB !important;
            color: #6B7280 !important;
            font-weight: 700 !important;
            text-transform: none !important;
            font-size: 14px !important;
          }

          /* Match the clean look from the reference */
          tbody tr:hover {
            background-color: #F3F4F6 !important;
          }

          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          .font-bold { font-weight: 700 !important; }
          .italic { font-style: italic !important; }
          .text-gray-600 { color: #4B5563 !important; }
        }

        /* Default hidden */
        .print-watermark, .print-header, .print-report-content, .print-report-header-repeated {
          display: none;
        }
      `}</style>

        {/* Print-Only Report Content (Numbers and Data) */}
        <div className="print-report-content">
          <div className="print-header text-center mb-12 pt-8">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-[0.3em] border-b-4 border-black inline-block pb-2">Full Analytics Summary</h2>
          </div>

          <section>
            <h2 className="text-xl font-black mb-4 border-b-2 border-black pb-2 uppercase tracking-widest">I. Executive Platform Summary</h2>
            <table>
              <thead>
                <tr>
                  <th>Total Organizers</th>
                  <th>Total Subscribers</th>
                  <th>Open Support Tickets</th>
                  <th>Platform Revenue (Total)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center font-bold">{health?.totalOrganizers || 0}</td>
                  <td className="text-center font-bold">{health?.activeSubscribers || 0}</td>
                  <td className="text-center font-bold">{pendingSupport}</td>
                  <td className="text-center font-bold">₱{totalRevenue.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-black mb-4 border-b-2 border-black pb-2 uppercase tracking-widest">II. Key Performance Indicators</h2>
            <table>
              <thead>
                <tr>
                  <th>Metric Name</th>
                  <th>Current Value</th>
                  <th>Context / Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-bold">Total Organizers</td>
                  <td className="text-center font-bold">{totalOrganizers}</td>
                  <td className="text-gray-600 italic">Registered on platform within selected range</td>
                </tr>
                <tr>
                  <td className="font-bold">New Registrations</td>
                  <td className="text-center font-bold">{analytics?.totalRegistrations || 0}</td>
                  <td className="text-gray-600 italic">Event ticket signups within range</td>
                </tr>
                <tr>
                  <td className="font-bold">Gross Ticket Sales</td>
                  <td className="text-center font-bold text-blue-600">₱{totalRevenue.toLocaleString()}</td>
                  <td className="text-gray-600 italic">Combined ticket sales revenue</td>
                </tr>
                <tr>
                  <td className="font-bold">Attendance Rate</td>
                  <td className="text-center font-bold text-green-600">{analytics?.attendanceRate?.toFixed(1) || 0}%</td>
                  <td className="text-gray-600 italic">Percentage of tickets checked-in</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-black mb-4 border-b-2 border-black pb-2 uppercase tracking-widest">III. Subscription Plan Overview</h2>
            <table>
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Monthly Price</th>
                  <th>Active Subscribers</th>
                  <th>Total Revenue (Range)</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(p => {
                  const count = health?.planDistribution.find(d => d.name === p.name)?.count || 0;
                  const revenue = planMetrics?.revenueByPlan.find(r => r.name === p.name)?.value || 0;
                  return (
                    <tr key={p.planId}>
                      <td className="font-bold">{p.name}</td>
                      <td className="text-right">₱{p.monthlyPrice.toLocaleString()}/mo</td>
                      <td className="text-center font-bold">{count}</td>
                      <td className="text-right font-bold">₱{revenue.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-black mb-4 border-b-2 border-black pb-2 uppercase tracking-widest">IV. Daily Growth Metrics</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>New Subscribers</th>
                  <th>Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {(planMetrics?.dailyMetrics || []).slice(-15).reverse().map((day, idx) => (
                  <tr key={idx}>
                    <td className="font-bold">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td className="text-center">{day.count} new</td>
                    <td className="text-center">₱{day.revenue?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-black mb-4 border-b-2 border-black pb-2 uppercase tracking-widest">V. Audit & Activity Log</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Entity / Customer</th>
                  <th>Action / Event</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.slice(0, 15).map((tx, idx) => (
                  <tr key={idx}>
                    <td className="text-center">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td>{tx.customerName || 'System'}</td>
                    <td>{tx.eventName || 'Subscription'}</td>
                    <td className="text-center font-bold">₱{tx.amount?.toLocaleString()}</td>
                    <td className="text-center uppercase font-bold">{tx.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="mt-8 flex justify-between items-start text-gray-500 text-xs border-t pt-4 border-gray-200">
            <div>
              <p className="font-medium">Total Metric Categories: 5</p>
            </div>
            <div className="text-right">
              <p>Printed on: {new Date().toLocaleString()}</p>
              <p>Printed by: Administrator Portal</p>
            </div>
          </div>
        </div>

        <div className="bg-background pb-16 space-y-6 px-2 font-sans dashboard-main-content">
          {/* ── Header ── */}
          <div className="pt-4 flex flex-col md:flex-row md:items-start justify-between gap-6 px-2">
            <div>
              <h1 className="text-3xl md:text-[2rem] font-black text-text dark:text-white tracking-tighter uppercase">Dashboard</h1>
              <p className="mt-1 text-sm font-semibold text-text/60 dark:text-white/60">
                Manage organizers, subscriptions, and platform health
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 no-print">
              <div className="flex items-center gap-2 bg-surface border border-sidebar-border p-1.5 rounded-xl shadow-sm">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-transparent text-[11px] font-bold text-text dark:text-white outline-none px-2 py-1"
                />
                <span className="text-text/30 text-[10px] font-black uppercase">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-transparent text-[11px] font-bold text-text dark:text-white outline-none px-2 py-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="w-9 h-9 flex items-center justify-center bg-[#38BDF2] border-2 border-[#38BDF2] rounded-full text-white hover:bg-text dark:hover:bg-white dark:hover:text-background transition-all shadow-lg group active:scale-95"
                    title="Print Dashboard"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  </button>
                  <button
                    onClick={handleExport}
                    className="w-9 h-9 flex items-center justify-center bg-[#38BDF2] border-2 border-[#38BDF2] rounded-full text-white hover:bg-text dark:hover:bg-white dark:hover:text-background transition-all shadow-lg group active:scale-95"
                    title="Export Report"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </button>
                </div>
                <button
                  onClick={() => setIsCreatePlanOpen(true)}
                  className="bg-[#38BDF2] text-white px-6 py-2.5 rounded-xl font-black text-[13px] uppercase tracking-wide flex items-center gap-2 shadow-lg hover:bg-text dark:hover:bg-white dark:hover:text-background transition-all active:scale-95"
                >
                  <ICONS.Plus className="w-4 h-4" /> Create New Plan
                </button>
              </div>
            </div>
          </div>

          {/* ── Row 1: Hero Stats ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <HeroCard
              title="Total Organizers"
              value={totalOrganizers}
              sub="Registered on platform"
              icon={<ICONS.Users />}
              iconBg="bg-[#38BDF2]"
              trendColor="text-[#38BDF2]"
            />
            <HeroCard
              title="Total Plan Revenue"
              value={`₱${totalRevenue.toLocaleString()}`}
              sub="From all subscriptions"
              icon={<ICONS.TrendingUp />}
              iconBg="bg-[#38BDF2]"
              trendColor="text-[#38BDF2]"
            />
            <HeroCard
              title="Active Subscribers"
              value={activeSubscribers}
              sub="Currently subscribed"
              icon={<ICONS.CheckCircle />}
              iconBg="bg-[#38BDF2]"
              trendColor="text-[#38BDF2]"
            />
            <HeroCard
              title="Support Queue"
              value={pendingSupport}
              sub="Open tickets pending"
              icon={<ICONS.MessageSquare />}
              iconBg="bg-[#38BDF2]"
              trendColor="text-[#38BDF2]"
            />

          </div>


          {/* ── Row 3: Charts ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

            {/* Organizer Growth Bar Chart */}
            <Card className="p-8 bg-surface border border-sidebar-border rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-base font-black text-text dark:text-white">Subscription Growth</h3>
                  <p className="text-[10px] font-bold text-text/40 dark:text-white/40 mt-1">Last 10 Days</p>
                </div>
                <div className="bg-background border border-sidebar-border px-3 py-1.5 rounded-lg text-xs font-black text-text/50 dark:text-white/40">
                  Daily New Subscribers
                </div>
              </div>

              <div className="flex gap-3 h-[260px]">
                {/* Y axis */}
                <div className="flex flex-col justify-between text-[9px] font-bold text-text/30 dark:text-white/20 text-right pr-2 pb-6 pt-1">
                  {[barMax, Math.round(barMax * 0.75), Math.round(barMax * 0.5), Math.round(barMax * 0.25), 0].map((l, i) => (
                    <span key={`y-axis-${l}-${i}`}>{l}</span>
                  ))}
                </div>
                {/* Bars */}
                <div className="flex-1 flex items-end gap-2 pb-6 border-b border-l border-sidebar-border">
                  {barData.map((val, i) => {
                    const h = Math.max((val / barMax) * 100, 4);
                    return (
                      <div key={i} className="flex-1 flex gap-0.5 items-end h-full group cursor-pointer relative">
                        <div
                          className="w-full rounded-t-md bg-[#38BDF2]/30 group-hover:bg-[#38BDF2]/60 transition-colors"
                          style={{ height: `${h * 0.6}%` }}
                        />
                        <div
                          className="w-full rounded-t-md bg-[#38BDF2] group-hover:bg-[#0E94C5] transition-colors"
                          style={{ height: `${h}%` }}
                        />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-text dark:bg-white text-background dark:text-[#2E2E2F] text-[9px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 font-bold transition-all shadow-xl">
                          {val} new
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 flex justify-center gap-8">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#38BDF2]/30" /><span className="text-[10px] font-bold text-text/40 dark:text-white/40">Previous</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#38BDF2]" /><span className="text-[10px] font-bold text-text/40 dark:text-white/40">New Subscribers</span></div>
              </div>
            </Card>

            {/* Plan Distribution + Org Overview */}
            <Card className="p-5 sm:p-8 bg-surface border border-sidebar-border rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-black text-text dark:text-white">Plan Overview</h3>
                  <p className="text-[10px] font-bold text-text/40 dark:text-white/40 mt-1">Organizer Subscriptions</p>
                </div>
              </div>

              {/* Donut SVG */}
              <div className="flex items-center gap-8 py-4">
                <div className="relative w-36 h-36 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-background" strokeWidth="12" />
                    {/* Three ring tracks for plan distribution */}
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#38BDF2" strokeWidth="12"
                      strokeDasharray={`${264 * 0.55} ${264 * 0.45}`} strokeLinecap="round" />
                    <circle cx="50" cy="50" r="28" fill="none" stroke="#64748B" strokeWidth="10"
                      strokeDasharray={`${176 * 0.30} ${176 * 0.70}`} strokeLinecap="round" />
                    <circle cx="50" cy="50" r="16" fill="none" stroke="#EAB308" strokeWidth="8"
                      strokeDasharray={`${100 * 0.15} ${100 * 0.85}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-lg font-black text-text dark:text-white">{activeSubscribers}</p>
                    <p className="text-[9px] font-bold text-text/40 dark:text-white/40">Active</p>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-4">
                  {plans.slice(0, 4).map((plan) => {
                    const color = planColors[plan.name] || planColors.default;
                    const distItem = planDist.find(d => d.name === plan.name);
                    return (
                      <div key={plan.planId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                          <div>
                            <p className="text-xs font-black text-text dark:text-white">{plan.name}</p>
                            <p className="text-[9px] font-bold text-text/40 dark:text-white/40">₱{(plan.monthlyPrice || 0).toLocaleString()}/mo</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-text/60 dark:text-white/60">{distItem?.count ?? '—'} users</span>
                      </div>
                    );
                  })}
                  {plans.length === 0 && (
                    <p className="text-xs text-[#1E293B]/40 dark:text-white/40 font-bold">No plans configured yet.</p>
                  )}
                </div>
              </div>

              {/* Bottom stat strip */}
              <div className="mt-auto pt-6 border-t border-sidebar-border grid grid-cols-3 text-center gap-4">
                <div>
                  <p className="text-2xl font-black text-text dark:text-white">{totalOrganizers}</p>
                  <p className="text-[9px] font-black text-text/30 dark:text-white/30 mt-1">Organizers</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-text dark:text-white">{activeSubscribers}</p>
                  <p className="text-[9px] font-black text-text/30 dark:text-white/30 mt-1">Subscribers</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-text dark:text-white">{pendingSupport}</p>
                  <p className="text-[9px] font-black text-text/30 dark:text-white/30 mt-1">Open Tickets</p>
                </div>
              </div>
            </Card>

          </div>

          {/* ── Row 4: Activity Command Center ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Recent Plan Transactions */}
            <Card className="bg-surface border border-sidebar-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 flex justify-between items-center border-b border-sidebar-border bg-surface">
                <h3 className="font-black text-text dark:text-white flex items-center gap-2">
                  Recent Transactions
                </h3>
              </div>
              <div className="divide-y divide-[#2E2E2F]/5 h-full max-h-[500px] overflow-y-auto custom-scrollbar">
                {recentTx.length === 0 && (
                  <p className="p-10 text-center text-xs font-bold text-[#1E293B]/40">No transactions yet.</p>
                )}
                {recentTx.map((tx, i) => {
                  const statusStr = String(tx.paymentStatus || tx.status || 'COMPLETED').toUpperCase();
                  const isFailed = statusStr === 'FAILED' || statusStr === 'CANCELLED' || statusStr === 'CANCELED';
                  const isPending = statusStr === 'PENDING';
                  return (
                    <div
                      key={tx.orderId || i}
                      onClick={() => setSelectedTx(tx)}
                      className="px-6 py-5 flex items-center justify-between hover:bg-[#38BDF2]/5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-black text-text dark:text-white">{tx.customerName || tx.buyerName || 'Organizer'}</p>
                          <p className="text-[10px] font-bold text-text/40 dark:text-white/40 mt-0.5">
                            <span className="text-[#38BDF2]">{tx.planName || 'Plan'}</span> · {new Date(tx.createdAt || tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${isFailed ? 'bg-red-500' : isPending ? 'bg-amber-400' : 'bg-[#38BDF2]'}`} />
                          <span className={`text-[9px] font-black ${isFailed ? 'text-red-500' : isPending ? 'text-amber-500' : 'text-[#38BDF2]'}`}>
                            {statusStr}
                          </span>
                        </div>
                        <p className="text-sm font-black text-text dark:text-white">₱{Number(tx.amount || 0).toLocaleString()}</p>
                        {tx.kind === 'order' && (
                          <p className="text-[9px] font-bold text-orange-500 mt-0.5">
                            Ticketing Cut: ₱{(Number(tx.amount || 0) - Number(tx.netAmount || tx.amount || 0)).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* System Activity Hub (Audit Logs) */}
            <Card className="bg-surface border border-sidebar-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-sidebar-border flex justify-between items-center bg-surface">
                <div>
                  <h3 className="text-base font-black text-text dark:text-white">Activity Logs</h3>
                  <p className="text-[10px] font-bold text-text/40 dark:text-white/40 mt-1">Actions performed across the platform</p>
                </div>
                <span className="text-xs font-bold text-[#38BDF2] bg-[#38BDF2]/10 px-2 py-1 rounded-full">Live</span>
              </div>
              <div className="divide-y divide-[#2E2E2F]/5 h-full max-h-[500px] overflow-y-auto custom-scrollbar">
                {auditLogs.length === 0 && (
                  <div className="p-20 text-center">
                    <ICONS.Activity className="w-8 h-8 text-[#38BDF2]/40 mx-auto mb-4" />
                    <p className="text-[10px] font-bold text-text/40 dark:text-white/40">No Activity Found</p>
                  </div>
                )}
                {auditLogs.map((log, i) => (
                  <div
                    key={log.id || i}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#38BDF2]/5 transition-colors group/log cursor-pointer active:bg-[#38BDF2]/10 border-b border-sidebar-border last:border-0"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-xl bg-[#38BDF2] flex items-center justify-center shrink-0 shadow-sm text-white">
                        {log.action?.includes('LOGIN') ? <ICONS.Shield className="w-4 h-4" /> : <ICONS.Activity className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#2E2E2F] dark:text-white">{log.action || 'System Action'}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#38BDF2] bg-[#38BDF2]/5 px-1.5 py-0.5 rounded-sm">{log.actorName || log.performedBy || 'System'}</span>
                          <span className="text-[10px] text-[#2E2E2F] dark:text-white/40 font-bold">•</span>
                          <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white/60">Target — {log.target || 'General'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xs font-bold text-[#2E2E2F] dark:text-white/80">{new Date(log.timestamp).toLocaleDateString()}</p>
                      <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white/40">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-sidebar-border text-center bg-background">
                <p className="text-[10px] font-bold text-text/40 dark:text-white/40 italic">System Audit Tracking Enabled</p>
              </div>
            </Card>



          </div>

          {/* Transaction Detail Modal */}
          <Modal
            isOpen={Boolean(selectedTx)}
            onClose={() => setSelectedTx(null)}
            title="Transaction Details"
          >
            {selectedTx && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-background border border-sidebar-border rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-[#38BDF2] flex items-center justify-center text-white text-xl font-black">
                    {(selectedTx.customerName || selectedTx.buyerName || 'O').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-black text-text dark:text-white">{selectedTx.customerName || selectedTx.buyerName || 'Organizer'}</p>
                    <p className="text-xs font-bold text-text/40 dark:text-white/40">{selectedTx.customerEmail || selectedTx.buyerEmail || 'No email provided'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-background border border-sidebar-border rounded-xl">
                    <p className="text-[10px] font-black text-text/30 dark:text-white/20 mb-1">Source / Event</p>
                    <p className="text-sm font-black text-text dark:text-white truncate">{selectedTx.planName || selectedTx.eventName || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-background border border-sidebar-border rounded-xl">
                    <p className="text-[10px] font-black text-text/30 dark:text-white/20 mb-1 tracking-tight">Date</p>
                    <p className="text-xs font-black text-text dark:text-white">{new Date(selectedTx.createdAt || selectedTx.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-5 bg-surface border border-sidebar-border rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-text/50 dark:text-white/50">Gross Amount</span>
                    <span className="font-black text-text dark:text-white">₱{Number(selectedTx.amount || 0).toLocaleString()}</span>
                  </div>
                  {selectedTx.kind === 'order' && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-orange-500">Ticketing Cut</span>
                      <span className="font-black text-orange-500">- ₱{(Number(selectedTx.amount || 0) - Number(selectedTx.netAmount || selectedTx.amount || 0)).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="h-px bg-sidebar-border" />
                  <div className="flex justify-between items-center">
                    <span className="text-base font-black text-text dark:text-white">{selectedTx.kind === 'order' ? 'Organizer Payout' : 'Net Total'}</span>
                    <span className={`text-xl font-black ${selectedTx.kind === 'order' ? 'text-text dark:text-white' : 'text-[#38BDF2]'}`}>
                      ₱{Number(selectedTx.netAmount || selectedTx.amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-background border border-sidebar-border rounded-xl">
                  <p className="text-[10px] font-black text-text/30 dark:text-white/20 uppercase mb-2">Transaction Status</p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${['FAILED', 'CANCELLED', 'CANCELED'].includes(String(selectedTx.paymentStatus || selectedTx.status || '').toUpperCase())
                          ? 'bg-red-500'
                          : String(selectedTx.paymentStatus || selectedTx.status || '').toUpperCase() === 'PENDING'
                            ? 'bg-amber-400'
                            : 'bg-[#38BDF2]'
                        }`}
                    />
                    <span className="text-sm font-black text-text dark:text-white">
                      {selectedTx.paymentStatus || selectedTx.status || 'COMPLETED'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Modal>

          {/* Activity Log Detail Modal */}
          <Modal
            isOpen={Boolean(selectedLog)}
            onClose={() => setSelectedLog(null)}
            title="Activity Log Details"
          >
            {selectedLog && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-5 bg-background border border-sidebar-border rounded-2xl shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-[#38BDF2] flex items-center justify-center text-white text-xl font-bold shadow-sm">
                    {selectedLog.action?.includes('LOGIN') ? <ICONS.Shield className="w-6 h-6" /> : <ICONS.Activity className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-lg font-black text-text dark:text-white">{selectedLog.action || 'System Action'}</p>
                    <p className="text-xs font-bold text-text/40 dark:text-white/40">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-background border border-sidebar-border rounded-2xl shadow-sm">
                    <p className="text-[10px] font-black text-text/30 dark:text-white/20 mb-1 flex items-center gap-2">
                      <ICONS.Users className="w-3 h-3" /> Actor
                    </p>
                    <p className="text-sm font-black text-text dark:text-white">{selectedLog.actorName || selectedLog.performedBy || 'System'}</p>
                  </div>
                  <div className="p-5 bg-background border border-sidebar-border rounded-2xl shadow-sm">
                    <p className="text-[10px] font-black text-text/30 dark:text-white/20 mb-1 flex items-center gap-2">
                      <ICONS.Users className="w-3 h-3" /> Target
                    </p>
                    <p className="text-sm font-black text-text dark:text-white truncate">{selectedLog.target || 'N/A'}</p>
                  </div>
                </div>

                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div className="p-5 bg-background border border-sidebar-border rounded-2xl shadow-sm space-y-3">
                    <p className="text-[10px] font-black text-text/30 dark:text-white/20 mb-2">Extended Details</p>
                    <div className="space-y-2">
                      {Object.entries(selectedLog.details).map(([k, v]) => (
                        <div key={k} className="flex flex-col">
                          <span className="text-[10px] font-bold text-text/40 dark:text-white/30">{k}</span>
                          <pre className="text-sm font-bold text-text dark:text-white font-mono whitespace-pre-wrap break-all bg-transparent p-2 rounded-lg border border-sidebar-border mt-1">
                            {(() => {
                              if (v && typeof v === 'object') {
                                const vAny = v as any;
                                if (vAny.type === 'Buffer' && Array.isArray(vAny.data)) {
                                  try {
                                    const decoded = new TextDecoder().decode(new Uint8Array(vAny.data));
                                    try {
                                      return JSON.stringify(JSON.parse(decoded), null, 2);
                                    } catch {
                                      return decoded;
                                    }
                                  } catch {
                                    return '[Binary Data]';
                                  }
                                }
                                return JSON.stringify(v, null, 2);
                              }
                              return String(v);
                            })()}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button onClick={() => setSelectedLog(null)} className="px-6 py-2 bg-background border border-sidebar-border rounded-xl font-bold text-xs text-text/60 dark:text-white/40 hover:text-text dark:hover:text-white transition-colors shadow-sm">
                    Close
                  </button>
                </div>
              </div>
            )}
          </Modal>

          {/* Create Plan Modal */}
          <CreatePlanModal
            isOpen={isCreatePlanOpen}
            onClose={() => setIsCreatePlanOpen(false)}
            onSuccess={() => {
              setIsCreatePlanOpen(false);
            }}
          />

        </div>
      </div>
    </>
  );
};
