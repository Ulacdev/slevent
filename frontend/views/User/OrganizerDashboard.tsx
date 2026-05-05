
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { apiService } from '../../services/apiService';
import { Card, Button, PageLoader, Modal } from '../../components/Shared';
import { ICONS } from '../../constants';

const HeroCard: React.FC<{
    title: string;
    value: string | number;
    sub: string;
    icon: React.ReactNode;
}> = ({ title, value, sub, icon }) => (
    <div className="p-5 rounded-2xl border border-sidebar-border bg-background flex items-center gap-4 hover:scale-[1.01] transition-transform cursor-default shadow-sm">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#38BDF2] text-white shadow-sm">
            <div className="[&>svg]:w-6 [&>svg]:h-6">{icon}</div>
        </div>
        <div>
            <p className="text-xs font-bold text-[#2E2E2F] dark:text-white/60 tracking-tight mb-0.5">{title}</p>
            <p className="text-2xl font-black text-[#2E2E2F] dark:text-white">{value}</p>
            <p className="text-[10px] font-bold mt-1 text-[#38BDF2] dark:text-[#38BDF2]/80">{sub}</p>
        </div>
    </div>
);

export const OrganizerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { name, email } = useUser();
    const displayName = name?.trim() || email?.split('@')[0] || 'there';

    const [analytics, setAnalytics] = useState<any>(null);
    const [recentTx, setRecentTx] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ paidEventsCount: 0 });
    const [selectedTx, setSelectedTx] = useState<any | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

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
            ['Organizer Dashboard Summary Report'],
            ['Date Range', `${dateRange.start} to ${dateRange.end}`],
            [''],
            ['Metric', 'Value'],
            ['Total Registrations', analytics?.totalRegistrations || 0],
            ['Tickets Sold Today', analytics?.ticketsSoldToday || 0],
            ['Total Net Revenue', `PHP ${(analytics?.netRevenue || 0).toLocaleString()}`],
            ['Net Revenue Today', `PHP ${(analytics?.netRevenueToday || 0).toLocaleString()}`],
            ['Attendance Rate', `${(analytics?.attendanceRate || 0).toFixed(1)}%`],
            ['Payment Success', `${(analytics?.paymentSuccessRate || 0).toFixed(1)}%`]
        ];

        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `organizer_dashboard_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [events, analyticsData, transactions, orders, logs] = await Promise.all([
                apiService.getUserEvents(),
                apiService.getAnalytics(),
                apiService.getRecentTransactions(1, 10).catch(() => ({ data: [] })),
                apiService.getRecentOrders(1, 10).catch(() => ({ data: [] })),
                apiService.getAuditLogs(1, 10).catch(() => ({ data: [] })),
            ]);

            const paidCount = events.filter(e =>
                (e.ticketTypes || []).some((t: any) => (t.priceAmount || 0) > 0)
            ).length;

            const normalizeArray = (val: any) => {
                if (Array.isArray(val)) return val;
                if (val && typeof val === 'object') {
                    return val.data || val.transactions || val.items || [];
                }
                return [];
            };

            setStats({ paidEventsCount: paidCount });
            setAnalytics(analyticsData);
            setRecentTx(normalizeArray(transactions));
            setRecentOrders(normalizeArray(orders));
            setAuditLogs(normalizeArray(logs));
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) return <PageLoader variant="page" label="Loading Organizer Dashboard..." />;

    return (
        <>
            {/* Fixed Watermark - Outside container for multi-page support */}
            <div className="print-watermark no-print-screen">
                <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg" alt="Watermark" />
            </div>

            <div className="space-y-10 max-w-7xl mx-auto pt-4 px-2 font-sans">
            <style>{`
                @media print {
                    body {
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact !important;
                    }
                    
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
                        opacity: 0.12 !important;
                        z-index: -1 !important;
                        pointer-events: none;
                        justify-content: center;
                        align-items: center;
                    }

                    .print-watermark img {
                        width: 800px;
                        height: auto;
                    }

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

                    .p-4, .p-5, .p-6, .bg-surface {
                        border: 1px solid #E2E8F0 !important;
                        box-shadow: none !important;
                        break-inside: avoid;
                        background: white !important;
                    }

                    p, h1, h2, h3, span, td, th {
                        color: black !important;
                    }

                    /* Hide main dashboard layout */
                    .dashboard-main-content {
                        display: none !important;
                    }

                    .print-report-content {
                        display: block !important;
                    }

                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-bottom: 30px !important;
                    }

                    th, td {
                        border: 1px solid #E2E8F0 !important;
                        padding: 12px !important;
                        text-align: left !important;
                        font-size: 12px !important;
                    }

                    th {
                        background-color: #F8FAFC !important;
                        font-weight: 800 !important;
                        text-transform: uppercase !important;
                        font-size: 10px !important;
                    }
                }
                
                @media screen {
                    .no-print-screen { display: none !important; }
                }

                .print-watermark, .print-header, .print-report-content {
                    display: none;
                }
            `}</style>

            {/* Print-Only Elements */}
            <div className="print-watermark">
                <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg" alt="Watermark" />
            </div>

            <div className="print-header">
                <div className="flex justify-between items-end">
                    <div>
                        <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg" className="h-12 mb-4" alt="Logo" />
                        <h1 className="text-3xl font-black">Organizer Performance Report</h1>
                        <p className="text-sm">Generated on {new Date().toLocaleString()} • Range: {dateRange.start} to {dateRange.end}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold">StartupLab Business Ticketing</p>
                        <p className="text-xs">Organizer Business Intelligence</p>
                    </div>
                </div>
            </div>

            {/* Print-Only Report Content (Numbers and Data) */}
            <div className="print-report-content space-y-10">
                <section>
                    <h2 className="text-xl font-black mb-4 border-b-2 border-black pb-2 uppercase tracking-widest">I. Financial & Growth Metrics</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Metric Name</th>
                                <th>Current Value</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="font-bold">Total Gross Revenue</td>
                                <td>₱{analytics?.totalRevenue?.toLocaleString() || '0'}</td>
                                <td>Total earnings from ticket sales within range</td>
                            </tr>
                            <tr>
                                <td className="font-bold">Tickets Issued</td>
                                <td>{analytics?.totalRegistrations || '0'}</td>
                                <td>Number of tickets sold across all events</td>
                            </tr>
                            <tr>
                                <td className="font-bold">Active Events</td>
                                <td>{analytics?.activeEventsCount || '0'}</td>
                                <td>Currently live and selling events</td>
                            </tr>
                            <tr>
                                <td className="font-bold">Attendance Rate</td>
                                <td>{analytics?.attendanceRate?.toFixed(1) || '0'}%</td>
                                <td>Percentage of issued tickets that were used</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section>
                    <h2 className="text-xl font-black mb-4 border-b-2 border-black pb-2 uppercase tracking-widest">II. Recent Ticket Orders</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Order Date</th>
                                <th>Customer Name</th>
                                <th>Event Name</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.slice(0, 20).map((order, idx) => (
                                <tr key={idx}>
                                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td>{order.buyerName}</td>
                                    <td>{order.eventName || 'N/A'}</td>
                                    <td>₱{order.totalAmount?.toLocaleString()}</td>
                                    <td className="uppercase font-bold">{order.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <div className="pt-20 text-center border-t border-dashed border-gray-300">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400">End of Report • Generated via StartupLab Organizer Dashboard</p>
                </div>
            </div>

            <div className="dashboard-main-content">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-[2rem] font-semibold text-[#2E2E2F] dark:text-white tracking-tighter uppercase">Dashboard Overview</h1>
                    <p className="mt-1 text-sm font-semibold text-[#2E2E2F] dark:text-white/60">
                        See your latest registrations, tickets, and revenue at a glance.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-4 no-print">
                    <div className="flex items-center gap-2 bg-background border border-sidebar-border p-1.5 rounded-xl shadow-sm">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-transparent text-[11px] font-bold text-[#2E2E2F] dark:text-white outline-none px-2 py-1"
                        />
                        <span className="text-[#2E2E2F]/30 text-[10px] font-black uppercase">to</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-transparent text-[11px] font-bold text-[#2E2E2F] dark:text-white outline-none px-2 py-1"
                        />
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                className="w-9 h-9 flex items-center justify-center bg-[#38BDF2] border-2 border-[#38BDF2] rounded-full text-white hover:bg-[#2E2E2F] dark:hover:bg-white dark:hover:text-[#2E2E2F] transition-all shadow-lg group active:scale-95"
                                title="Print Dashboard"
                            >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            </button>
                            <button
                                onClick={handleExport}
                                className="w-9 h-9 flex items-center justify-center bg-[#38BDF2] border-2 border-[#38BDF2] rounded-full text-white hover:bg-[#2E2E2F] dark:hover:bg-white dark:hover:text-[#2E2E2F] transition-all shadow-lg group active:scale-95"
                                title="Export Report"
                            >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </button>
                        </div>
                        <button
                            onClick={() => navigate('/my-events?openModal=true')}
                            className="bg-[#38BDF2] text-white px-6 py-2.5 rounded-xl font-black text-[13px] uppercase tracking-wide flex items-center gap-2 shadow-lg hover:bg-[#2E2E2F] dark:hover:bg-white dark:hover:text-[#2E2E2F] transition-all active:scale-95 whitespace-nowrap"
                        >
                            <ICONS.Plus className="w-4 h-4" /> Create New Event
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Hero Stats ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <HeroCard
                    title="Total Registrations"
                    value={analytics?.totalRegistrations || 0}
                    sub="Lifetime attendees"
                    icon={<ICONS.Users />}
                />
                <HeroCard
                    title="Tickets Sold Today"
                    value={analytics?.ticketsSoldToday || 0}
                    sub="Recent activity"
                    icon={<ICONS.CheckCircle />}
                />
                <HeroCard
                    title="Total Net Revenue"
                    value={`PHP ${(analytics?.netRevenue || 0).toLocaleString()}`}
                    sub="Actual take-home"
                    icon={<ICONS.TrendingUp />}
                />
                <HeroCard
                    title="Net Revenue Today"
                    value={`PHP ${(analytics?.netRevenueToday || 0).toLocaleString()}`}
                    sub="24h collection (Net)"
                    icon={<ICONS.CreditCard />}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                <HeroCard
                    title="Attendance Rate"
                    value={`${(analytics?.attendanceRate || 0).toFixed(1)}%`}
                    sub="Checked-in vs Issued"
                    icon={<ICONS.Users />}
                />
                <HeroCard
                    title="Payment Success"
                    value={`${(analytics?.paymentSuccessRate || 0).toFixed(1)}%`}
                    sub="Completed vs Failed"
                    icon={<ICONS.Shield />}
                />
                <HeroCard
                    title="Total Paid Events"
                    value={stats.paidEventsCount}
                    sub="Revenue-driving sessions"
                    icon={<ICONS.Calendar />}
                />
            </div>

            {/* ── Review Analytics ── */}
            <div className="mt-10">
                <div className="mb-6">
                    <h2 className="text-xl font-black text-[#2E2E2F] dark:text-white uppercase tracking-tighter">Feedback Intelligence</h2>
                    <p className="text-xs font-bold text-[#2E2E2F]/40 uppercase tracking-widest mt-1">Attendee Satisfaction Metrics</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Review Stats Cards */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <HeroCard
                            title="Avg. Attendee Rating"
                            value={`${analytics?.reviewStats?.avgRating || '0.0'} / 5.0`}
                            sub="Overall satisfaction score"
                            icon={<ICONS.Star className="fill-current" />}
                        />
                        <HeroCard
                            title="Total Reviews"
                            value={analytics?.reviewStats?.totalReviews || 0}
                            sub="Attendee feedbacks"
                            icon={<ICONS.MessageSquare />}
                        />
                        <HeroCard
                            title="Organizer Response Rate"
                            value={`${analytics?.reviewStats?.replyRate || 0}%`}
                            sub="Engagement level"
                            icon={<ICONS.CheckCircle />}
                        />
                        <HeroCard
                            title="Total Helpful Votes"
                            value={analytics?.reviewStats?.helpfulTotal || 0}
                            sub="Community impact"
                            icon={<ICONS.Heart className="fill-current" />}
                        />
                    </div>

                    {/* Rating Distribution Chart */}
                    <Card className="p-6 bg-background border border-sidebar-border rounded-2xl shadow-sm">
                        <h3 className="text-sm font-black text-[#2E2E2F] dark:text-white mb-6 uppercase tracking-widest">Rating Distribution</h3>
                        <div className="space-y-4">
                            {[5, 4, 3, 2, 1].map((star) => {
                                const count = analytics?.reviewStats?.ratingBreakdown?.[star] || 0;
                                const total = analytics?.reviewStats?.totalReviews || 1;
                                const percentage = (count / total) * 100;
                                return (
                                    <div key={star} className="space-y-1">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[#2E2E2F]">{star}</span>
                                                <ICONS.Star className="w-3 h-3 text-yellow-400 fill-current" />
                                            </div>
                                            <span className="text-[#2E2E2F]/40">{count} Reviews</span>
                                        </div>
                                        <div className="h-2 bg-[#2E2E2F]/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#38BDF2] rounded-full transition-all duration-1000"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>

            {/* ── Lists Section ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-10">

                {/* All Transactions */}
                <Card className="bg-background border border-sidebar-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-sidebar-border bg-background">
                        <h3 className="text-base font-black text-[#2E2E2F] dark:text-white">All Transactions</h3>
                        <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white/40 mt-1">Recent payments</p>
                    </div>
                    <div className="divide-y divide-sidebar-border overflow-y-auto max-h-[400px]">
                        {recentTx.length === 0 && (
                            <p className="p-10 text-center text-xs font-bold text-[#2E2E2F] dark:text-white/60">No Transactions Found</p>
                        )}
                        {recentTx.map((tx, i) => (
                            <div 
                                key={tx.orderId || i} 
                                onClick={() => setSelectedTx(tx)}
                                className="p-6 flex justify-between items-center hover:bg-[#38BDF2]/5 transition-colors cursor-pointer group/item border-b border-sidebar-border last:border-0"
                            >
                                <div className="space-y-1">
                                    <p className="font-bold text-sm text-[#2E2E2F] dark:text-white group-hover/item:text-[#38BDF2] transition-colors">{tx.customerName || tx.buyerName || 'Organizer'}</p>
                                    <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white/40">
                                        {tx.planName || tx.eventName || 'Ticket Purchase'} • {new Date(tx.createdAt || tx.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-bold bg-[#38BDF2]/10 text-[#38BDF2] px-2 py-1 rounded-md mb-2 inline-block">PAID</span>
                                    <p className="font-bold text-sm text-[#2E2E2F] dark:text-white">PHP {Number(tx.netAmount || tx.amount || 0).toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white/30 tracking-tight">Net Payout</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-[#2E2E2F]/5 text-center">
                        <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white">End of List</p>
                    </div>
                </Card>

                {/* Recent Orders */}
                <Card className="bg-background border border-sidebar-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-sidebar-border bg-background">
                        <h3 className="text-base font-black text-[#2E2E2F] dark:text-white">Recent Orders</h3>
                        <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white/40 mt-1">Ticket purchases</p>
                    </div>
                    <div className="divide-y divide-sidebar-border overflow-y-auto max-h-[400px]">
                        {recentOrders.length === 0 && (
                            <p className="p-10 text-center text-xs font-bold text-[#2E2E2F] dark:text-white/60">No Orders Yet</p>
                        )}
                        {recentOrders.map((order, i) => (
                            <div 
                                key={order.orderId || i} 
                                onClick={() => setSelectedOrder(order)}
                                className="p-6 flex justify-between items-center hover:bg-[#38BDF2]/5 transition-colors cursor-pointer group/item border-b border-sidebar-border last:border-0"
                            >
                                <div className="space-y-1">
                                    <p className="font-bold text-sm text-[#2E2E2F] dark:text-white dark:text-white group-hover/item:text-[#38BDF2] transition-colors">{order.buyerName}</p>
                                    <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white dark:text-white/40">
                                        {order.eventName} • Order #{order.orderId?.slice(-8)} • {new Date(order.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-bold bg-[#38BDF2]/10 text-[#38BDF2] px-2 py-1 rounded-md mb-2 inline-block">PAID</span>
                                    <p className="font-bold text-sm text-[#2E2E2F] dark:text-white">PHP {Number(order.netAmount || order.totalAmount || 0).toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white/30 tracking-tight">Net Payout</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-[#2E2E2F]/5 text-center">
                        <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white">End of List</p>
                    </div>
                </Card>

            </div>

            {/* Audit Logs */}
            <Card className="bg-background border border-sidebar-border rounded-2xl shadow-sm overflow-hidden flex flex-col mt-5">
                <div className="p-6 border-b border-sidebar-border flex justify-between items-center bg-background">
                    <div>
                        <h3 className="text-base font-black text-[#2E2E2F] dark:text-white">Activity Logs</h3>
                        <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white/40 mt-1">Actions performed on your account</p>
                    </div>
                    <span className="text-xs font-bold text-[#38BDF2] bg-[#38BDF2]/10 px-2 py-1 rounded-full">Live</span>
                </div>
                <div className="divide-y divide-sidebar-border overflow-y-auto max-h-[500px]">
                    {auditLogs.length === 0 && (
                        <div className="p-20 text-center">
                            <ICONS.Activity className="w-8 h-8 text-[#38BDF2]/40 mx-auto mb-4" />
                            <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white">No Activity Found</p>
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
                                <p className="text-xs font-bold text-[#2E2E2F] dark:text-white dark:text-white/80">{new Date(log.timestamp).toLocaleDateString()}</p>
                                <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white dark:text-white/40">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-[#2E2E2F]/5 dark:border-white/5 bg-white/30 dark:bg-white/5 text-center">
                    <button 
                        onClick={() => navigate('/user/reports')}
                        className="text-xs font-bold text-[#38BDF2] hover:underline transition-colors"
                    >
                        View System Logs
                    </button>
                </div>
            </Card>

            {/* Transaction Detail Modal */}
            <Modal
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
                title="Transaction Details"
                subtitle="Verification for subscriber payments"
            >
                {selectedTx && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-5 bg-background rounded-2xl border border-sidebar-border">
                            <div className="w-14 h-14 rounded-full bg-[#38BDF2] flex items-center justify-center text-white text-xl font-bold shadow-sm">
                                {(selectedTx.customerName || selectedTx.buyerName || 'O').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white dark:text-white/40 leading-none mb-1">Customer / Subscriber</p>
                                <p className="text-lg font-bold text-[#2E2E2F] dark:text-white dark:text-white leading-tight">{selectedTx.customerName || selectedTx.buyerName || 'Subscriber'}</p>
                                <p className="text-xs font-bold text-[#38BDF2]">{selectedTx.customerEmail || selectedTx.buyerEmail || 'No email provided'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-background rounded-xl border border-sidebar-border">
                                <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white dark:text-white/40 mb-1">Reference ID</p>
                                <p className="text-xs font-bold text-[#2E2E2F] dark:text-white dark:text-white font-mono">{selectedTx.orderId || 'N/A'}</p>
                            </div>
                            <div className="p-4 bg-background rounded-xl border border-sidebar-border">
                                <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white dark:text-white/40 mb-1">Payment Date</p>
                                <p className="text-xs font-bold text-[#2E2E2F] dark:text-white dark:text-white">{new Date(selectedTx.createdAt || selectedTx.created_at).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="p-5 bg-surface rounded-2xl border border-sidebar-border space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-[#2E2E2F] dark:text-white dark:text-white/60">Order Gross</span>
                                <span className="text-sm font-bold text-[#2E2E2F] dark:text-white dark:text-white">PHP {Number(selectedTx.amount || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-[#2E2E2F] dark:text-white dark:text-white/60">Net Payout</span>
                                <span className="text-sm font-bold text-[#38BDF2]">PHP {Number(selectedTx.netAmount || selectedTx.amount || 0).toLocaleString()}</span>
                            </div>
                            <div className="h-[1px] bg-sidebar-border" />
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-base font-bold text-[#2E2E2F] dark:text-white dark:text-white">Your Earnings</span>
                                <span className="text-xl font-black text-[#2E2E2F] dark:text-white dark:text-white">PHP {Number(selectedTx.netAmount || selectedTx.amount || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="secondary" onClick={() => setSelectedTx(null)} className="px-6 rounded-xl font-bold text-xs">Close</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Order Detail Modal */}
            <Modal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                title="Order Details"
                subtitle="Complete ticket purchase breakdown"
            >
                {selectedOrder && (
                    <div className="space-y-6">
                        <div className="p-6 bg-background border border-sidebar-border rounded-2xl flex justify-between items-center shadow-sm">
                            <div>
                                <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white dark:text-white/40 mb-1">Net Payout</p>
                                <h2 className="text-3xl font-black text-[#2E2E2F] dark:text-white dark:text-white tracking-tight">PHP {(selectedOrder.netAmount || selectedOrder.totalAmount || 0).toLocaleString()}</h2>
                                <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white/40 dark:text-white/20 mt-1">From gross PHP {Number(selectedOrder.totalAmount || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-[#38BDF2]/10 px-3 py-1.5 rounded-lg border border-[#38BDF2]/20">
                                <span className="text-xs font-bold text-[#38BDF2]">PAID</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-background rounded-xl border border-sidebar-border">
                                <div className="w-10 h-10 rounded-xl bg-[#38BDF2] flex items-center justify-center text-white">
                                    <ICONS.Calendar className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white dark:text-white/40 leading-none mb-1">Event</p>
                                    <p className="text-sm font-bold text-[#2E2E2F] dark:text-white dark:text-white truncate">{selectedOrder.eventName || 'Unnamed Event'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-background rounded-xl border border-sidebar-border">
                                <div className="w-10 h-10 rounded-xl bg-[#38BDF2] flex items-center justify-center text-white">
                                    <ICONS.Users className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-[#2E2E2F] dark:text-white dark:text-white/40 leading-none mb-1">Buyer</p>
                                    <p className="text-sm font-bold text-[#2E2E2F] dark:text-white dark:text-white truncate">{selectedOrder.buyerName}</p>
                                    <p className="text-[10px] font-bold text-[#38BDF2]">{selectedOrder.buyerEmail}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-surface rounded-2xl border border-sidebar-border space-y-4 shadow-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-[#2E2E2F] dark:text-white dark:text-white/60">Order ID</span>
                                <span className="text-sm font-bold text-[#2E2E2F] dark:text-white dark:text-white font-mono">{selectedOrder.orderId}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-[#2E2E2F] dark:text-white dark:text-white/60">Date</span>
                                <span className="text-sm font-bold text-[#2E2E2F] dark:text-white dark:text-white">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end">
                            <Button onClick={() => setSelectedOrder(null)} className="px-6 rounded-xl font-bold text-xs">Close</Button>
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
                        <div className="flex items-center gap-4 p-5 bg-background rounded-2xl border border-sidebar-border">
                            <div className="w-14 h-14 rounded-full bg-[#38BDF2] flex items-center justify-center text-white text-xl font-bold shadow-sm">
                                {selectedLog.action?.includes('LOGIN') ? <ICONS.Shield className="w-6 h-6" /> : <ICONS.Activity className="w-6 h-6" />}
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-[#2E2E2F] dark:text-white">{selectedLog.action || 'System Action'}</h2>
                                <p className="text-xs font-bold text-[#2E2E2F] dark:text-white/40">
                                    {new Date(selectedLog.timestamp).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-background rounded-2xl border border-sidebar-border">
                                <p className="text-[10px] font-black text-[#1E293B] dark:text-white/30 dark:text-white/20 mb-1 flex items-center gap-2">
                                    <ICONS.Users className="w-3 h-3" /> Actor
                                </p>
                                <p className="text-sm font-black text-[#1E293B] dark:text-white dark:text-white">{selectedLog.actorName || selectedLog.performedBy || 'System'}</p>
                            </div>
                            <div className="p-5 bg-background rounded-2xl border border-sidebar-border">
                                <p className="text-[10px] font-black text-[#1E293B] dark:text-white/30 dark:text-white/20 mb-1 flex items-center gap-2">
                                    <ICONS.Users className="w-3 h-3" /> Target
                                </p>
                                <p className="text-sm font-black text-[#1E293B] dark:text-white dark:text-white truncate">{selectedLog.target || 'N/A'}</p>
                            </div>
                        </div>

                        {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                            <div className="p-5 bg-background rounded-2xl border border-sidebar-border space-y-3">
                                <p className="text-[10px] font-black text-[#1E293B] dark:text-white/30 dark:text-white/20 mb-2">Extended Details</p>
                                <div className="space-y-2">
                                    {Object.entries(selectedLog.details).map(([k, v]) => (
                                        <div key={k} className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[#1E293B] dark:text-white/40 dark:text-white/30">{k}</span>
                                            <pre className="text-sm font-bold text-[#1E293B] dark:text-white dark:text-white font-mono whitespace-pre-wrap break-all bg-transparent p-2 rounded-lg border border-sidebar-border mt-1">
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
                            <button onClick={() => setSelectedLog(null)} className="px-6 py-2 bg-surface border border-sidebar-border rounded-xl font-bold text-xs text-[#1E293B] dark:text-white/60 dark:text-white/40 hover:text-[#1E293B] dark:text-white dark:hover:text-white transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            </div>
        </div>
    </>
  );
};
