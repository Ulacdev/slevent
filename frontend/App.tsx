
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { EventList } from './views/Public/EventList';
import { CategoryEvents } from './views/Public/CategoryEvents';
import { EventDetails } from './views/Public/EventDetails';
import { RegistrationForm } from './views/Public/RegistrationForm';
import { PaymentStatusView } from './views/Public/PaymentStatus';
import { TicketView } from './views/Public/TicketView';
import { AboutUsPage } from './views/Public/AboutUsPage';
import { ContactUsPage } from './views/Public/ContactUsPage';
import { PublicEventsPage } from './views/Public/PublicEventsPage';
import { LikedEventsPage } from './views/Public/LikedEventsPage';
import { FollowingsEventsPage } from './views/Public/FollowingsEventsPage';
import MyTicketsPage from './views/Public/MyTicketsPage';
import { PricingPage } from './views/Public/PricingPage';
import {
  PrivacyPolicyPage,
  TermsOfServicePage,
  FaqPage,
  RefundPolicyPage
} from './views/Public/InfoPages';
import { AdminDashboard } from './views/Admin/Dashboard';
import { EventsManagement } from './views/Admin/EventsManagement';
import { RegistrationsList } from './views/Admin/RegistrationsList';
import { CheckIn } from './views/Admin/CheckIn';
import { SettingsView } from './views/Admin/Settings';
import { LoginPerspective } from './views/Auth/Login';
import { SignUpView } from './views/Auth/SignUp';
import { AcceptInvite } from './views/Auth/AcceptInvite';
import { UserSettings } from './views/User/UserSettings';
import { UserEvents } from './views/User/UserEvents';
import { UserHome } from './views/User/UserHome';
import { ONLINE_LOCATION_VALUE } from './components/BrowseEventsNavigator';
import { ICONS } from './constants';
import { Button, Input, Modal, PageLoader } from './components/Shared';
import { apiService } from './services/apiService';
import { UserRole, normalizeUserRole } from './types';
import { supabase } from "./supabase/supabaseClient.js";
import { useUser } from './context/UserContext';
import { useEngagement } from './context/EngagementContext';
const API = import.meta.env.VITE_API_BASE;
const DEFAULT_HEADER_LOCATION = 'Your Location';
const BROWSE_LOCATION_STORAGE_KEY = 'browse_events_location';
const Branding: React.FC<{ className?: string, light?: boolean }> = ({ className = '', light = false }) => (
  <img
    src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
    alt="StartupLab Business Ticketing Logo"
    className={`h-16 sm:h-24 w-auto ${className}`}
    style={{ filter: light ? 'invert(1) grayscale(1) brightness(2)' : undefined }}
  />
);

const getRoleLabel = (roleValue: unknown): string => {
  const normalized = String(roleValue || '').toUpperCase();
  if (normalized === UserRole.ADMIN) return 'Admin';
  if (normalized === UserRole.STAFF) return 'Staff';
  if (normalized === 'ATTENDEE') return 'Attendee';
  if (normalized === UserRole.ORGANIZER || normalized === 'USER') return 'Organizer';
  return 'User';
};

const reverseLookupCity = async (lat: number, lon: number): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    const address = payload?.address || {};
    return (
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.state ||
      payload?.display_name ||
      null
    );
  } catch {
    return null;
  }
};

const PortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, email, name, imageUrl, isAuthenticated, clearUser, setUser, canViewEvents, canEditEvents, canManualCheckIn } = useUser();
  const isStaff = role === UserRole.STAFF;
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [nameInput, setNameInput] = React.useState('');
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileError, setProfileError] = React.useState('');
  const [profileSuccess, setProfileSuccess] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [notificationOpen, setNotificationOpen] = React.useState(false);

  const displayName = email?.trim() || name?.trim() || (isStaff ? 'Staff Operative' : 'System Admin');
  const roleLabel = getRoleLabel(role);
  const initials = (email?.split('@')[0] || name?.trim() || displayName || (isStaff ? 'ST' : 'AD'))
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const fetchProfile = async () => {
    try {
      setProfileError('');
      setProfileSuccess('');
      const res = await fetch(`${API}/api/whoAmI`, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNameInput(data.name || '');
        setAvatarPreview(data.imageUrl || null);
        setAvatarFile(null);
        const normalizedRole = normalizeUserRole(data?.role);
        if (normalizedRole && data?.email) {
          setUser({
            role: normalizedRole,
            email: data.email,
            name: data.name ?? null,
            imageUrl: data.imageUrl ?? null,
            canViewEvents: data.canViewEvents,
            canEditEvents: data.canEditEvents,
            canManualCheckIn: data.canManualCheckIn,
          });
        }
      }
    } catch { }
  };

  React.useEffect(() => {
    if (profileModalOpen) fetchProfile();
  }, [profileModalOpen]);

  React.useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    setProfileError(''); setProfileSuccess(''); setProfileLoading(true);
    try {
      const trimmedName = nameInput.trim();
      if (!trimmedName) throw new Error('Name is required.');
      let nextName = trimmedName;
      let nextImageUrl = avatarPreview || imageUrl || null;

      if (avatarFile) {
        const formData = new FormData();
        formData.append('image', avatarFile);
        const res = await fetch(`${API}/api/user/avatar`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to update avatar.');
        }
        const payload = await res.json().catch(() => ({}));
        nextImageUrl = payload.imageUrl || payload.user?.imageUrl || nextImageUrl;
        setAvatarFile(null);
        setAvatarPreview(nextImageUrl || null);
      }

      if (trimmedName !== (name || '')) {
        const res = await fetch(`${API}/api/user/name`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: trimmedName })
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to update name.');
        }
        const payload = await res.json().catch(() => ({}));
        nextName = payload?.name || trimmedName;
        if (!nextImageUrl && payload?.imageUrl) nextImageUrl = payload.imageUrl;
      }

      if (role && email) {
        setUser({
          role,
          email,
          name: nextName,
          imageUrl: nextImageUrl,
          canViewEvents,
          canEditEvents,
          canManualCheckIn,
        });
      }

      setProfileSuccess('Profile updated successfully.');
      setTimeout(() => setProfileModalOpen(false), 800);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

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
        const normalizedRole = normalizeUserRole(me?.role);
        if (!normalizedRole || !me?.email) {
          clearUser();
          navigate('/login', { replace: true });
          return;
        }
        setUser({
          role: normalizedRole,
          email: me.email,
          name: me.name ?? null,
          imageUrl: me.imageUrl ?? null,
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
    const userAllowed = ['/user-home', '/my-events', '/user-settings', '/organizer-settings', '/account-settings', '/user/attendees', '/user/checkin', '/dashboard'];

    if (role === UserRole.ORGANIZER) {
      if (!userAllowed.includes(location.pathname)) {
        navigate('/user-home', { replace: true });
      }
      return;
    }

    const allowed = isStaff ? staffAllowed : adminAllowed;
    if (!allowed.includes(location.pathname)) {
      navigate(isStaff ? '/events' : '/dashboard', { replace: true });
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

  const staffPermsLoaded = role !== UserRole.STAFF || (
    typeof canViewEvents === 'boolean' && typeof canManualCheckIn === 'boolean'
  );
  const noStaffPerms = role === UserRole.STAFF && canViewEvents === false && canManualCheckIn === false;
  const menuItems = (
    !isAuthenticated || !role || !staffPermsLoaded
      ? []
      : role === UserRole.STAFF && canViewEvents === false && canManualCheckIn === false
        ? [
          { label: 'Attendees', path: '/attendees', icon: <ICONS.Users className="w-5 h-5" /> },
        ]
        : role === UserRole.STAFF
          ? [
            ...(canViewEvents !== false ? [{ label: 'Events', path: '/events', icon: <ICONS.Calendar className="w-5 h-5" /> }] : []),
            { label: 'Attendees', path: '/attendees', icon: <ICONS.Users className="w-5 h-5" /> },
            ...(canManualCheckIn !== false ? [{ label: 'Check-In', path: '/checkin', icon: <ICONS.CheckCircle className="w-5 h-5" /> }] : []),
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
      await supabase.auth.signOut();

      // 3. Clear any local tokens/storage
      localStorage.removeItem('sb-ddkkbtijqrgpitncxylx-auth-token');
      clearUser();

      // 4. Navigate to login
      navigate('/');
    } catch {
      // Still navigate to login even if there was an error
      navigate('/');
    }
  };

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = React.useState(true);
  const [settingsOpen, setSettingsOpen] = React.useState(location.pathname === '/settings');

  React.useEffect(() => {
    if (location.pathname === '/settings') setSettingsOpen(true);
  }, [location.pathname]);
  return (
    <div className="min-h-screen flex bg-[#F2F2F2]">
      {/* Sidebar for desktop */}
      <aside
        className={`bg-[#F2F2F2] border-r border-[#2E2E2F]/10 hidden md:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out ${desktopSidebarOpen ? 'w-72' : 'w-20'
          }`}
      >
        <div className={`pt-6 pb-4 flex flex-col items-center justify-center transition-all duration-300 ${desktopSidebarOpen ? 'px-5' : 'px-3'}`}>
          <Link to="/dashboard" className="flex items-center justify-center w-full">
            {desktopSidebarOpen ? (
              <img
                src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
                alt="StartupLab Business Center Logo"
                className="h-16 w-full max-w-[220px] object-contain animate-in fade-in zoom-in duration-300"
              />
            ) : (
              <img
                src="/lgo.webp"
                alt="SL Logo"
                className="h-10 w-10 object-contain animate-in fade-in zoom-in duration-300"
              />
            )}
          </Link>
          {desktopSidebarOpen && (
            <div className="mt-4 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <span className={`w-2 h-2 rounded-full ${isStaff ? 'bg-[#38BDF2]' : 'bg-[#2E2E2F]'}`}></span>
              <p className="text-[9px] uppercase font-black text-[#2E2E2F]/60 tracking-[0.2em]">
                {isStaff ? 'Portal' : 'Enterprise Admin'}
              </p>
            </div>
          )}
        </div>
        <nav className={`flex-1 ${desktopSidebarOpen ? 'px-4' : 'px-2'} py-4 space-y-1`}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors group ${location.pathname === item.path
                ? 'bg-[#38BDF2] text-[#F2F2F2]'
                : 'text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2]'
                } ${!desktopSidebarOpen ? 'justify-center border-none' : ''}`}
              title={!desktopSidebarOpen ? item.label : undefined}
            >
              {item.icon}
              {desktopSidebarOpen && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
            </Link>
          ))}
        </nav>

      </aside>

      <main
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${desktopSidebarOpen ? 'md:pl-72' : 'md:pl-20'
          }`}
      >
        <header className="h-20 bg-[#F2F2F2] border-b border-[#2E2E2F]/10 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 w-full">
          <div className="flex items-center gap-3">
            <button
              className="hidden md:flex w-10 h-10 items-center justify-center rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 transition-colors"
              onClick={() => setDesktopSidebarOpen((prev) => !prev)}
              aria-label={desktopSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-pressed={desktopSidebarOpen}
            >
              <svg className="w-5 h-5 text-[#2E2E2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5 text-[#2E2E2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] uppercase font-black text-[#2E2E2F]/50 tracking-[0.2em]">
                {isStaff ? 'Staff Panel' : 'Admin Panel'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative">
              <button
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 transition-colors relative"
                onClick={() => setNotificationOpen(!notificationOpen)}
              >
                <ICONS.Bell className="w-5 h-5 text-[#2E2E2F]/60" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F2F2F2]"></span>
              </button>
              {notificationOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl shadow-xl z-50 p-4 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2E2E2F]/5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#2E2E2F]">Notifications</h4>
                      <span className="text-[10px] font-bold text-[#38BDF2]">Mark all as read</span>
                    </div>
                    <div className="space-y-3 py-2">
                      <div className="flex gap-3 p-3 rounded-xl bg-white border border-[#2E2E2F]/5">
                        <div className="w-8 h-8 rounded-lg bg-[#38BDF2]/10 flex items-center justify-center shrink-0">
                          <ICONS.Calendar className="w-4 h-4 text-[#38BDF2]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2E2E2F]">System Maintenance</p>
                          <p className="text-[10px] text-[#2E2E2F]/50 mt-1">Scheduled for this weekend.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 transition-colors"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#38BDF2]/20 text-[#2E2E2F] flex items-center justify-center">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-semibold text-xs text-[#2E2E2F]">{initials}</span>
                  )}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-xs font-semibold text-[#2E2E2F] truncate max-w-[120px]">{displayName}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2E2E2F]/45 mt-0.5">{roleLabel}</p>
                </div>
                <svg className="w-4 h-4 text-[#2E2E2F]/50" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(46,46,47,0.1)] z-50 p-2 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="px-4 py-3 border-b border-[#2E2E2F]/5 mb-1">
                      <p className="text-[10px] font-medium text-[#2E2E2F]/40 uppercase tracking-widest mb-0.5">Account</p>
                      <p className="text-xs font-semibold text-[#2E2E2F] truncate">{displayName}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2E2E2F]/45 mt-1">{roleLabel}</p>
                    </div>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                      onClick={() => {
                        navigate('/settings?tab=team');
                        setUserMenuOpen(false);
                      }}
                    >
                      <ICONS.Shield className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>Teams & Access</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                      onClick={() => {
                        navigate('/settings?tab=email');
                        setUserMenuOpen(false);
                      }}
                    >
                      <ICONS.Mail className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>Email Setup</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                      onClick={() => {
                        setProfileModalOpen(true);
                        setUserMenuOpen(false);
                      }}
                    >
                      <ICONS.Settings className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-red-50 hover:text-red-500 transition-colors text-left group"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="fixed inset-0 bg-[#2E2E2F]/70" onClick={() => setSidebarOpen(false)} />
            <aside className="relative w-64 bg-[#38BDF2] flex flex-col h-full z-50 animate-in slide-in-from-left">
              <div className="p-8 flex items-center justify-between">
                <Branding className="text-base" />
                <button
                  className="min-h-[32px] min-w-[32px] px-2 py-2 rounded-xl bg-[#38BDF2] text-[#F2F2F2] hover:bg-[#2E2E2F] hover:text-[#F2F2F2] transition-colors"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${location.pathname === item.path
                      ? 'bg-white text-[#38BDF2] shadow-lg shadow-black/5'
                      : 'text-white/60 hover:bg-[#2E2E2F] hover:text-white'
                      }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                  </Link>
                ))}
              </nav>

            </aside>
          </div>
        )}

        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {(noStaffPerms && location.pathname !== '/attendees') ? (
              <div className="flex flex-col items-center justify-center min-h-[40vh]">
                <div className="text-2xl font-black text-[#2E2E2F] mb-4">No Access</div>
                <div className="text-[#2E2E2F]/70 text-lg font-medium text-center">You do not have access to any features. Please contact your administrator.</div>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
        <Modal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          title="Edit Profile"
          subtitle="Update your profile"
          size="sm"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#2E2E2F]/10 bg-[#F2F2F2] flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-sm text-[#2E2E2F]">{initials}</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="px-4 py-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
            <Input
              label="Your Name"
              value={nameInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameInput(e.target.value)}
            />
            {profileError && <p className="text-xs text-[#2E2E2F] font-bold">{profileError}</p>}
            {profileSuccess && <p className="text-xs text-[#2E2E2F] font-bold">{profileSuccess}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setProfileModalOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSaveProfile} disabled={profileLoading || !nameInput.trim()}>
                {profileLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
};

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { role, email, name, imageUrl, isAuthenticated, clearUser, setUser } = useUser();
  const {
    publicMode,
    isAttendingView,
    setPublicMode,
  } = useEngagement();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [headerSearchTerm, setHeaderSearchTerm] = React.useState('');
  const [headerLocationTerm, setHeaderLocationTerm] = React.useState(DEFAULT_HEADER_LOCATION);
  const [headerLocationMenuOpen, setHeaderLocationMenuOpen] = React.useState(false);
  const [headerLocating, setHeaderLocating] = React.useState(false);
  const [headerLocationError, setHeaderLocationError] = React.useState('');
  const [headerLocationSearch, setHeaderLocationSearch] = React.useState('');
  const headerLocationMenuRef = React.useRef<HTMLDivElement | null>(null);
  const isOrganizer = isAuthenticated && role === UserRole.ORGANIZER;
  const publicMenuMode = isOrganizer ? publicMode : 'attending';
  const showHeaderSearchBar = !isAuthenticated || !isOrganizer || isAttendingView;

  const displayName = email?.trim() || name?.trim() || 'User';
  const roleLabel = isOrganizer && isAttendingView ? 'Attending' : getRoleLabel(role);
  const publicUserMenuActionClass = 'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group';
  const initials = (email?.split('@')[0] || name?.trim() || displayName || 'U')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Sync session for logged-in users visiting public pages
  React.useEffect(() => {
    const syncPublicSession = async () => {
      try {
        const res = await fetch(`${API}/api/whoAmI`, { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const me = await res.json().catch(() => null);
          const normalizedRole = normalizeUserRole(me?.role);
          if (normalizedRole && me?.email) {
            setUser({
              role: normalizedRole,
              email: me.email,
              name: me.name ?? null,
              imageUrl: me.imageUrl ?? null,
              canViewEvents: me.canViewEvents,
              canEditEvents: me.canEditEvents,
              canManualCheckIn: me.canManualCheckIn,
            });
          }
        }
      } catch { }
    };
    syncPublicSession();
  }, []);

  React.useEffect(() => {
  }, [location.pathname]);

  React.useEffect(() => {
    if (!headerLocationMenuOpen) return;

    const handleOutside = (event: MouseEvent) => {
      if (!headerLocationMenuRef.current) return;
      if (!headerLocationMenuRef.current.contains(event.target as Node)) {
        setHeaderLocationMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHeaderLocationMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [headerLocationMenuOpen]);

  React.useEffect(() => {
    if (!headerLocationMenuOpen) return;
    const current = (headerLocationTerm || '').trim();
    const isDefault =
      !current || current.toLowerCase() === DEFAULT_HEADER_LOCATION.toLowerCase();
    setHeaderLocationSearch(isDefault ? '' : current);
  }, [headerLocationMenuOpen, headerLocationTerm]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryLocation = (params.get('location') || '').trim();
    const storedLocation =
      typeof window === 'undefined'
        ? ''
        : (localStorage.getItem(BROWSE_LOCATION_STORAGE_KEY) || '').trim();

    setHeaderSearchTerm(params.get('search') || '');
    setHeaderLocationTerm(queryLocation || storedLocation || DEFAULT_HEADER_LOCATION);
  }, [location.search]);

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      await supabase.auth.signOut();
      localStorage.removeItem('sb-ddkkbtijqrgpitncxylx-auth-token');
      clearUser();
      navigate('/');
    } catch {
      clearUser();
      navigate('/');
    }
  };

  const handleHeaderSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedSearch = headerSearchTerm.trim();
    const trimmedLocation = headerLocationTerm.trim();
    const hasExplicitLocation =
      trimmedLocation &&
      trimmedLocation.toLowerCase() !== DEFAULT_HEADER_LOCATION.toLowerCase();
    const canSubmit = Boolean(trimmedSearch || hasExplicitLocation);
    if (!canSubmit) return;

    const params = new URLSearchParams();

    if (trimmedSearch) params.set('search', trimmedSearch);
    if (hasExplicitLocation) {
      params.set('location', trimmedLocation);
    }

    const query = params.toString();
    navigate(`/browse-events${query ? `?${query}` : ''}`);
  };

  const handleSelectHeaderLocation = (value: string) => {
    setHeaderLocationTerm(value);
    setHeaderLocationError('');
    setHeaderLocationMenuOpen(false);
  };

  const handleApplyHeaderLocationSearch = () => {
    const trimmed = (headerLocationSearch || '').trim();
    if (!trimmed) {
      setHeaderLocationError('Please type a location first.');
      return;
    }
    handleSelectHeaderLocation(trimmed);
  };

  const handleUseCurrentLocationInHeader = async () => {
    if (!navigator.geolocation) {
      setHeaderLocationError('Geolocation is not supported on this browser.');
      setHeaderLocationMenuOpen(true);
      return;
    }

    setHeaderLocating(true);
    setHeaderLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const city = await reverseLookupCity(position.coords.latitude, position.coords.longitude);
          if (!city) {
            setHeaderLocationError('Could not detect city. Please try again.');
            setHeaderLocationMenuOpen(true);
            return;
          }
          handleSelectHeaderLocation(city);
        } finally {
          setHeaderLocating(false);
        }
      },
      (error) => {
        setHeaderLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setHeaderLocationError('Location permission denied.');
          setHeaderLocationMenuOpen(true);
          return;
        }
        setHeaderLocationError('Unable to get your location.');
        setHeaderLocationMenuOpen(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const navLinks = isOrganizer
    ? [
      { label: 'About Us', path: '/about-us' },
      { label: 'Pricing', path: '/pricing' },
      { label: 'Contact Us', path: '/contact-us' },
    ]
    : [
      { label: 'About Us', path: '/about-us' },
      { label: 'Events', path: '/browse-events' },
      { label: 'Pricing', path: '/pricing' },
      { label: 'Contact Us', path: '/contact-us' },
    ];
  const secondaryLinks = navLinks;
  const trimmedHeaderSearch = headerSearchTerm.trim();
  const trimmedHeaderLocation = headerLocationTerm.trim();
  const hasHeaderExplicitLocation = Boolean(
    trimmedHeaderLocation &&
    trimmedHeaderLocation.toLowerCase() !== DEFAULT_HEADER_LOCATION.toLowerCase()
  );
  const canSubmitHeaderSearch = Boolean(trimmedHeaderSearch || hasHeaderExplicitLocation);

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F2F2]">
      <header className="bg-[#F2F2F2] border-b border-[#2E2E2F]/10 sticky top-0 z-50">
        <div className="max-w-[88rem] mx-auto h-20 w-full px-6 flex items-center gap-4">
          <Link to="/" className="shrink-0">
            <Branding className="text-xl lg:text-2xl" />
          </Link>

          <nav className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-6">
            {showHeaderSearchBar && (
              <form onSubmit={handleHeaderSearchSubmit} className="w-[380px] xl:w-[500px] 2xl:w-[560px] max-w-full">
                <div className="flex items-center rounded-2xl border border-[#2E2E2F]/10 bg-[#F2F2F2] overflow-hidden shadow-[0_14px_28px_-24px_rgba(46,46,47,0.55)]">
                  <label className="flex items-center gap-2 px-3.5 py-2.5 min-w-0 flex-1 border-r border-[#2E2E2F]/10 bg-[#F2F2F2]">
                    <ICONS.Search className="w-3.5 h-3.5 text-[#2E2E2F]/45 shrink-0" />
                    <input
                      type="text"
                      value={headerSearchTerm}
                      onChange={(event) => setHeaderSearchTerm(event.target.value)}
                      placeholder="Search"
                      className="w-full bg-transparent text-[11px] font-semibold text-[#2E2E2F] placeholder:text-[#2E2E2F]/35 outline-none"
                    />
                  </label>
                  <div
                    className="relative min-w-0 flex-1 border-r border-[#2E2E2F]/10 bg-[#F2F2F2]"
                    ref={headerLocationMenuRef}
                  >
                    <div className="w-full flex items-center">
                      <div className="flex-1 min-w-0 flex items-center gap-2 px-3.5 py-2.5">
                        <ICONS.MapPin className="w-3.5 h-3.5 text-[#2E2E2F]/45 shrink-0" />
                        <input
                          type="text"
                          value={hasHeaderExplicitLocation ? headerLocationTerm : ''}
                          onChange={(event) => {
                            const next = event.target.value;
                            setHeaderLocationTerm(next || DEFAULT_HEADER_LOCATION);
                            setHeaderLocationError('');
                          }}
                          onFocus={() => setHeaderLocationMenuOpen(true)}
                          placeholder="Your Location"
                          className="w-full bg-transparent text-[11px] font-semibold text-[#2E2E2F] placeholder:text-[#2E2E2F]/35 outline-none"
                          aria-label="Search location"
                        />
                      </div>
                      <button
                        type="button"
                        className={`px-2.5 py-2.5 transition-colors ${headerLocating
                          ? 'text-[#2E2E2F]/30 cursor-not-allowed'
                          : 'text-[#2E2E2F]/45 hover:text-[#38BDF2]'
                          }`}
                        onClick={handleUseCurrentLocationInHeader}
                        disabled={headerLocating}
                        aria-label="Track current location"
                      >
                        {headerLocating ? (
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full inline-block animate-spin" />
                        ) : (
                          <svg fill="none" stroke="currentColor" strokeWidth={2.3} viewBox="0 0 24 24" className="w-4 h-4">
                            <circle cx="12" cy="12" r="3.2" />
                            <path strokeLinecap="round" d="M12 2.5v3m0 13v3M2.5 12h3m13 0h3M5 5l2.1 2.1m9.8 9.8L19 19M19 5l-2.1 2.1M7.1 16.9L5 19" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {headerLocationMenuOpen && (
                      <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[300px] rounded-xl border border-[#2E2E2F]/10 bg-white shadow-[0_18px_34px_-20px_rgba(46,46,47,0.35)] overflow-hidden">
                        <div className="px-3.5 py-3 border-b border-[#2E2E2F]/10">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-[#2E2E2F]/45 mb-2">
                            Search Location
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={headerLocationSearch}
                              onChange={(event) => setHeaderLocationSearch(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  handleApplyHeaderLocationSearch();
                                }
                              }}
                              placeholder="Type city or area"
                              className="w-full px-3 py-2 rounded-lg border border-[#2E2E2F]/12 bg-[#F2F2F2] text-[12px] font-semibold text-[#2E2E2F] placeholder:text-[#2E2E2F]/35 outline-none focus:border-[#38BDF2]/60"
                            />
                            <button
                              type="button"
                              onClick={handleApplyHeaderLocationSearch}
                              className="px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide text-[#2E2E2F] bg-[#F2F2F2] border border-[#2E2E2F]/10 hover:bg-[#38BDF2]/12 transition-colors"
                            >
                              Use
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleUseCurrentLocationInHeader}
                          disabled={headerLocating}
                          className="w-full px-3.5 py-3 text-left text-xs font-semibold text-[#2E2E2F] hover:bg-[#F2F2F2] transition-colors disabled:opacity-60"
                        >
                          {headerLocating ? 'Detecting location...' : 'Use my current location'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectHeaderLocation(DEFAULT_HEADER_LOCATION)}
                          className="w-full px-3.5 py-3 text-left text-xs font-semibold text-[#2E2E2F] hover:bg-[#F2F2F2] transition-colors border-t border-[#2E2E2F]/10"
                        >
                          Use default location
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectHeaderLocation(ONLINE_LOCATION_VALUE)}
                          className="w-full px-3.5 py-3 text-left text-xs font-semibold text-[#2E2E2F] hover:bg-[#F2F2F2] transition-colors border-t border-[#2E2E2F]/10"
                        >
                          Browse online events
                        </button>
                        {headerLocationError && (
                          <div className="px-3.5 py-2.5 text-[11px] font-semibold text-[#2E2E2F]/80 bg-[#F2F2F2] border-t border-[#2E2E2F]/10">
                            {headerLocationError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!canSubmitHeaderSearch}
                    className={`w-12 h-11 flex items-center justify-center transition-colors ${canSubmitHeaderSearch
                      ? 'text-[#2E2E2F] hover:bg-[#38BDF2]/12 hover:text-[#38BDF2]'
                      : 'text-[#2E2E2F]/25 cursor-not-allowed'
                      }`}
                    aria-label="Find events"
                  >
                    <ICONS.Search className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {secondaryLinks.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                className={`text-[11px] font-semibold tracking-wide transition-colors ${location.pathname === link.path
                  ? 'text-[#38BDF2]'
                  : 'text-[#2E2E2F]/50 hover:text-[#38BDF2]'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4 shrink-0 ml-auto">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 transition-colors"
                  onClick={() => setUserMenuOpen((v) => !v)}
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#38BDF2]/20 text-[#2E2E2F] flex items-center justify-center">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-semibold text-xs text-[#2E2E2F]">{initials}</span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <p className="text-xs font-semibold text-[#2E2E2F] truncate max-w-[120px]">{displayName}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2E2E2F]/45 mt-0.5">{roleLabel}</p>
                  </div>
                  <svg className="w-4 h-4 text-[#2E2E2F]/50" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl shadow-xl z-50 p-2 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                      <div className="px-4 py-3 border-b border-[#2E2E2F]/5 mb-1">
                        <p className="text-[10px] font-medium text-[#2E2E2F]/40 uppercase tracking-widest mb-0.5">Account</p>
                        <p className="text-xs font-semibold text-[#2E2E2F] truncate">{displayName}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2E2E2F]/45 mt-1">{roleLabel}</p>
                      </div>
                      {isOrganizer ? (
                        isAttendingView ? (
                          <>
                            <button
                              className={publicUserMenuActionClass}
                              onClick={() => {
                                setPublicMode('attending');
                                setUserMenuOpen(false);
                                navigate('/browse-events');
                              }}
                            >
                              <ICONS.Calendar className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                              <span>Browse Events</span>
                            </button>
                            <button
                              className={publicUserMenuActionClass}
                              onClick={() => {
                                setPublicMode('attending');
                                setUserMenuOpen(false);
                                navigate('/my-tickets');
                              }}
                            >
                              <ICONS.Ticket className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                              <span>My Tickets</span>
                            </button>
                            <button
                              className={publicUserMenuActionClass}
                              onClick={() => {
                                setPublicMode('organizer');
                                setUserMenuOpen(false);
                                navigate('/my-events');
                              }}
                            >
                              <ICONS.Users className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                              <span>Organize Events</span>
                            </button>
                            <button
                              className={publicUserMenuActionClass}
                              onClick={() => {
                                setPublicMode('attending');
                                setUserMenuOpen(false);
                                navigate('/liked');
                              }}
                            >
                              <ICONS.Heart className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                              <span>Liked</span>
                            </button>
                            <button
                              className={publicUserMenuActionClass}
                              onClick={() => {
                                setPublicMode('attending');
                                setUserMenuOpen(false);
                                navigate('/followings');
                              }}
                            >
                              <ICONS.Users className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                              <span>Followings</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={publicUserMenuActionClass}
                              onClick={() => {
                                setPublicMode('organizer');
                                setUserMenuOpen(false);
                                navigate('/my-events');
                              }}
                            >
                              <ICONS.Calendar className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                              <span>Manage My Events</span>
                            </button>
                            <button
                              className={publicUserMenuActionClass}
                              onClick={() => {
                                setPublicMode('organizer');
                                setUserMenuOpen(false);
                                navigate('/user-settings?tab=organizer');
                              }}
                            >
                              <ICONS.Users className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                              <span>Organizer Profile</span>
                            </button>
                            <button
                              className={publicUserMenuActionClass}
                              onClick={() => {
                                setPublicMode('organizer');
                                setUserMenuOpen(false);
                                navigate('/user-settings?tab=team');
                              }}
                            >
                              <ICONS.Shield className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                              <span>Team & Access</span>
                            </button>
                            <button
                              className={publicUserMenuActionClass}
                              onClick={() => {
                                setPublicMode('organizer');
                                setUserMenuOpen(false);
                                navigate('/user-settings?tab=email');
                              }}
                            >
                              <ICONS.Mail className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                              <span>Email Settings</span>
                            </button>
                            <button
                              className={publicUserMenuActionClass}
                              onClick={() => {
                                setPublicMode('organizer');
                                setUserMenuOpen(false);
                                navigate('/user-settings?tab=account');
                              }}
                            >
                              <ICONS.Settings className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                              <span>Account</span>
                            </button>
                          </>
                        )
                      ) : (
                        <>
                          <button
                            className={publicUserMenuActionClass}
                            onClick={() => { setUserMenuOpen(false); navigate('/browse-events'); }}
                          >
                            <ICONS.Calendar className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                            <span>Browse Events</span>
                          </button>
                          <button
                            className={publicUserMenuActionClass}
                            onClick={() => { setUserMenuOpen(false); navigate('/my-tickets'); }}
                          >
                            <ICONS.Ticket className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                            <span>My Tickets</span>
                          </button>
                          <button
                            className={publicUserMenuActionClass}
                            onClick={() => { setUserMenuOpen(false); navigate('/liked'); }}
                          >
                            <ICONS.Heart className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                            <span>Liked</span>
                          </button>
                          <button
                            className={publicUserMenuActionClass}
                            onClick={() => { setUserMenuOpen(false); navigate('/followings'); }}
                          >
                            <ICONS.Users className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                            <span>Followings</span>
                          </button>
                        </>
                      )}
                      <div className="border-t border-[#2E2E2F]/5 mt-1 pt-1">
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-red-50 hover:text-red-500 transition-colors text-left group"
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleLogout();
                          }}
                        >
                          <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4 lg:gap-6">
                <Link to="/login" className="text-[11px] font-black tracking-wide text-[#2E2E2F]/40 hover:text-[#38BDF2] transition-colors">
                  Login
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="px-5 text-[11px] font-black tracking-wide bg-[#38BDF2] hover:bg-[#2E2E2F] shadow-lg shadow-[#38BDF2]/20">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div >
      </header >
      <main className="flex-1">{children}</main>
      <footer className="bg-[#F2F2F2] text-[#2E2E2F]/70 py-16 px-8 border-t border-[#2E2E2F]/10">
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
                <Link to="/" className="block text-[#2E2E2F]/70 hover:text-[#38BDF2]">Events List</Link>
              </div>
              <div className="space-y-4">
                <Link to="/" className="block text-[#2E2E2F]/70 hover:text-[#38BDF2]">Home</Link>
                <Link to="/about-us" className="block text-[#2E2E2F]/70 hover:text-[#38BDF2]">About Us</Link>
                <Link to="/browse-events" className="block text-[#2E2E2F]/70 hover:text-[#38BDF2]">Events</Link>
                <Link to="/pricing" className="block text-[#2E2E2F]/70 hover:text-[#38BDF2]">Pricing</Link>
                <Link to="/contact-us" className="block text-[#2E2E2F]/70 hover:text-[#38BDF2]">Contact Us</Link>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-[#2E2E2F]/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-[9px] uppercase tracking-[0.3em] font-black text-[#2E2E2F]/60">
              Â© 2026 StartupLab Business Center
            </div>
            <div className="flex items-center gap-6 opacity-60 grayscale">
              <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/images/hitpay.png" alt="HitPay" className="h-3" />
            </div>
          </div>
        </div>
      </footer>
    </div >
  );
};

// â”€â”€â”€ USER PORTAL LAYOUT (icon sidebar only, no header bar) â”€â”€â”€
// ─── USER DASHBOARD WRAPPER ───
const DashboardWrapper: React.FC = () => {
  const { role } = useUser();
  if (role === UserRole.ADMIN) return <PortalLayout><AdminDashboard /></PortalLayout>;
  return <UserPortalLayout><AdminDashboard /></UserPortalLayout>;
};

// ─── USER PORTAL LAYOUT (Synced with Admin PortalLayout) ───
const UserPortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, email, name, imageUrl, clearUser, setUser } = useUser();
  const { isAttendingView, setPublicMode } = useEngagement();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = React.useState(true);
  const [settingsOpen, setSettingsOpen] = React.useState(location.pathname === '/user-settings');
  const [notificationOpen, setNotificationOpen] = React.useState(false);

  React.useEffect(() => {
    if (location.pathname === '/user-settings') setSettingsOpen(true);
  }, [location.pathname]);
  const [organizerSidebarLogoUrl, setOrganizerSidebarLogoUrl] = React.useState('');
  const [organizerSidebarName, setOrganizerSidebarName] = React.useState('');

  const displayName = email?.trim() || name?.trim() || 'User';
  const roleLabel = getRoleLabel(role);
  const initials = (email?.split('@')[0] || name?.trim() || displayName || 'U').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const hasOrganizerSidebarLogo = Boolean(organizerSidebarLogoUrl);
  const organizerSidebarLogoAlt = organizerSidebarName || 'Organizer logo';

  React.useEffect(() => {
    const syncSession = async () => {
      try {
        const res = await fetch(`${API}/api/whoAmI`, { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const me = await res.json().catch(() => null);
          const normalizedRole = normalizeUserRole(me?.role);
          if (normalizedRole && me?.email) {
            setUser({ role: normalizedRole, email: me.email, name: me.name ?? null, imageUrl: me.imageUrl ?? null, canViewEvents: true, canEditEvents: true, canManualCheckIn: true });
          }
        }
      } catch { }
    };
    syncSession();
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const loadOrganizerSidebarBrand = async () => {
      if (role !== UserRole.ORGANIZER) {
        if (isMounted) {
          setOrganizerSidebarLogoUrl('');
          setOrganizerSidebarName('');
        }
        return;
      }

      try {
        const organizer = await apiService.getMyOrganizer();
        if (!isMounted) return;
        setOrganizerSidebarLogoUrl(organizer?.profileImageUrl || '');
        setOrganizerSidebarName((organizer?.organizerName || '').trim());
      } catch {
        if (isMounted) {
          setOrganizerSidebarLogoUrl('');
          setOrganizerSidebarName('');
        }
      }
    };

    loadOrganizerSidebarBrand();
    return () => {
      isMounted = false;
    };
  }, [role, location.pathname]);

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
      await supabase.auth.signOut();
      clearUser(); navigate('/');
    } catch { clearUser(); navigate('/'); }
  };

  const menuItems = [
    { label: 'Home', path: '/user-home', icon: <ICONS.Home className="w-5 h-5" /> },
    { label: 'Dashboard', path: '/dashboard', icon: <ICONS.Layout className="w-5 h-5" /> },
    { label: 'Events', path: '/my-events', icon: <ICONS.Calendar className="w-5 h-5" /> },
    { label: 'Settings', path: '/user-settings', icon: <ICONS.Settings className="w-5 h-5" /> },
    { label: 'Attendees', path: '/user/attendees', icon: <ICONS.Users className="w-5 h-5" /> },
    { label: 'Check-In', path: '/user/checkin', icon: <ICONS.CheckCircle className="w-5 h-5" /> },
  ];

  const handleToggleAttendingMode = () => {
    if (isAttendingView) {
      setPublicMode('organizer');
      navigate('/my-events');
    } else {
      setPublicMode('attending');
      navigate('/browse-events');
    }
    setSidebarOpen(false);
    setUserMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#F2F2F2]">
      {/* Sidebar for desktop */}
      <aside
        className={`bg-[#F2F2F2] border-r border-[#2E2E2F]/10 hidden md:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out ${desktopSidebarOpen ? 'w-72' : 'w-20'
          }`}
      >
        <div className={`pt-8 pb-6 px-4 flex flex-col items-center justify-center transition-all duration-300`}>
          <Link to="/user-home" className="flex items-center justify-center w-full">
            {hasOrganizerSidebarLogo ? (
              <img
                src={organizerSidebarLogoUrl}
                alt={organizerSidebarLogoAlt}
                className={`w-full object-contain transition-all duration-300 ${desktopSidebarOpen ? 'h-16 max-w-[220px]' : 'h-10 max-w-[52px]'}`}
              />
            ) : (
              <img
                src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
                alt="StartupLab Logo"
                className={`w-full object-contain transition-all duration-300 ${desktopSidebarOpen ? 'h-16 max-w-[220px]' : 'h-10 max-w-[52px]'}`}
              />
            )}
          </Link>
          {desktopSidebarOpen && (
            <div className="mt-4 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="w-2 h-2 rounded-full bg-[#38BDF2]"></span>
              <p className="text-[9px] uppercase font-black text-[#2E2E2F]/60 tracking-[0.2em]">
                Organizer Portal
              </p>
            </div>
          )}
        </div>
        <nav className={`flex-1 ${desktopSidebarOpen ? 'px-4' : 'px-2'} py-4 space-y-1`}>
          {menuItems.map((item) => {
            if (item.label === 'Settings') {
              const isActive = location.pathname === '/user-settings';
              return (
                <div key="settings-group" className="space-y-1">
                  <button
                    onClick={() => desktopSidebarOpen ? setSettingsOpen(!settingsOpen) : navigate('/user-settings')}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors group ${isActive
                      ? 'bg-[#38BDF2]/10 text-[#38BDF2]'
                      : 'text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2]'
                      } ${!desktopSidebarOpen ? 'justify-center border-none' : 'justify-between'}`}
                    title={!desktopSidebarOpen ? item.label : undefined}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {desktopSidebarOpen && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
                    </div>
                    {desktopSidebarOpen && (
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  {settingsOpen && desktopSidebarOpen && (
                    <div className="ml-6 space-y-1 animate-in slide-in-from-top-2 duration-200 border-l border-[#2E2E2F]/10 pl-4">
                      <Link
                        to="/user-settings?tab=organizer"
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-bold tracking-tight transition-colors ${location.search.includes('tab=organizer') || (location.pathname === '/user-settings' && !location.search)
                          ? 'text-[#38BDF2] bg-[#38BDF2]/5'
                          : 'text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2]'
                          }`}
                      >
                        <ICONS.Users className="w-4 h-4 opacity-80" />
                        Org Profile
                      </Link>
                      <Link
                        to="/user-settings?tab=team"
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-bold tracking-tight transition-colors ${location.search.includes('tab=team')
                          ? 'text-[#38BDF2] bg-[#38BDF2]/5'
                          : 'text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2]'
                          }`}
                      >
                        <ICONS.Shield className="w-4 h-4 opacity-80" />
                        Teams & Access
                      </Link>
                      <Link
                        to="/user-settings?tab=email"
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-bold tracking-tight transition-colors ${location.search.includes('tab=email')
                          ? 'text-[#38BDF2] bg-[#38BDF2]/5'
                          : 'text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2]'
                          }`}
                      >
                        <ICONS.Mail className="w-4 h-4 opacity-80" />
                        Email Setup
                      </Link>
                      <Link
                        to="/user-settings?tab=account"
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-bold tracking-tight transition-colors ${location.search.includes('tab=account')
                          ? 'text-[#38BDF2] bg-[#38BDF2]/5'
                          : 'text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2]'
                          }`}
                      >
                        <ICONS.Settings className="w-4 h-4 opacity-80" />
                        Account
                      </Link>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors group ${location.pathname === item.path
                  ? 'bg-[#38BDF2] text-[#F2F2F2]'
                  : 'text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2]'
                  } ${!desktopSidebarOpen ? 'justify-center border-none' : ''}`}
                title={!desktopSidebarOpen ? item.label : undefined}
              >
                {item.icon}
                {desktopSidebarOpen && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${desktopSidebarOpen ? 'md:pl-72' : 'md:pl-20'
          }`}
      >
        <header className="h-20 bg-[#F2F2F2] border-b border-[#2E2E2F]/10 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 w-full">
          <div className="flex items-center gap-3">
            <button
              className="hidden md:flex w-10 h-10 items-center justify-center rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 transition-colors"
              onClick={() => setDesktopSidebarOpen((prev) => !prev)}
              aria-label={desktopSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-pressed={desktopSidebarOpen}
            >
              <svg className="w-5 h-5 text-[#2E2E2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5 text-[#2E2E2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] uppercase font-black text-[#2E2E2F]/50 tracking-[0.2em]">
                Organizer Panel
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="relative">
              <button
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 transition-colors relative"
                onClick={() => setNotificationOpen(!notificationOpen)}
              >
                <ICONS.Bell className="w-5 h-5 text-[#2E2E2F]/60" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F2F2F2]"></span>
              </button>
              {notificationOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl shadow-xl z-50 p-4 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2E2E2F]/5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#2E2E2F]">Notifications</h4>
                      <span className="text-[10px] font-bold text-[#38BDF2]">Mark all as read</span>
                    </div>
                    <div className="space-y-3 py-2">
                      <div className="flex gap-3 p-3 rounded-xl bg-white border border-[#2E2E2F]/5">
                        <div className="w-8 h-8 rounded-lg bg-[#38BDF2]/10 flex items-center justify-center shrink-0">
                          <ICONS.Calendar className="w-4 h-4 text-[#38BDF2]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2E2E2F]">Welcome to StartupLab!</p>
                          <p className="text-[10px] text-[#2E2E2F]/50 mt-1">Start creating your first event today.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 transition-colors"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#38BDF2]/20 text-[#2E2E2F] flex items-center justify-center">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-semibold text-xs text-[#2E2E2F]">{initials}</span>
                  )}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-xs font-semibold text-[#2E2E2F] truncate max-w-[120px]">{displayName}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2E2E2F]/45 mt-0.5">{roleLabel}</p>
                </div>
                <svg className="w-4 h-4 text-[#2E2E2F]/50" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl shadow-xl z-50 p-2 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="px-4 py-3 border-b border-[#2E2E2F]/5 mb-1">
                      <p className="text-[10px] font-medium text-[#2E2E2F]/40 uppercase tracking-widest mb-0.5">Account</p>
                      <p className="text-xs font-semibold text-[#2E2E2F] truncate">{displayName}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2E2E2F]/45 mt-1">{roleLabel}</p>
                    </div>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                      onClick={() => {
                        setPublicMode('organizer');
                        navigate('/my-events');
                        setUserMenuOpen(false);
                      }}
                    >
                      <ICONS.Calendar className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>Manage My Events</span>
                    </button>
                    {role === UserRole.ORGANIZER && (
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                        onClick={handleToggleAttendingMode}
                      >
                        <ICONS.Users className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                        <span>{isAttendingView ? 'Organize Events' : 'Switch to Attending'}</span>
                      </button>
                    )}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                      onClick={() => {
                        navigate('/user-settings?tab=organizer');
                        setUserMenuOpen(false);
                      }}
                    >
                      <ICONS.Users className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>Org Profile</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                      onClick={() => {
                        navigate('/user-settings?tab=team');
                        setUserMenuOpen(false);
                      }}
                    >
                      <ICONS.Shield className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>Teams & Access</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                      onClick={() => {
                        navigate('/user-settings?tab=email');
                        setUserMenuOpen(false);
                      }}
                    >
                      <ICONS.Mail className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>Email Setup</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                      onClick={() => {
                        navigate('/user-settings?tab=account');
                        setUserMenuOpen(false);
                      }}
                    >
                      <ICONS.Settings className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>Account Settings</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F]/70 hover:bg-red-50 hover:text-red-500 transition-colors text-left group"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Sidebar overlay for mobile */}
        <button
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#38BDF2] text-white rounded-full shadow-2xl z-50 flex items-center justify-center focus:outline-none"
          onClick={() => setSidebarOpen(true)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        {sidebarOpen && (
          <div className="fixed inset-0 z-[100] flex lg:hidden">
            <div className="fixed inset-0 bg-[#2E2E2F]/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="relative w-64 bg-[#38BDF2] flex flex-col h-full z-50 animate-in slide-in-from-left duration-300">
              <div className="p-8 flex items-center justify-between">
                {hasOrganizerSidebarLogo ? (
                  <img
                    src={organizerSidebarLogoUrl}
                    alt={organizerSidebarLogoAlt}
                    className="h-10 w-auto max-w-[140px] object-contain brightness-0 invert"
                  />
                ) : (
                  <Branding className="h-10 w-auto" light />
                )}
                <button
                  className="min-h-[32px] min-w-[32px] px-2 py-2 rounded-xl bg-[#38BDF2] text-[#F2F2F2] hover:bg-[#2E2E2F] hover:text-[#F2F2F2] transition-colors"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${location.pathname === item.path
                      ? 'bg-white text-[#38BDF2] shadow-lg shadow-black/5'
                      : 'text-white/60 hover:bg-[#2E2E2F] hover:text-white'
                      }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </aside>
          </div>
        )}

        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

const roleHomePath = (role: UserRole): string => {
  if (role === UserRole.ORGANIZER) return '/user-home';
  if (role === UserRole.STAFF) return '/events';
  if (role === UserRole.ATTENDEE) return '/browse-events';
  return '/dashboard';
};

const RequireRoleRoute: React.FC<{ allow: UserRole[]; children: React.ReactElement }> = ({ allow, children }) => {
  const { setUser, clearUser } = useUser();
  const [checking, setChecking] = React.useState(true);
  const [resolvedRole, setResolvedRole] = React.useState<UserRole | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      setChecking(true);
      try {
        const res = await fetch(`${API}/api/whoAmI`, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) throw new Error('Unauthorized');
        const me = await res.json().catch(() => null);
        const role = normalizeUserRole(me?.role);
        if (!role || !me?.email) throw new Error('Invalid session');
        setUser({
          role,
          email: me.email,
          name: me.name ?? null,
          imageUrl: me.imageUrl ?? null,
          canViewEvents: me.canViewEvents,
          canEditEvents: me.canEditEvents,
          canManualCheckIn: me.canManualCheckIn,
        });

        if (!cancelled) setResolvedRole(role);
      } catch {
        clearUser();
        if (!cancelled) setResolvedRole(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    checkAccess();
    return () => { cancelled = true; };
  }, [setUser, clearUser]);

  if (checking) return <PageLoader label="Checking access..." variant="page" />;
  if (!resolvedRole) return <Navigate to="/login" replace />;
  if (!allow.includes(resolvedRole)) return <Navigate to={roleHomePath(resolvedRole)} replace />;
  return children;
};

const App: React.FC = () => (
  <Router>
    <Routes>
      <Route path="/login" element={<LoginPerspective />} />
      <Route path="/signup" element={<SignUpView />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/" element={<PublicLayout><EventList /></PublicLayout>} />
      <Route path="/categories/:categoryKey" element={<PublicLayout><CategoryEvents /></PublicLayout>} />
      <Route path="/events/:slug" element={<PublicLayout><EventDetails /></PublicLayout>} />
      <Route path="/events/:slug/register" element={<PublicLayout><RegistrationForm /></PublicLayout>} />
      <Route path="/payment/status" element={<PublicLayout><PaymentStatusView /></PublicLayout>} />
      <Route path="/tickets/:ticketId" element={<PublicLayout><TicketView /></PublicLayout>} />
      <Route path="/about-us" element={<PublicLayout><AboutUsPage /></PublicLayout>} />
      <Route path="/browse-events" element={<PublicLayout><PublicEventsPage /></PublicLayout>} />
      <Route path="/liked" element={<PublicLayout><LikedEventsPage /></PublicLayout>} />
      <Route path="/followings" element={<PublicLayout><FollowingsEventsPage /></PublicLayout>} />
      <Route path="/my-tickets" element={<PublicLayout><MyTicketsPage /></PublicLayout>} />
      <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicyPage /></PublicLayout>} />
      <Route path="/terms-of-service" element={<PublicLayout><TermsOfServicePage /></PublicLayout>} />
      <Route path="/contact-us" element={<PublicLayout><ContactUsPage /></PublicLayout>} />
      <Route path="/pricing" element={<PublicLayout><PricingPage /></PublicLayout>} />
      <Route path="/faq" element={<PublicLayout><FaqPage /></PublicLayout>} />
      <Route path="/refund-policy" element={<PublicLayout><RefundPolicyPage /></PublicLayout>} />

      {/* User Portal Routes */}
      <Route path="/user-home" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><UserHome /></UserPortalLayout></RequireRoleRoute>} />
      <Route path="/my-events" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><UserEvents /></UserPortalLayout></RequireRoleRoute>} />
      <Route path="/user-settings" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><UserSettings /></UserPortalLayout></RequireRoleRoute>} />
      <Route path="/organizer-settings" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><Navigate to="/user-settings?tab=organizer" replace /></RequireRoleRoute>} />
      <Route path="/account-settings" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><Navigate to="/user-settings?tab=account" replace /></RequireRoleRoute>} />
      <Route path="/user/attendees" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><RegistrationsList /></UserPortalLayout></RequireRoleRoute>} />
      <Route path="/user/checkin" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><CheckIn /></UserPortalLayout></RequireRoleRoute>} />

      {/* Admin Portal Routes */}
      <Route path="/dashboard" element={<RequireRoleRoute allow={[UserRole.ADMIN, UserRole.ORGANIZER]}><DashboardWrapper /></RequireRoleRoute>} />
      <Route path="/events" element={<RequireRoleRoute allow={[UserRole.ADMIN, UserRole.STAFF]}><PortalLayout><EventsManagement /></PortalLayout></RequireRoleRoute>} />
      <Route path="/attendees" element={<RequireRoleRoute allow={[UserRole.ADMIN, UserRole.STAFF]}><PortalLayout><RegistrationsList /></PortalLayout></RequireRoleRoute>} />
      <Route path="/checkin" element={<RequireRoleRoute allow={[UserRole.ADMIN, UserRole.STAFF]}><PortalLayout><CheckIn /></PortalLayout></RequireRoleRoute>} />
      <Route path="/settings" element={<RequireRoleRoute allow={[UserRole.ADMIN]}><PortalLayout><SettingsView /></PortalLayout></RequireRoleRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Router>
);
export default App;
