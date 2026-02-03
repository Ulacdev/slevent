
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { EventList } from './views/Public/EventList';
import { EventDetails } from './views/Public/EventDetails';
import { RegistrationForm } from './views/Public/RegistrationForm';
import { PaymentStatusView } from './views/Public/PaymentStatus';
import { TicketView } from './views/Public/TicketView';
import { AdminDashboard } from './views/Admin/Dashboard';
import { EventsManagement } from './views/Admin/EventsManagement';
import { RegistrationsList } from './views/Admin/RegistrationsList';
import { CheckIn } from './views/Admin/CheckIn';
import { SettingsView } from './views/Admin/Settings';
import { LoginPerspective } from './views/Auth/Login';
import { SignUpView } from './views/Auth/SignUp';
import { AcceptInvite } from './views/Auth/AcceptInvite';
import { ICONS } from './constants';
import { UserRole } from './types';
import { supabase } from "./supabase/supabaseClient.js";
import { useUser } from './context/UserContext';
const API = import.meta.env.VITE_API_BASE;
const Branding: React.FC<{ className?: string, light?: boolean }> = ({ className = '', light = false }) => (
  <img
    src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/01_Logos-20260203T092531Z-3-001/01_Logos/StartupLab_16_9_WithIcon_Dark.svg"
    alt="StartupLab Business Ticketing Logo"
    className={`h-16 sm:h-24 w-auto ${className}`}
    style={{ filter: light ? 'invert(1) grayscale(1) brightness(2)' : undefined }}
  />
);
const PortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isAuthenticated, clearUser, setUser, canViewEvents, canEditEvents, canManualCheckIn } = useUser();
  const isStaff = role === UserRole.STAFF;
  // Unified URLs for both roles

  useEffect(() => {
    const syncSession = async () => {
      const isPortalRoute = ['/dashboard', '/events', '/attendees', '/checkin', '/settings'].includes(location.pathname);
      if (!isPortalRoute) return;

      try {
        const res = await fetch(`${API}/api/whoAmI`, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) {
          clearUser();
          navigate('/login', { replace: true });
          return;
        }
        const me = await res.json().catch(() => null);
        if (!me?.role || !me?.email) {
          clearUser();
          navigate('/login', { replace: true });
          return;
        }
        setUser({ 
          role: me.role, 
          email: me.email,
          canViewEvents: me.canViewEvents,
          canEditEvents: me.canEditEvents,
          canManualCheckIn: me.canManualCheckIn,
        });
      } catch {
        clearUser();
        navigate('/login', { replace: true });
      }
    };

    syncSession();
  }, [clearUser, location.pathname, navigate, setUser]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!role) return;
    const staffAllowed = ['/events', '/attendees', '/checkin'];
    const adminAllowed = ['/dashboard', '/events', '/attendees', '/checkin', '/settings'];
    const allowed = isStaff ? staffAllowed : adminAllowed;
    if (!allowed.includes(location.pathname)) {
      navigate('/events', { replace: true });
      return;
    }
    if (isStaff) {
      if (location.pathname === '/events' && canViewEvents === false) {
        navigate('/attendees', { replace: true });
      }
      if (location.pathname === '/checkin' && canManualCheckIn === false) {
        navigate('/attendees', { replace: true });
      }
    }
  }, [isAuthenticated, isStaff, location.pathname, navigate, role, canViewEvents, canManualCheckIn]);

  const menuItems = (
    role === UserRole.STAFF
      ? [
          { label: 'Events', path: '/events', icon: <ICONS.Calendar className="w-5 h-5" /> },
          { label: 'Attendees', path: '/attendees', icon: <ICONS.Users className="w-5 h-5" /> },
          { label: 'Check-In', path: '/checkin', icon: <ICONS.CheckCircle className="w-5 h-5" /> },
        ]
      : [
          { label: 'Dashboard', path: '/dashboard', icon: <ICONS.Layout className="w-5 h-5" /> },
          { label: 'Events', path: '/events', icon: <ICONS.Calendar className="w-5 h-5" /> },
          { label: 'Attendees', path: '/attendees', icon: <ICONS.Users className="w-5 h-5" /> },
          { label: 'Check-In', path: '/checkin', icon: <ICONS.CheckCircle className="w-5 h-5" /> },
          { label: 'Settings', path: '/settings', icon: <ICONS.Settings className="w-5 h-5" /> },
        ]
  );

  const handleLogout = async () => {
    try {
      // 1. Call backend logout to clear cookies
      await fetch(`${API}/api/auth/logout`, { 
        method: "POST", 
        credentials: "include" 
      });
  
      // 2. Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase sign out error:", error);
      }
  
      // 3. Clear any local tokens/storage
      localStorage.removeItem('sb-ddkkbtijqrgpitncxylx-auth-token');
      clearUser();
      
      // 4. Navigate to login
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
      // Still navigate to login even if there was an error
      navigate('/');
    }
  };

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = React.useState(true);
  return (
    <div className="min-h-screen flex bg-[#F2F2F2]">
      {/* Sidebar for desktop */}
      <aside
        className={`w-72 bg-[#F2F2F2] border-r border-[#3768A2]/20 hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 overflow-y-auto transform transition-transform duration-300 ease-in-out ${
          desktopSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >

        <div className="pt-6 pb-2 px-8 flex flex-col items-start">
      </div>
      <div className="px-8">
        <div className="mt-2 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isStaff ? 'bg-[#38BDF2]' : 'bg-[#003E86]'}`}></span>
          <p className="text-[9px] uppercase font-black text-[#2E2E2F]/60 tracking-[0.2em]">
            {isStaff ? 'Operations Hub' : 'Enterprise Admin'}
          </p>
        </div>
      </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors group ${
                location.pathname === item.path
                  ? (isStaff ? 'bg-[#38BDF2]/20 text-[#003E86]' : 'bg-[#003E86] text-[#F2F2F2]')
                  : 'text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#003E86]'
              }`}
            >
              {item.icon}
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-6 mt-auto">
          <div className="bg-[#F2F2F2] rounded-2xl p-4 flex items-center gap-3 border border-[#3768A2]/20">
            <div className={`w-10 h-10 rounded-xl ${isStaff ? 'bg-[#38BDF2]/20 text-[#003E86]' : 'bg-[#003E86]/15 text-[#003E86]'} flex items-center justify-center font-black text-xs`}>
              {isStaff ? 'ST' : 'AD'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black text-[#2E2E2F] truncate">{isStaff ? 'Staff Operative' : 'System Admin'}</p>
              <p className="text-[9px] text-[#2E2E2F]/60 font-bold uppercase tracking-widest truncate">StartupLab Global</p>
            </div>
          </div>
        </div>
      </aside>

      <main
        className={`flex-1 flex flex-col min-w-0 transition-[padding-left] duration-300 ease-in-out ${
          desktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'
        }`}
      >
        <header className="h-22 bg-[#F2F2F2] border-b border-[#3768A2]/20 px-4 sm:px-8 flex items-center justify-between lg:justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Desktop sidebar hamburger (now left) */}
            <button
              className="hidden lg:inline-flex p-2 rounded-lg bg-[#F2F2F2] text-[#003E86] focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/40"
              onClick={() => setDesktopSidebarOpen((prev) => !prev)}
              aria-label={desktopSidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
              aria-pressed={desktopSidebarOpen}
            >
              <img
  src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/01_Logos-20260203T092531Z-3-001/01_Logos/image%20(1).svg"
  alt="Open sidebar"
  className="h-20 w-auto max-h-32 object-contain"
/>
            </button>
            {/* Mobile hamburger */}
            <button
              className="p-2 rounded-lg bg-[#F2F2F2] text-[#003E86] focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/40 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <img
  src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/01_Logos-20260203T092531Z-3-001/01_Logos/StartupLab_16_9_WithIcon_Dark.svg"
  alt="Open sidebar"
  className="h-23 w-auto max-h-32 object-contain"
/>
            </button>

          </div>
          <div className="flex items-center gap-6">
             <div className="hidden md:flex flex-col items-end">
               <span className="text-[8px] font-black text-[#2E2E2F]/60 uppercase tracking-widest">System Status</span>
               <span className="text-[9px] font-bold text-[#003E86] flex items-center gap-1.5">
                 <span className="w-1 h-1 bg-[#003E86] rounded-full"></span>
                 Encrypted & Live
               </span>
             </div>
             <button onClick={handleLogout} className="text-[9px] font-black uppercase tracking-widest text-[#003E86]/70 hover:text-[#003E86] transition-colors border border-[#3768A2]/30 px-3 py-1.5 rounded-lg">
               Logout
             </button>
          </div>
        </header>
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="fixed inset-0 bg-[#2E2E2F]/70" onClick={() => setSidebarOpen(false)} />
            <aside className="relative w-64 bg-[#F2F2F2] border-r border-[#3768A2]/20 flex flex-col h-full z-50">
              <div className="p-8 flex items-center justify-between">
                <Branding className="text-base" />
                <button
                  className="p-2 rounded-full text-[#003E86]/60 hover:text-[#003E86] hover:bg-[#38BDF2]/10 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors group ${
                      location.pathname === item.path
                        ? (isStaff ? 'bg-[#38BDF2]/20 text-[#003E86]' : 'bg-[#003E86] text-[#F2F2F2]')
                        : 'text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#003E86]'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="p-6 mt-auto">
                <div className="bg-[#F2F2F2] rounded-2xl p-4 flex items-center gap-3 border border-[#3768A2]/20">
                  <div className={`w-10 h-10 rounded-xl ${isStaff ? 'bg-[#38BDF2]/20 text-[#003E86]' : 'bg-[#003E86]/15 text-[#003E86]'} flex items-center justify-center font-black text-xs`}>
                    {isStaff ? 'ST' : 'AD'}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-black text-[#2E2E2F] truncate">{isStaff ? 'Staff Operative' : 'System Admin'}</p>
                    <p className="text-[9px] text-[#2E2E2F]/60 font-bold uppercase tracking-widest truncate">StartupLab Global</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-[#F2F2F2]">
    <header className="h-20 bg-[#F2F2F2] border-b border-[#3768A2]/20 px-8 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
        <Link to="/">
          <Branding className="text-xl lg:text-2xl" />
        </Link>
        <nav className="flex items-center gap-10">
          <Link to="/" className="text-[11px] font-black uppercase tracking-[0.3em] text-[#2E2E2F]/70 hover:text-[#003E86] transition-colors hidden sm:block">
            EVENTS
          </Link>
          <Link to="/login" className="bg-[#003E86] text-[#F2F2F2] px-9 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-[#3768A2] transition-colors">
            PORTAL LOGIN
          </Link>
        </nav>
      </div>
    </header>
    <main className="flex-1">{children}</main>
    <footer className="bg-[#F2F2F2] text-[#2E2E2F]/70 py-16 px-8 border-t border-[#3768A2]/20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          <div>
            <Branding className="text-2xl" />
            <p className="mt-4 text-sm font-medium max-w-sm text-[#2E2E2F]/70 leading-relaxed">
  Your gateway to StartupLab events.<br />
  From internal workshops to public showcases, this platform delivers seamless, secure registration for every StartupLab gathering.
</p>
          </div>
          <div className="grid grid-cols-2 gap-8 lg:text-right uppercase tracking-[0.2em] font-black text-[9px]">
            <div className="space-y-4">
              <p className="text-[#2E2E2F]/50 mb-4">Platform</p>
              <Link to="/" className="block text-[#2E2E2F]/70 hover:text-[#003E86]">Events List</Link>
              <Link to="/login" className="block text-[#2E2E2F]/70 hover:text-[#003E86]">Admin Login</Link>
            </div>
            <div className="space-y-4">
              <p className="text-[#2E2E2F]/50 mb-4">Legal</p>
              <a href="#" className="block text-[#2E2E2F]/70 hover:text-[#003E86]">Privacy</a>
              <a href="#" className="block text-[#2E2E2F]/70 hover:text-[#003E86]">Terms</a>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-[#3768A2]/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[9px] uppercase tracking-[0.3em] font-black text-[#2E2E2F]/60">
            © 2024 StartupLab Systems International
          </div>
          <div className="flex items-center gap-6 opacity-60 grayscale">
             <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/images/hitpay.png" alt="HitPay" className="h-3" />
          </div>
        </div>
      </div>
    </footer>
  </div>
);

const App: React.FC = () => (
  <Router>
    <Routes>
      <Route path="/login" element={<LoginPerspective />} />
      <Route path="/signup" element={<SignUpView />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/" element={<PublicLayout><EventList /></PublicLayout>} />
      <Route path="/events/:slug" element={<PublicLayout><EventDetails /></PublicLayout>} />
      <Route path="/events/:slug/register" element={<PublicLayout><RegistrationForm /></PublicLayout>} />
      <Route path="/payment/status" element={<PublicLayout><PaymentStatusView /></PublicLayout>} />
      <Route path="/tickets/:ticketId" element={<PublicLayout><TicketView /></PublicLayout>} />

      <Route path="/dashboard" element={<PortalLayout><AdminDashboard /></PortalLayout>} />
      <Route path="/events" element={<PortalLayout><EventsManagement /></PortalLayout>} />
      <Route path="/attendees" element={<PortalLayout><RegistrationsList /></PortalLayout>} />
      <Route path="/checkin" element={<PortalLayout><CheckIn /></PortalLayout>} />
      <Route path="/settings" element={<PortalLayout><SettingsView /></PortalLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Router>
);
export default App;
