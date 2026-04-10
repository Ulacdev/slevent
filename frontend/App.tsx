
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useSearchParams, useNavigate, Navigate } from 'react-router-dom';

























import { AuthModal } from './components/AuthModal';












import { FloatingSupportModal } from './components/FloatingSupportModal';


import { ONLINE_LOCATION_VALUE } from './components/BrowseEventsNavigator';
import { ICONS } from './constants';
import { Button, Input, Modal, PageLoader } from './components/Shared';
import { useToast } from './context/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { apiService } from './services/apiService';
import { UserRole, normalizeUserRole } from './types';
import { supabase } from "./supabase/supabaseClient.js";
import { useUser } from './context/UserContext';
import { useEngagement } from './context/EngagementContext';
const EventList = React.lazy(() => import('./views/Public/EventList').then(module => ({ default: module.EventList })));
const CategoryEvents = React.lazy(() => import('./views/Public/CategoryEvents').then(module => ({ default: module.CategoryEvents })));
const EventDetails = React.lazy(() => import('./views/Public/EventDetails').then(module => ({ default: module.EventDetails })));
const RegistrationForm = React.lazy(() => import('./views/Public/RegistrationForm').then(module => ({ default: module.RegistrationForm })));
const PaymentStatusView = React.lazy(() => import('./views/Public/PaymentStatus').then(module => ({ default: module.PaymentStatusView })));
const TicketView = React.lazy(() => import('./views/Public/TicketView').then(module => ({ default: module.TicketView })));
const AboutUsPage = React.lazy(() => import('./views/Public/AboutUsPage').then(module => ({ default: module.AboutUsPage })));
const ContactUsPage = React.lazy(() => import('./views/Public/ContactUsPage').then(module => ({ default: module.ContactUsPage })));
const PublicEventsPage = React.lazy(() => import('./views/Public/PublicEventsPage').then(module => ({ default: module.PublicEventsPage })));
const LikedEventsPage = React.lazy(() => import('./views/Public/LikedEventsPage').then(module => ({ default: module.LikedEventsPage })));
const FollowingsEventsPage = React.lazy(() => import('./views/Public/FollowingsEventsPage').then(module => ({ default: module.FollowingsEventsPage })));
const OrganizerProfilePage = React.lazy(() => import('./views/Public/OrganizerProfile').then(module => ({ default: module.OrganizerProfilePage })));
const PricingPage = React.lazy(() => import('./views/Public/PricingPage').then(module => ({ default: module.PricingPage })));
const PrivacyPolicyPage = React.lazy(() => import('./views/Public/InfoPages').then(module => ({ default: module.PrivacyPolicyPage })));
const TermsOfServicePage = React.lazy(() => import('./views/Public/InfoPages').then(module => ({ default: module.TermsOfServicePage })));
const FaqPage = React.lazy(() => import('./views/Public/InfoPages').then(module => ({ default: module.FaqPage })));
const RefundPolicyPage = React.lazy(() => import('./views/Public/InfoPages').then(module => ({ default: module.RefundPolicyPage })));
const LivePage = React.lazy(() => import('./views/Public/LivePage').then(module => ({ default: module.LivePage })));
const OrganizerDiscoveryPage = React.lazy(() => import('./views/Public/OrganizerDiscoveryPage').then(module => ({ default: module.OrganizerDiscoveryPage })));
const AdminDashboard = React.lazy(() => import('./views/Admin/Dashboard').then(module => ({ default: module.AdminDashboard })));
const EventsManagement = React.lazy(() => import('./views/Admin/EventsManagement').then(module => ({ default: module.EventsManagement })));
const RegistrationsList = React.lazy(() => import('./views/Admin/RegistrationsList').then(module => ({ default: module.RegistrationsList })));
const CheckIn = React.lazy(() => import('./views/Admin/CheckIn').then(module => ({ default: module.CheckIn })));
const ArchiveEvents = React.lazy(() => import('./views/User/ArchiveEvents').then(module => ({ default: module.ArchiveEvents })));
const OrganizerReports = React.lazy(() => import('./views/User/OrganizerReports').then(module => ({ default: module.OrganizerReports })));
const SettingsView = React.lazy(() => import('./views/Admin/Settings').then(module => ({ default: module.SettingsView })));
const SubscriptionPlans = React.lazy(() => import('./views/Admin/SubscriptionPlans').then(module => ({ default: module.SubscriptionPlans })));
const CategoryManagement = React.lazy(() => import('./views/Admin/CategoryManagement').then(module => ({ default: module.CategoryManagement })));
const DiscoveryHub = React.lazy(() => import('./views/Admin/DiscoveryHub').then(module => ({ default: module.DiscoveryHub })));
const Announcements = React.lazy(() => import('./views/Admin/Announcements'));
const LoginPerspective = React.lazy(() => import('./views/Auth/Login').then(module => ({ default: module.LoginPerspective })));
const SignUpView = React.lazy(() => import('./views/Auth/SignUp').then(module => ({ default: module.SignUpView })));
const AcceptInvite = React.lazy(() => import('./views/Auth/AcceptInvite').then(module => ({ default: module.AcceptInvite })));
const ForgotPassword = React.lazy(() => import('./views/Auth/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const ResetPassword = React.lazy(() => import('./views/Auth/ResetPassword').then(module => ({ default: module.ResetPassword })));
const UserSettings = React.lazy(() => import('./views/User/UserSettings').then(module => ({ default: module.UserSettings })));
const UserEvents = React.lazy(() => import('./views/User/UserEvents').then(module => ({ default: module.UserEvents })));
const UserHome = React.lazy(() => import('./views/User/UserHome').then(module => ({ default: module.UserHome })));
const OrganizerSubscription = React.lazy(() => import('./views/User/OrganizerSubscription').then(module => ({ default: module.OrganizerSubscription })));
const OrganizerSupport = React.lazy(() => import('./views/User/OrganizerSupport').then(module => ({ default: module.OrganizerSupport })));
const OrganizerDashboard = React.lazy(() => import('./views/User/OrganizerDashboard').then(module => ({ default: module.OrganizerDashboard })));
const ArchiveSupport = React.lazy(() => import('./views/User/ArchiveSupport').then(module => ({ default: module.ArchiveSupport })));
const SubscriptionSuccess = React.lazy(() => import('./views/User/SubscriptionSuccess').then(module => ({ default: module.SubscriptionSuccess })));
const MyTicketsPage = React.lazy(() => import('./views/Public/MyTicketsPage'));
const WelcomeView = React.lazy(() => import('./views/User/WelcomeView'));
const API = import.meta.env.VITE_API_BASE;
const DEFAULT_HEADER_LOCATION = 'Your Location';
const BROWSE_LOCATION_STORAGE_KEY = 'browse_events_location';
const Branding: React.FC<{ className?: string, light?: boolean }> = ({ className = '', light = false }) => {
  const { role, employerLogoUrl } = useUser();
  const isStaff = (role === UserRole.STAFF);

  // Strict Policy: Staff MUST see their logo. If it's missing, show a neutral placeholder while sync happens.
  if (isStaff && !employerLogoUrl) {
    return (
      <div className={`flex items-center justify-center p-2 rounded-lg opacity-20 animate-pulse ${className}`}>
        <div className="w-10 h-10 bg-[#2E2E2F] rounded" />
      </div>
    );
  }

  return (
    <img
      src={employerLogoUrl || "https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"}
      alt="Logo"
      className={`block max-w-full transform transition-all duration-300 hover:scale-[1.03] cursor-pointer ${className}`}
      style={{ filter: light && !employerLogoUrl ? 'invert(1) grayscale(1) brightness(2)' : undefined }}
    />
  );
};


const getRoleLabel = (roleValue: unknown): string => {
  const normalized = String(roleValue || '').toUpperCase();
  if (normalized === UserRole.ADMIN) return 'Admin';
  if (normalized === UserRole.STAFF) return 'Staff';
  if (normalized === 'ATTENDEE') return 'Attendee';
  if (normalized === UserRole.ORGANIZER || normalized === 'USER') return 'Organizer';
  return 'User';
};

/**
 * Enhanced reverse lookup with faster response and better error handling
 */
const reverseLookupCity = async (lat: number, lon: number): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
      {
        headers: { 'Accept': 'application/json', 'User-Agent': 'StartupLab-Business-Ticketing' },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    const address = payload?.address || {};

    // Prioritize city-like fields
    return (
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.suburb ||
      address.city_district ||
      address.state ||
      payload?.display_name?.split(',')[0] ||
      null
    );
  } catch (err) {
    console.error('GPS Reverse Lookup Error:', err);
    return null;
  }
};

const CrownBadge = () => (
  <div className="absolute -top-1 -right-2 text-[#F59E0B] drop-shadow-sm">
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" />
    </svg>
  </div>
);

const PortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    userId, role, email, name, imageUrl, isAuthenticated,
    clearUser, setUser, canViewEvents, canEditEvents,
    canManualCheckIn, canReceiveNotifications, hasResolvedSession,
    employerLogoUrl, employerName, employerId
  } = useUser();
  const isStaff = role === UserRole.STAFF;
  const { showToast } = useToast();

  const handleLogout = React.useCallback(async (message?: string) => {
    try {
      await apiService._fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
      await supabase.auth.signOut();
      localStorage.removeItem('sb-ddkkbtijqrgpitncxylx-auth-token');
      localStorage.removeItem('hideUpgradeModal');
      sessionStorage.removeItem('hideUpgradeModal');
      clearUser();
      showToast('success', message || 'Logged out successfully.');
      navigate('/');
    } catch {
      clearUser();
      navigate('/');
    }
  }, [clearUser, navigate, showToast]);
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
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [selectedNotification, setSelectedNotification] = React.useState<any | null>(null);

  // Use localStorage to persist the desktop sidebar toggle status
  const [desktopSidebarOpen, setDesktopSidebarOpen] = React.useState(() => {
    const saved = localStorage.getItem('desktopSidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Session Inactivity Tracking (7 minutes limit as per security requirements)
  const lastActivityRef = React.useRef(Date.now());
  const INACTIVITY_LIMIT = 7 * 60 * 1000;

  React.useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(name => document.addEventListener(name, updateActivity));

    // Check for inactivity every minute
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current > INACTIVITY_LIMIT) {
        console.warn('🕒 [SECURITY] Session expired due to inactivity (7 mins)');
        handleLogout('Your session has expired');
      }
    }, 60000);

    return () => {
      events.forEach(name => document.removeEventListener(name, updateActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated, handleLogout]);

  // Sync state to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('desktopSidebarOpen', JSON.stringify(desktopSidebarOpen));
  }, [desktopSidebarOpen]);

  // Fetch notifications for the notification bell
  const fetchNotifications = React.useCallback(async () => {
    if (!isAuthenticated) return;
    // Only fetch for staff if they have permission
    if (role === UserRole.STAFF && canReceiveNotifications === false) return;

    try {
      setNotificationsLoading(true);
      const data = await apiService.getMyNotifications(25);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: any) {
      if (err?.message?.includes('session missing') || err?.message?.includes('401')) {
        return; 
      }
      console.error('Failed to fetch notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  }, [isAuthenticated, role, canReceiveNotifications, clearUser, navigate]);

  // Mark a single notification as read
  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationRead(notificationId);
      setNotifications(prev => prev.map(n =>
        n.notificationId === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const renderMessageContent = (msg: string | null) => {
    if (!msg) return null;

    // Check for [IMAGE_URL: some_url]
    const imageMatch = msg.match(/\[IMAGE_URL: (.*?)\]/);
    if (imageMatch) {
      const imageUrl = imageMatch[1];
      const textPart = msg.replace(/\[IMAGE_URL: (.*?)\]/g, '').trim();

      return (
        <div className="space-y-3">
          {textPart && <p className="leading-relaxed whitespace-pre-wrap">{textPart}</p>}
          <div className="relative group cursor-pointer max-w-sm" onClick={() => window.open(imageUrl, '_blank')}>
            <img
              src={imageUrl}
              alt="Attachment"
              className="max-h-60 w-auto rounded-lg border border-[#2E2E2F]/10 shadow-sm transition-all group-hover:scale-[1.01] active:scale-[0.99]"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ICONS.Eye className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      );
    }

    return <p className="leading-relaxed whitespace-pre-wrap">{msg}</p>;
  };

  // Real-time polling for new notifications (every 30 seconds)
  React.useEffect(() => {
    if (!isAuthenticated) return;

    // Fetch immediately on mount
    fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  // Also fetch when notification panel opens
  React.useEffect(() => {
    if (notificationOpen && isAuthenticated) {
      fetchNotifications();
    }
  }, [notificationOpen, isAuthenticated, fetchNotifications]);

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
      const res = await apiService._fetch(`${API}/api/whoAmI`, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNameInput(data.name || '');
        setAvatarPreview(data.imageUrl || null);
        setAvatarFile(null);
        const normalizedRole = normalizeUserRole(data?.role);
        if (normalizedRole && data?.email) {
          setUser({
            userId: data.userId || data.id,
            role: normalizedRole,
            email: data.email,
            name: data.name ?? null,
            imageUrl: data.imageUrl ?? null,
            canViewEvents: data.canViewEvents ?? true,
            canEditEvents: data.canEditEvents ?? true,
            canManualCheckIn: data.canManualCheckIn ?? true,
            canReceiveNotifications: data.canReceiveNotifications ?? true,
            isOnboarded: !!data.isOnboarded,
            employerId: data.employerId || null,
            employerLogoUrl: data.employerLogoUrl || null,
            employerName: data.employerName || null,
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
        const res = await apiService._fetch(`${API}/api/user/avatar`, {
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
        const res = await apiService._fetch(`${API}/api/user/name`, {
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
          userId: userId!,
          role,
          email,
          name: nextName,
          imageUrl: nextImageUrl,
          canViewEvents,
          canEditEvents,
          canManualCheckIn,
          employerId,
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
      if (hasResolvedSession) return;
      const portalPaths = ['/dashboard', '/events', '/attendees', '/checkin', '/settings', '/user-home', '/my-events', '/user-settings', '/organizer-settings', '/account-settings', '/subscription'];
      const isProtectedRoute = portalPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

      try {
        const res = await apiService._fetch(`${API}/api/whoAmI`, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) {
          clearUser();
          if (isProtectedRoute) navigate('/login', { replace: true });
          return;
        }
        const me = await res.json().catch(() => null);
        const normalizedRole = normalizeUserRole(me?.role);
        if (!normalizedRole || !me?.email) {
          clearUser();
          if (isProtectedRoute) navigate('/login', { replace: true });
          return;
        }
        setUser({
          userId: me.userId || me.id,
          role: normalizedRole,
          email: me.email,
          name: me.name ?? null,
          imageUrl: me.imageUrl ?? null,
          canViewEvents: me.canViewEvents,
          canEditEvents: me.canEditEvents,
          canManualCheckIn: me.canManualCheckIn,
          canReceiveNotifications: me.canReceiveNotifications,
          employerId: me.employerId || null,
          employerLogoUrl: me.employerLogoUrl || null,
          employerName: me.employerName || null,
        });
      } catch {
        clearUser();
        navigate('/login', { replace: true });
      }
    };

    syncSession();
  }, [clearUser, hasResolvedSession, location.pathname, navigate, setUser]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!role) return;
    const staffAllowed = ['/events', '/attendees', '/checkin', '/settings'];
    const adminAllowed = ['/dashboard', '/events', '/attendees', '/checkin', '/settings', '/admin/categories', '/admin/discovery', '/admin/announcements'];
    const userAllowed = ['/user-home', '/my-events', '/my-events/create', '/my-events/edit', '/user-settings', '/organizer-settings', '/account-settings', '/user/attendees', '/user/checkin', '/user/archive', '/user/reports', '/dashboard', '/organizer-support', '/subscription'];

    if (role === UserRole.ORGANIZER) {
      const isAllowed = userAllowed.some(path =>
        location.pathname === path || location.pathname.startsWith(path + '/')
      );
      if (!isAllowed) {
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
    canViewEvents !== undefined && canManualCheckIn !== undefined
  );
  const noStaffPerms = role === UserRole.STAFF && canViewEvents === false && canManualCheckIn === false;
  const menuItems = (
    !isAuthenticated || !role || !staffPermsLoaded
      ? []
      : role === UserRole.STAFF && canViewEvents === false && canManualCheckIn === false
        ? [
          { label: 'Attendees', path: '/attendees', icon: <ICONS.Users className="w-6 h-6" /> },
        ]
        : role === UserRole.STAFF
          ? [
            ...(canViewEvents !== false ? [{ label: 'Events', path: '/events', icon: <ICONS.Calendar className="w-6 h-6" /> }] : []),
            { label: 'Attendees', path: '/attendees', icon: <ICONS.Users className="w-6 h-6" /> },
            ...(canManualCheckIn !== false ? [{ label: 'Scan', path: '/checkin', icon: <ICONS.CheckCircle className="w-6 h-6" />, separator: true }] : []),
          ]
          : role === UserRole.ADMIN
            ? [
              { label: 'Dashboard', path: '/dashboard', icon: <ICONS.Layout className="w-6 h-6" /> },
              { label: 'Events Moderation', path: '/events', icon: <ICONS.Shield className="w-6 h-6" /> },
              { label: 'Smart Categories', path: '/admin/categories', icon: <ICONS.Zap className="w-6 h-6" /> },
              { label: 'Discovery Hub', path: '/admin/discovery', icon: <ICONS.MapPin className="w-6 h-6" /> },
              { label: 'Plans', path: '/settings?tab=plans', icon: <ICONS.Layout className="w-6 h-6" /> },
              { label: 'Team and Access', path: '/settings?tab=team', icon: <ICONS.Users className="w-6 h-6" /> },
              { label: 'Email Settings', path: '/settings?tab=email', icon: <ICONS.Mail className="w-6 h-6" /> },
              { label: 'Payment Settings', path: '/settings?tab=payments', icon: <ICONS.CreditCard className="w-6 h-6" /> },
              { label: 'Announcements', path: '/admin/announcements', icon: <ICONS.Megaphone className="w-6 h-6" /> },
              { label: 'Support', path: '/settings?tab=support', icon: <ICONS.MessageSquare className="w-6 h-6" /> },
              { label: 'Account Settings', path: '/settings?tab=profile', icon: <ICONS.Settings className="w-6 h-6" />, separator: true },
            ]
            : [
              { label: 'Dashboard', path: '/dashboard', icon: <ICONS.Layout className="w-6 h-6" /> },
              { label: 'Events', path: '/events', icon: <ICONS.Calendar className="w-6 h-6" /> },
              { label: 'Attendees', path: '/attendees', icon: <ICONS.Users className="w-6 h-6" /> },
              { label: 'Scan', path: '/checkin', icon: <ICONS.CheckCircle className="w-6 h-6" /> },
              { label: 'Charts', path: '/user/reports', icon: <ICONS.BarChart className="w-6 h-6" /> },
              { label: 'Archive', path: '/user/archive', icon: <ICONS.Archive className="w-6 h-6" />, separator: true },
              { label: 'Plans', path: '/settings?tab=plans', icon: <ICONS.Layout className="w-6 h-6" /> },
              { label: 'Team and Access', path: '/settings?tab=team', icon: <ICONS.Users className="w-6 h-6" /> },
              { label: 'Email Settings', path: '/settings?tab=email', icon: <ICONS.Mail className="w-6 h-6" /> },
              { label: 'Payment Settings', path: '/settings?tab=payments', icon: <ICONS.CreditCard className="w-6 h-6" /> },
              { label: 'Support', path: '/organizer-support', icon: <ICONS.MessageSquare className="w-6 h-6" /> },
              { label: 'Account Settings', path: '/settings?tab=profile', icon: <ICONS.Settings className="w-6 h-6" />, separator: true },
            ]
  );

  const checkIsActiveAdmin = (itemPath: string) => {
    if (itemPath.includes('?')) {
      const [base, query] = itemPath.split('?');
      if (location.pathname !== base) return false;
      const tab = new URLSearchParams(query).get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab');
      if (!currentTab && tab === 'team') return true;
      return currentTab === tab;
    }
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
  };






  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F2F2F2] font-sans selection:bg-[#38BDF2]/30">
      {/* Sidebar for desktop */}
      <aside
        className={`bg-[#F2F2F2] border-r border-[#D1D5DB] hidden md:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out ${desktopSidebarOpen ? 'w-52' : 'w-16'}`}
        style={{ overflow: desktopSidebarOpen ? 'hidden' : 'visible' }}
      >
        <div className={`flex items-center justify-center border-b border-[#D1D5DB] shrink-0 h-24`}>
          <Link to={role === UserRole.ADMIN ? "/dashboard" : (role === UserRole.STAFF ? "/events" : "/user-home")} className="flex items-center justify-center group transition-all duration-500 transform hover:scale-[1.02] active:scale-[0.98]">
            {employerLogoUrl ? (
              <img
                src={employerLogoUrl}
                alt={employerName || 'Logo'}
                className={desktopSidebarOpen ? "h-20 w-auto max-w-full object-contain px-4" : "h-12 w-12 object-contain rounded-lg border border-[#E5E7EB]"}
              />
            ) : desktopSidebarOpen ? (
              <Branding className="h-20 w-auto" />
            ) : (
              <img src="/lgo.webp" alt="Logo" className="h-10 w-10 object-contain" />
            )}
          </Link>
        </div>
        <nav className={`flex-1 pt-6 pb-6 ${desktopSidebarOpen ? 'px-0' : 'px-2'} flex flex-col gap-0.5 overflow-y-auto overflow-x-visible scrollbar-none scroll-smooth`}
          style={{ width: desktopSidebarOpen ? '100%' : '220px', paddingRight: desktopSidebarOpen ? '0' : '150px' }}>
          {menuItems.map((item: any, idx) => {
            const isActive = checkIsActiveAdmin(item.path);

            return (
              <React.Fragment key={item.path || idx}>
                {item.separator && (
                  <div className={`mx-5 my-3 h-[1px] bg-[#D1D5DB] shrink-0 ${!desktopSidebarOpen ? 'mx-2' : ''}`} />
                )}
                <Link
                  to={item.path}
                  className={`flex transition-all duration-200 group relative shrink-0 ${desktopSidebarOpen
                    ? 'flex-row items-center gap-3 px-3 py-2.5 mx-2 rounded-lg'
                    : 'flex-col items-center justify-center w-11 h-11 mx-auto rounded-xl'
                    } ${isActive
                      ? 'bg-[#38BDF2] text-white shadow-md shadow-[#38BDF2]/20'
                      : 'text-[#000000]/90 hover:bg-[#D1D5DB]/50 hover:text-[#000000]'
                    }`}
                  title={!desktopSidebarOpen ? item.label : undefined}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    {React.cloneElement(item.icon as React.ReactElement<any>, {
                      className: `transition-colors duration-200 ${desktopSidebarOpen ? 'w-[18px] h-[18px]' : 'w-5 h-5 group-hover:scale-105'} ${isActive ? 'stroke-[2.5px] text-white' : 'stroke-[1.8px] text-[#000000] group-hover:text-[#000000]'}`
                    })}
                    {item.premium && <CrownBadge />}
                  </div>

                  {desktopSidebarOpen ? (
                    <span className={`text-[13px] tracking-tight truncate ${isActive ? 'font-bold text-white' : 'font-semibold text-[#000000]'}`}>
                      {item.label}
                    </span>
                  ) : (
                    <div className="absolute left-full ml-5 px-3 py-1.5 bg-[#38BDF2] text-white text-[11px] font-bold rounded-md opacity-0 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-[999] whitespace-nowrap shadow-xl flex items-center">
                      <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-[4px] border-transparent border-r-[#38BDF2]" />
                      {item.label}
                    </div>
                  )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>
      </aside>

      <main
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${desktopSidebarOpen ? 'md:pl-52' : 'md:pl-16'}`}
      >
        <header className="h-24 !bg-[#F2F2F2] border-b border-[#D1D5DB] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-[500] w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setSidebarOpen(true);
                } else {
                  setDesktopSidebarOpen(!desktopSidebarOpen);
                }
              }}
              className="p-2.5 rounded-lg border border-[#D1D5DB] bg-[#F2F2F2] hover:bg-gray-100 transition-all group active:scale-95"
              aria-label="Toggle Sidebar"
            >
              <svg className={`w-5 h-5 transition-transform duration-500 ${!desktopSidebarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] uppercase font-black text-[#2E2E2F] tracking-[0.2em]">
                {isStaff ? 'Staff Panel' : role === UserRole.ADMIN ? 'Admin Center' : 'Organizer Portal'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 min-w-0">
            {(!(role === UserRole.STAFF && canReceiveNotifications === false)) && (
              <div className="relative group">
                <button
                  className="w-11 h-11 flex items-center justify-center rounded-xl border border-[#38BDF2]/20 bg-transparent hover:bg-[#38BDF2]/10 hover:border-[#38BDF2]/40 hover:scale-105 active:scale-95 transition-all shadow-sm relative"
                  onClick={() => setNotificationOpen(!notificationOpen)}
                >
                  <ICONS.Bell className="w-5 h-5 text-[#2E2E2F] group-hover:text-[#38BDF2] transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-[#F2F2F2] shadow-lg animate-in zoom-in duration-300">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {notificationOpen && (
                  <>
                    <div className="fixed inset-0 z-[100] bg-[#2E2E2F]/10 backdrop-blur-[2px]" onClick={() => setNotificationOpen(false)} />
                    <div className="fixed left-3 right-3 top-24 bottom-24 sm:left-auto sm:right-6 sm:bottom-6 w-auto sm:w-full sm:max-w-[420px] bg-[#F2F2F2] rounded-xl sm:rounded-xl border border-[#2E2E2F]/5 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.15)] z-[101] flex flex-col overflow-hidden animate-in slide-in-from-right-8 fade-in duration-500">
                      <div className="p-8 border-b border-[#2E2E2F]/5 flex items-start justify-between bg-[#F2F2F2]/80 backdrop-blur-xl sticky top-0 z-10">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-black tracking-tight text-[#2E2E2F]">Updates</h2>
                            {unreadCount > 0 && (
                              <span className="bg-red-500/10 text-red-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                {unreadCount} New
                              </span>
                            )}
                          </div>
                          <p className="text-[#2E2E2F] text-xs font-bold uppercase tracking-widest">Stay synchronized with your team</p>
                        </div>
                        <button onClick={() => setNotificationOpen(false)} className="w-10 h-10 rounded-xl bg-[#F2F2F2] flex items-center justify-center text-[#2E2E2F] hover:text-[#2E2E2F] hover:bg-[#2E2E2F]/5 transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
                        {notificationsLoading && notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                            <div className="w-12 h-12 border-4 border-[#38BDF2]/20 border-t-[#38BDF2] rounded-full animate-spin mb-4" />
                            <p className="text-[#2E2E2F] text-xs font-black uppercase tracking-widest">Syncing notifications...</p>
                          </div>
                        ) : notifications.length > 0 ? (
                          <div className="px-4 space-y-2">
                            <div className="px-4 py-2 flex justify-between items-center mb-4">
                              <span className="text-[10px] font-black text-[#2E2E2F] uppercase tracking-[0.2em]">RECENT ACTIVITY</span>
                              <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] font-black text-[#38BDF2] hover:text-[#2E2E2F] uppercase tracking-[0.2em] transition-colors"
                              >
                                Mark all read
                              </button>
                            </div>
                            {notifications.map((n) => (
                              <div
                                key={n.notificationId || Math.random()}
                                onClick={() => {
                                  setSelectedNotification(n);
                                  if (!n.isRead) handleMarkNotificationRead(n.notificationId);
                                }}
                                className={`p-5 rounded-xl transition-all group relative border cursor-pointer ${n.isRead
                                  ? 'bg-transparent border-transparent opacity-60'
                                  : 'bg-[#F2F2F2] border-[#2E2E2F]/5 hover:border-[#38BDF2]/30 shadow-sm'
                                  }`}
                              >
                                <div className="flex items-start gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.isRead ? 'bg-[#2E2E2F]/5 text-[#2E2E2F]' : 'bg-[#38BDF2]/10 text-[#38BDF2]'
                                    }`}>
                                    <ICONS.Bell className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="text-sm font-black text-[#2E2E2F] tracking-tight truncate">{n.title}</h4>
                                      <span className="text-[9px] text-[#2E2E2F] font-black uppercase tracking-widest whitespace-nowrap ml-2">
                                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Now'}
                                      </span>
                                    </div>
                                    <div className="text-xs text-[#2E2E2F] font-medium leading-relaxed mb-3">
                                      {renderMessageContent(n.message)}
                                    </div>
                                    {!n.isRead && (
                                      <button
                                        onClick={() => handleMarkNotificationRead(n.notificationId)}
                                        className="text-[10px] font-black text-[#38BDF2] uppercase tracking-widest hover:text-[#2E2E2F] transition-colors"
                                      >
                                        Mark as read
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                            <div className="w-24 h-24 bg-[#F2F2F2] rounded-xl flex items-center justify-center mb-8">
                              <ICONS.Bell className="w-10 h-10 text-[#2E2E2F]" />
                            </div>
                            <h3 className="text-xl font-black text-[#2E2E2F] tracking-tighter uppercase mb-2">Clean Slate</h3>
                            <p className="text-sm font-medium text-[#2E2E2F] max-w-[240px] leading-relaxed">
                              You're all caught up. We'll alert you when there's news.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <Modal
              isOpen={!!selectedNotification}
              onClose={() => setSelectedNotification(null)}
              title={selectedNotification?.title || 'Notification details'}
              subtitle={selectedNotification?.createdAt ? new Date(selectedNotification.createdAt).toLocaleString() : ''}
              size="md"
            >
              <div className="py-6 sm:py-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-[#38BDF2]/10 flex items-center justify-center text-[#38BDF2] shrink-0 border border-[#38BDF2]/20">
                    <ICONS.Bell className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#2E2E2F] uppercase tracking-widest">Status Update</p>
                  </div>
                </div>

                <div className="p-6 sm:p-8 rounded-2xl bg-[#F2F2F2] border border-[#2E2E2F]/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#38BDF2]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#38BDF2]/10 transition-all duration-700" />
                  <div className="text-sm sm:text-base text-[#2E2E2F] font-medium leading-relaxed relative z-10">
                    {renderMessageContent(selectedNotification?.message)}
                  </div>
                </div>

                <div className="mt-10 flex justify-end">
                  <Button
                    onClick={() => setSelectedNotification(null)}
                    className="px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest"
                  >
                    Got it, Close
                  </Button>
                </div>
              </div>
            </Modal>
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 transition-colors"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#38BDF2]/20 text-[#2E2E2F] flex items-center justify-center">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-semibold text-xs text-[#2E2E2F]">{initials}</span>
                  )}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-xs font-semibold text-[#2E2E2F] truncate max-w-[120px]">{displayName}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2E2E2F] mt-0.5">{roleLabel}</p>
                </div>
                <svg className="w-4 h-4 text-[#2E2E2F]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(46,46,47,0.1)] z-50 p-2 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="px-4 py-3 border-b border-[#2E2E2F]/5 mb-1">
                      <p className="text-[10px] font-medium text-[#2E2E2F] uppercase tracking-widest mb-0.5">Account</p>
                      <p className="text-xs font-semibold text-[#2E2E2F] truncate">{displayName}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2E2E2F] mt-1">{roleLabel}</p>
                    </div>
                    {role !== UserRole.STAFF && (
                      <>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                          onClick={() => {
                            navigate('/settings?tab=team');
                            setUserMenuOpen(false);
                          }}
                        >
                          <ICONS.Users className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                          <span>Teams & Access</span>
                        </button>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                          onClick={() => {
                            navigate('/settings?tab=plans');
                            setUserMenuOpen(false);
                          }}
                        >
                          <ICONS.Layout className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                          <span>Subscription Plans</span>
                        </button>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                          onClick={() => {
                            navigate('/settings?tab=email');
                            setUserMenuOpen(false);
                          }}
                        >
                          <ICONS.Mail className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                          <span>Email Setup</span>
                        </button>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                          onClick={() => {
                            navigate('/settings?tab=support');
                            setUserMenuOpen(false);
                          }}
                        >
                          <ICONS.MessageSquare className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                          <span>Support Tickets</span>
                        </button>
                      </>
                    )}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                      onClick={() => {
                        navigate('/settings?tab=profile');
                        setUserMenuOpen(false);
                      }}
                    >
                      <ICONS.Settings className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>Profile & Security</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-red-50 hover:text-red-500 transition-colors text-left group"
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
          <div className="fixed inset-0 z-[100] flex md:hidden">
            <div className="fixed inset-0 bg-[#2E2E2F]/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="relative w-[min(18.5rem,calc(100vw-1rem))] bg-[#F2F2F2] border-r border-[#E5E7EB] flex flex-col h-full z-[110] animate-in slide-in-from-left duration-300 shadow-2xl">
              <div className="p-8 pb-4 flex items-center justify-between border-b border-[#E5E7EB]">
                <Link to={role === UserRole.ADMIN ? "/dashboard" : (role === UserRole.STAFF ? "/events" : "/user-home")} onClick={() => setSidebarOpen(false)} className="flex flex-col items-start gap-2 group transition-all duration-500">
                  {employerLogoUrl ? (
                    <img
                      src={employerLogoUrl}
                      alt={employerName || 'Logo'}
                      className="h-12 w-auto max-w-[168px] object-contain"
                    />
                  ) : (
                    <Branding className="h-12 w-auto" />
                  )}
                  {employerName && (
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2E2E2F] ml-0.5">
                      {employerName}
                    </span>
                  )}
                </Link>
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#2E2E2F]/5 text-[#111827] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-none">
                {menuItems.map((item) => {
                  const isActive = checkIsActiveAdmin(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-4 px-5 py-3.5 mx-2 rounded-lg transition-all duration-200 group ${isActive
                        ? 'bg-[#38BDF2] text-white shadow-md shadow-[#38BDF2]/20'
                        : 'text-[#000000]/90 hover:bg-[#E5E7EB]/50 hover:text-[#000000]'
                        }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <div className={isActive ? 'text-white' : 'text-[#000000]/90 group-hover:text-[#000000]'}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { className: (desktopSidebarOpen ? 'w-5 h-5' : 'w-4 h-4') + ' ' + (isActive ? 'stroke-[2px]' : 'stroke-[1.5px]') })}
                      </div>
                      <span className={`text-sm tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                    </Link>
                  );
                })}

                <div className="mt-auto pt-8 border-t border-[#E5E7EB]">
                  <button
                    onClick={() => { handleLogout(); setSidebarOpen(false); }}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-[#111827]/80 hover:bg-red-50 hover:text-red-500 transition-all duration-300 group"
                  >
                    <svg className="w-5 h-5 opacity-60 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-medium text-sm tracking-tight">Logout</span>
                  </button>
                </div>
              </nav>
            </aside>
          </div>
        )}

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {(noStaffPerms && location.pathname !== '/attendees') ? (
              <div className="flex flex-col items-center justify-center min-h-[40vh]">
                <div className="text-2xl font-black text-[#2E2E2F] mb-4">No Access</div>
                <div className="text-[#2E2E2F] text-lg font-medium text-center">You do not have access to any features. Please contact your administrator.</div>
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
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#2E2E2F]/10 bg-[#F2F2F2] flex items-center justify-center">
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
  const { userId, role, email, name, imageUrl, isAuthenticated, clearUser, setUser, canReceiveNotifications, hasResolvedSession, authModal, openAuthModal, closeAuthModal } = useUser();
  const {
    publicMode,
    isAttendingView,
    setPublicMode,
  } = useEngagement();
  const { showToast } = useToast();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [headerSearchTerm, setHeaderSearchTerm] = React.useState('');
  const [animatedPlaceholder, setAnimatedPlaceholder] = React.useState('');
  const fullPlaceholder = 'Find your events';
  const [headerLocationTerm, setHeaderLocationTerm] = React.useState(DEFAULT_HEADER_LOCATION);
  const [headerLocationMenuOpen, setHeaderLocationMenuOpen] = React.useState(false);
  const [headerLocating, setHeaderLocating] = React.useState(false);
  const [headerLocationError, setHeaderLocationError] = React.useState('');
  const headerLocationMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [hasLiveEvents, setHasLiveEvents] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [newsletterEmail, setNewsletterEmail] = React.useState('');
  const [isSubscribing, setIsSubscribing] = React.useState(false);

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) {
      showToast('error', 'Please enter a valid email address.');
      return;
    }

    setIsSubscribing(true);
    try {
      const res = await fetch(`${API}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Thank you for subscribing!');
        setNewsletterEmail('');
      } else {
        showToast('error', data.message || 'Failed to subscribe.');
      }
    } catch (error) {
      showToast('error', 'Something went wrong. Please try again later.');
    } finally {
      setIsSubscribing(false);
    }
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    const isEmbeddableVideo = (url: string) => {
      if (!url || !url.trim()) return false;
      const n = url.startsWith('http') ? url : `https://${url}`;
      return /youtube\.com|youtu\.be/.test(n) || /facebook\.com|fb\.watch|fb\.com/.test(n) || /vimeo\.com/.test(n);
    };
    const checkLive = async () => {
      try {
        const live = await apiService.getLiveEvents();
        const now = new Date();
        const videoLive = (live || []).filter(e => {
          if (!isEmbeddableVideo(e.streaming_url || '')) return false;
          const start = new Date(e.startAt);
          const end = e.endAt ? new Date(e.endAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
          return now >= start && now <= end;
        });
        setHasLiveEvents(videoLive.length > 0);
      } catch (err) {
        console.error('Failed to check live status:', err);
      }
    };
    checkLive();
    const interval = setInterval(checkLive, 60000);
    return () => clearInterval(interval);
  }, []);
  const isOrganizer = isAuthenticated && role === UserRole.ORGANIZER;
  const publicMenuMode = isOrganizer ? publicMode : 'attending';
  const showHeaderSearchBar = !isAuthenticated || !isOrganizer || isAttendingView;

  // Typing animation for search placeholder
  React.useEffect(() => {
    const text = 'Find your events';
    let index = 0;
    let isDeleting = false;
    let timer: NodeJS.Timeout;

    const type = () => {
      if (isDeleting) {
        setAnimatedPlaceholder(text.substring(0, index - 1));
        index--;
        if (index === 0) {
          isDeleting = false;
          timer = setTimeout(type, 500);
        } else {
          timer = setTimeout(type, 50);
        }
      } else {
        setAnimatedPlaceholder(text.substring(0, index + 1));
        index++;
        if (index === text.length) {
          isDeleting = true;
          timer = setTimeout(type, 2000);
        } else {
          timer = setTimeout(type, 100);
        }
      }
    };

    type();
    return () => clearTimeout(timer);
  }, []);

  const displayName = email?.trim() || name?.trim() || 'User';
  const roleLabel = isOrganizer && isAttendingView ? 'Attending' : getRoleLabel(role);
  const publicUserMenuActionClass = 'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group';
  const landingLoginButtonClass = 'px-4 text-[11px] font-black uppercase tracking-widest !bg-transparent !text-[#2E2E2F] hover:!text-[#38BDF2] transition-colors';
  const landingGetStartedButtonClass = 'px-6 text-[11px] font-black uppercase tracking-widest border border-[#38BDF2] bg-[#38BDF2] text-white shadow-[0_0_16px_rgba(56,189,242,0.45)] hover:bg-[#2E2E2F] hover:border-[#2E2E2F] hover:text-white hover:shadow-[0_0_22px_rgba(56,189,242,0.5)] focus-visible:bg-[#2E2E2F] focus-visible:border-[#2E2E2F] focus-visible:shadow-[0_0_22px_rgba(56,189,242,0.5)] transition-all duration-300 ease-out active:scale-95';
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
      if (hasResolvedSession) return;
      try {
        const res = await fetch(`${API}/api/whoAmI`, { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const me = await res.json().catch(() => null);
          const normalizedRole = normalizeUserRole(me?.role);
          if (normalizedRole && me?.email) {
            setUser({
              userId: me.userId || me.id,
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
  }, [hasResolvedSession, setUser]);

  const [isSupportModalOpen, setIsSupportModalOpen] = React.useState(false);

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

    // If we're on browse-events or if user picks a specific location, trigger search
    const trimmedSearch = headerSearchTerm.trim();
    const hasExplicitLocation = value && value !== DEFAULT_HEADER_LOCATION && value !== ONLINE_LOCATION_VALUE;

    const params = new URLSearchParams();
    if (trimmedSearch) params.set('search', trimmedSearch);
    if (hasExplicitLocation) params.set('location', value);
    else if (value === ONLINE_LOCATION_VALUE) params.set('location', ONLINE_LOCATION_VALUE);

    const query = params.toString();
    navigate(`/browse-events${query ? `?${query}` : ''}`);
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

  // Session Inactivity Tracking (7 minutes limit)
  const lastActivityRef = React.useRef(Date.now());
  const INACTIVITY_LIMIT = 7 * 60 * 1000;

  React.useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(name => document.addEventListener(name, updateActivity));

    // Check for inactivity every minute 
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current > INACTIVITY_LIMIT) {
        console.warn('🕒 [SECURITY] Session expired due to inactivity (7 mins)');
        handleLogout();
      }
    }, 60000);

    return () => {
      events.forEach(name => document.removeEventListener(name, updateActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const navLinks: any[] = [];
  const guestMobileLinks = [
    { label: 'Home', path: '/', icon: <ICONS.Home className="w-4 h-4" />, isLive: false },
    { label: 'Contact Us', path: '/contact-us', icon: <ICONS.Mail className="w-4 h-4" />, isLive: false },
    { label: 'FAQ', path: '/faq', icon: <ICONS.MessageSquare className="w-4 h-4" />, isLive: false },
  ];
  const trimmedHeaderSearch = headerSearchTerm.trim();
  const trimmedHeaderLocation = headerLocationTerm.trim();
  const hasHeaderExplicitLocation = Boolean(
    trimmedHeaderLocation &&
    trimmedHeaderLocation.toLowerCase() !== DEFAULT_HEADER_LOCATION.toLowerCase()
  );
  const canSubmitHeaderSearch = Boolean(trimmedHeaderSearch || hasHeaderExplicitLocation);
  const mobileMenuPanelClass = showHeaderSearchBar
    ? 'top-[7.85rem] max-h-[calc(100vh-7.85rem)]'
    : 'top-[4.85rem] max-h-[calc(100vh-4.85rem)]';

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F2F2]" style={{ zoom: 0.9 }}>
      <header className={`sticky top-0 z-[1000] px-4 lg:px-10 h-20 bg-[#F2F2F2]/90 backdrop-blur-xl transition-all duration-500 ${scrolled
        ? 'shadow-[0_10px_30px_-10px_rgba(46,46,47,0.15)] border-b border-[#2E2E2F]/10'
        : 'shadow-none border-b border-transparent'
        }`} style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="max-w-full w-full h-full flex flex-wrap lg:flex-nowrap items-center gap-2 lg:gap-4">
          {/* Left: Branding Segment - Logo on mobile, hidden on lg */}
          <div className="flex lg:hidden flex-none items-center">
            <Link to="/" className="shrink-0 flex items-center gap-2">
              <Branding className="h-20 w-auto" />
            </Link>
          </div>
          <div className="hidden lg:flex flex-none items-center">
            <Link to="/" className="shrink-0 flex items-center gap-3">
              {/* Desktop logo - shown only on desktop */}
              <span className="hidden lg:block">
                <Branding className="h-20 w-auto" />
              </span>
            </Link>
          </div>

          {/* Center Segment: Search bar centered */}
          <div className="hidden lg:flex flex-1 min-w-0 px-1 sm:px-4">
            {showHeaderSearchBar && (
              <form onSubmit={handleHeaderSearchSubmit} className="w-full">
                <div className="flex items-center h-12 rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] overflow-hidden shadow-[0_10px_30px_-15px_rgba(46,46,47,0.1)] focus-within:border-[#38BDF2]/50 focus-within:shadow-[0_15px_35px_-12px_rgba(56,189,242,0.15)] transition-all duration-300">
                  <label className="flex items-center gap-3 px-5 py-3 min-w-0 flex-1 border-r border-[#2E2E2F]/5 hover:bg-[#38BDF2]/5 transition-colors">
                    <ICONS.Search className="w-4 h-4 text-[#2E2E2F] shrink-0" />
                    <input
                      type="text"
                      value={headerSearchTerm}
                      onChange={(event) => setHeaderSearchTerm(event.target.value)}
                      placeholder={animatedPlaceholder || 'Find your events'}
                      className="w-full bg-transparent text-[12px] font-bold text-[#2E2E2F] placeholder:text-[#2E2E2F] outline-none"
                    />
                  </label>
                  <div
                    className="relative min-w-0 flex-1 border-r border-[#2E2E2F]/5 bg-[#F2F2F2] hover:bg-[#38BDF2]/5 transition-colors"
                    ref={headerLocationMenuRef}
                  >
                    <div className="w-full h-full flex items-center">
                      <div className="flex-1 min-w-0 flex items-center gap-3 px-5 py-3 cursor-text" onClick={() => setHeaderLocationMenuOpen(true)}>
                        <ICONS.MapPin className="w-4 h-4 text-[#2E2E2F] shrink-0" />
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
                          className="w-full bg-transparent text-[12px] font-bold text-[#2E2E2F] placeholder:text-[#2E2E2F] outline-none"
                          aria-label="Search location"
                        />
                      </div>
                      <button
                        type="button"
                        className={`w-11 h-11 flex items-center justify-center transition-all ${headerLocating
                          ? 'text-[#38BDF2] animate-pulse'
                          : 'text-[#2E2E2F] hover:text-[#38BDF2] hover:bg-[#38BDF2]/8'
                          } rounded-xl mr-1 group/gps`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseCurrentLocationInHeader();
                        }}
                        disabled={headerLocating}
                        title="Search near me"
                      >
                        {headerLocating ? (
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full inline-block animate-spin" />
                        ) : (
                          <div className="relative">
                            <svg fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" className="w-5 h-5 group-hover/gps:scale-110 transition-transform">
                              <circle cx="12" cy="12" r="3" />
                              <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                            </svg>
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#38BDF2] rounded-full opacity-0 group-hover/gps:opacity-100 transition-opacity animate-ping" />
                          </div>
                        )}
                      </button>
                    </div>

                    {headerLocationMenuOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-50 w-[320px] rounded-xl border border-[#2E2E2F]/10 bg-white shadow-[0_24px_48px_-20px_rgba(46,46,47,0.35)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <button
                          type="button"
                          className="w-full px-5 py-4 flex items-center gap-4 text-left text-[#2E2E2F] hover:bg-[#38BDF2]/5 transition-colors border-b border-[#2E2E2F]/5 disabled:opacity-60 group/btn"
                          onClick={(e) => {
                            e.preventDefault();
                            handleUseCurrentLocationInHeader();
                          }}
                          disabled={headerLocating}
                        >
                          <div className={`w-10 h-10 rounded-full border border-[#38BDF2]/30 flex items-center justify-center text-[#38BDF2] group-hover/btn:bg-[#38BDF2] group-hover/btn:text-[#F2F2F2] transition-all shadow-sm ${headerLocating ? 'animate-pulse' : ''}`}>
                            {headerLocating ? (
                              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full inline-block animate-spin" />
                            ) : (
                              <svg fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" className="w-5 h-5">
                                <circle cx="12" cy="12" r="3" />
                                <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                              </svg>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-[#2E2E2F]">Detect My Location</span>
                            <span className="text-[10px] text-[#2E2E2F] font-bold uppercase tracking-wider">Fast GPS Search</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          className="w-full px-5 py-4 flex items-center gap-4 text-left text-[#2E2E2F] hover:bg-[#38BDF2]/5 transition-colors group/online border-b border-[#2E2E2F]/5"
                          onClick={() => handleSelectHeaderLocation(ONLINE_LOCATION_VALUE)}
                        >
                          <div className="w-10 h-10 rounded-xl border border-[#38BDF2]/30 flex items-center justify-center text-[#38BDF2] group-hover/online:bg-[#38BDF2] group-hover/online:text-[#F2F2F2] transition-all shadow-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9l5 3-5 3V9z" />
                            </svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-[#2E2E2F]">Online Events</span>
                            <span className="text-[10px] text-[#2E2E2F] font-bold uppercase tracking-wider">Virtual Experiences</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          className="w-full px-5 py-3 flex items-center gap-4 text-left text-[#2E2E2F] hover:bg-red-50 hover:text-red-500 transition-colors group/reset"
                          onClick={() => handleSelectHeaderLocation(DEFAULT_HEADER_LOCATION)}
                        >
                          <div className="w-10 h-10 rounded-full border border-current opacity-20 flex items-center justify-center transition-opacity group-hover/reset:opacity-100">
                            <ICONS.Trash className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-widest">Clear Location</span>
                            <span className="text-[9px] font-bold opacity-70">Reset to all areas</span>
                          </div>
                        </button>

                        {headerLocationError && (
                          <div className="px-5 py-3 text-[11px] font-bold text-red-500 bg-red-50 border-t border-red-100 flex items-center gap-2">
                            <ICONS.AlertTriangle className="w-3.5 h-3.5" />
                            {headerLocationError}
                          </div>
                        )}

                        <div className="px-5 py-4 bg-[#F8F9FA] border-t border-[#2E2E2F]/5">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#2E2E2F] italic leading-relaxed">Tip: Type any city name in the input field above for custom filtering.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-12 h-11 flex items-center justify-center transition-colors text-[#2E2E2F] hover:bg-[#38BDF2]/12 hover:text-[#38BDF2]"
                    aria-label="Find events"
                  >
                    <ICONS.Search className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Segment: Nav Links and Auth Actions */}
          <div className="flex items-center justify-end gap-4 lg:gap-6 ml-auto flex-none">
            {/* Nav Links */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link: any) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-[11px] font-black uppercase tracking-[0.15em] text-[#2E2E2F] hover:text-[#38BDF2] transition-colors relative group whitespace-nowrap"
                >
                  {link.label}
                  {link.isLive && (
                    <span className="relative flex h-2 w-2 ml-1 inline-block -top-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#38BDF2] transition-all group-hover:w-full" />
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button - Shown only on mobile */}
            <button
              className="lg:hidden p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl text-[#2E2E2F] hover:bg-[#38BDF2]/10 active:bg-[#38BDF2]/20 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <div className="flex items-center gap-1 shrink-0">
              {isAuthenticated ? (
                <>
                  <Link to="/live" className="hidden lg:flex items-center gap-2 px-6 py-2.5 bg-[#38BDF2] border border-[#38BDF2] text-white hover:bg-[#2E2E2F] hover:border-[#2E2E2F] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-[#38BDF2]/20">
                    Watch Live
                    {hasLiveEvents && (
                      <span className="relative flex h-2 w-2 ml-0.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                      </span>
                    )}
                  </Link>

                  <div className="relative">
                    <button
                      className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 transition-colors"
                      onClick={() => setUserMenuOpen((v) => !v)}
                    >
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#38BDF2]/20 text-[#2E2E2F] flex items-center justify-center">
                        {imageUrl ? (
                          <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-semibold text-xs text-[#2E2E2F]">{initials}</span>
                        )}
                      </div>
                      <div className="hidden sm:block text-left leading-tight min-w-0">
                        <p className="text-xs font-semibold text-[#2E2E2F] whitespace-nowrap">{displayName}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2E2E2F] mt-0.5">{roleLabel}</p>
                      </div>
                      <svg className="w-4 h-4 text-[#2E2E2F]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                        <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-xl shadow-xl z-50 p-2 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                          <div className="px-4 py-3 border-b border-[#2E2E2F]/5 mb-1">
                            <p className="text-[10px] font-medium text-[#2E2E2F] uppercase tracking-widest mb-0.5">Account</p>
                            <p className="text-xs font-semibold text-[#2E2E2F]">{displayName}</p>
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2E2E2F] mt-1">{roleLabel}</p>
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
                                    navigate('/user-settings?tab=payments');
                                  }}
                                >
                                  <ICONS.CreditCard className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                                  <span>Payment Gateway</span>
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
                              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-red-50 hover:text-red-500 transition-colors text-left group"
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
                </>
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal('login')}
                    className={`hidden lg:flex ${landingLoginButtonClass}`}
                  >
                    Login
                  </button>
                  <Link to="/live" className="hidden lg:flex items-center gap-2 px-6 py-2.5 bg-[#38BDF2] border border-[#38BDF2] text-white hover:bg-[#2E2E2F] hover:border-[#2E2E2F] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-[#38BDF2]/20">
                    Watch Live
                    {hasLiveEvents && (
                      <span className="relative flex h-2 w-2 ml-0.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                      </span>
                    )}
                  </Link>
                </>
              )}
            </div>
          </div>

          {showHeaderSearchBar && (
            <div className="w-full lg:hidden">
              <form onSubmit={handleHeaderSearchSubmit} className="space-y-2">
                <div className="flex items-center min-h-[48px] rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] overflow-hidden shadow-[0_10px_30px_-15px_rgba(46,46,47,0.12)] focus-within:border-[#38BDF2]/50 transition-all">
                  <label className="flex items-center gap-3 px-4 min-w-0 flex-1">
                    <ICONS.Search className="w-5 h-5 text-[#2E2E2F] shrink-0" />
                    <input
                      type="text"
                      value={headerSearchTerm}
                      onChange={(event) => setHeaderSearchTerm(event.target.value)}
                      placeholder={animatedPlaceholder || 'Find your events'}
                      className="w-full bg-transparent text-[14px] font-bold text-[#2E2E2F] placeholder:text-[#2E2E2F] outline-none"
                    />
                  </label>
                  <button
                    type="submit"
                    className="w-14 min-h-[48px] flex items-center justify-center text-[#2E2E2F] hover:bg-[#38BDF2]/12 hover:text-[#38BDF2] active:bg-[#38BDF2]/20 transition-colors"
                    aria-label="Find events"
                  >
                    <ICONS.Search className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative">
                  <div className="flex items-center min-h-[48px] rounded-xl border border-[#2E2E2F]/10 bg-[#F2F2F2] overflow-hidden shadow-[0_10px_30px_-15px_rgba(46,46,47,0.12)]">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 text-left text-[14px] font-bold text-[#2E2E2F] hover:bg-[#38BDF2]/5 active:bg-[#38BDF2]/10 transition-colors min-h-[48px]"
                      onClick={() => {
                        setHeaderLocationMenuOpen((prev) => !prev);
                        setHeaderLocationError('');
                      }}
                    >
                      <ICONS.MapPin className="w-5 h-5 shrink-0 text-[#2E2E2F]" />
                      <span className={`truncate ${hasHeaderExplicitLocation ? 'text-[#2E2E2F]' : 'text-[#2E2E2F]'}`}>
                        {hasHeaderExplicitLocation ? headerLocationTerm : DEFAULT_HEADER_LOCATION}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`mr-1 flex min-h-[48px] min-w-[48px] p-2 items-center justify-center rounded-xl transition-all ${headerLocating
                        ? 'text-[#38BDF2] animate-pulse'
                        : 'text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] active:bg-[#38BDF2]/20'
                        }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleUseCurrentLocationInHeader();
                      }}
                      disabled={headerLocating}
                      title="Search near me"
                    >
                      {headerLocating ? (
                        <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : (
                        <svg fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" className="h-5 w-5">
                          <circle cx="12" cy="12" r="3" />
                          <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {headerLocationMenuOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-xl border border-[#2E2E2F]/10 bg-white shadow-[0_24px_48px_-20px_rgba(46,46,47,0.35)] animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        type="button"
                        className="flex w-full items-center gap-4 border-b border-[#2E2E2F]/5 px-5 py-4 text-left text-[#2E2E2F] transition-colors hover:bg-[#38BDF2]/5 active:bg-[#38BDF2]/10 disabled:opacity-60 min-h-[56px]"
                        onClick={(event) => {
                          event.preventDefault();
                          handleUseCurrentLocationInHeader();
                        }}
                        disabled={headerLocating}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border border-[#38BDF2]/30 text-[#38BDF2] ${headerLocating ? 'animate-pulse' : ''}`}>
                          {headerLocating ? (
                            <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          ) : (
                            <svg fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" className="h-5 w-5">
                              <circle cx="12" cy="12" r="3" />
                              <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                            </svg>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-[#2E2E2F]">Detect My Location</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E2E2F]">Fast GPS Search</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="flex w-full items-center gap-4 border-b border-[#2E2E2F]/5 px-5 py-4 text-left text-[#2E2E2F] transition-colors hover:bg-[#38BDF2]/5"
                        onClick={() => handleSelectHeaderLocation(ONLINE_LOCATION_VALUE)}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#38BDF2]/30 text-[#38BDF2]">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9l5 3-5 3V9z" />
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-[#2E2E2F]">Online Events</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E2E2F]">Virtual Experiences</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="flex w-full items-center gap-4 px-5 py-3 text-left text-[#2E2E2F] transition-colors hover:bg-red-50 hover:text-red-500"
                        onClick={() => handleSelectHeaderLocation(DEFAULT_HEADER_LOCATION)}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-current opacity-20">
                          <ICONS.Trash className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black uppercase tracking-widest">Clear Location</span>
                          <span className="text-[9px] font-bold opacity-70">Reset to all areas</span>
                        </div>
                      </button>

                      {headerLocationError && (
                        <div className="flex items-center gap-2 border-t border-red-100 bg-red-50 px-5 py-3 text-[11px] font-bold text-red-500">
                          <ICONS.AlertTriangle className="w-3.5 h-3.5" />
                          {headerLocationError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </header>
      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/30 z-[95]" onClick={() => setMobileMenuOpen(false)} />
          <div className={`lg:hidden fixed right-0 z-[100] w-[min(21rem,calc(100vw-0.75rem))] overflow-y-auto rounded-l-[1.75rem] border border-[#2E2E2F]/10 bg-[#F2F2F2] shadow-[0_24px_60px_-22px_rgba(46,46,47,0.35)] animate-in slide-in-from-right-3 duration-200 ${mobileMenuPanelClass}`} style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            {!isAuthenticated && (
              <div className="border-b border-[#2E2E2F]/8 px-3 pt-3 pb-2">
                <p className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]">Explore StartupLab</p>
                <nav className="mt-2 flex flex-col gap-1">
                  {guestMobileLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="flex items-center gap-3 rounded-xl px-4 py-4 text-sm font-semibold text-[#2E2E2F] transition-colors hover:bg-white hover:text-[#38BDF2] active:bg-[#38BDF2]/10"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="shrink-0 opacity-70">{link.icon}</span>
                      <span>{link.label}</span>
                      {link.isLive && hasLiveEvents && (
                        <span className="relative ml-auto flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600"></span>
                        </span>
                      )}
                    </Link>
                  ))}
                </nav>
              </div>
            )}

            {/* Mobile Auth Buttons Dropdown */}
            <div className="flex flex-col gap-0 py-0 px-0 bg-transparent overflow-hidden">
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => { setMobileMenuOpen(false); openAuthModal('signup'); }}
                    className="flex items-center gap-3 px-4 py-3 text-[#38BDF2] hover:bg-white transition-colors text-xs font-semibold w-full [&>span:first-child]:hidden text-left"
                  >
                    <span>▶</span>
                    <span>Get Started</span>
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); openAuthModal('login'); }}
                    className="flex items-center gap-3 px-4 py-3 text-[#2E2E2F] hover:bg-white transition-colors text-xs font-semibold w-full border-t border-[#2E2E2F]/5 text-left"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Login</span>
                  </button>

                </>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-[#2E2E2F]/5">
                    <p className="text-[9px] font-medium text-[#2E2E2F] uppercase tracking-wider mb-0.5">Account</p>
                    <p className="text-xs font-semibold text-[#2E2E2F] truncate">{displayName}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#2E2E2F] mt-1">Attending</p>
                  </div>

                  <Link
                    to="/browse-events"
                    className="flex items-center gap-3 px-4 py-3 text-[#2E2E2F] hover:bg-white hover:text-[#2E2E2F] transition-colors text-left group text-xs font-semibold w-full border-t border-[#2E2E2F]/5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ICONS.Calendar className="w-4 h-4 opacity-70 group-hover:opacity-100 shrink-0" />
                    <span>Browse Events</span>
                  </Link>
                  <Link
                    to="/my-tickets"
                    className="flex items-center gap-3 px-4 py-3 text-[#2E2E2F] hover:bg-white hover:text-[#2E2E2F] transition-colors text-left group text-xs font-semibold w-full border-t border-[#2E2E2F]/5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ICONS.Ticket className="w-4 h-4 opacity-70 group-hover:opacity-100 shrink-0" />
                    <span>My Tickets</span>
                  </Link>

                  {isOrganizer && (
                    <Link
                      to="/user-settings?tab=events"
                      className="flex items-center gap-3 px-4 py-3 text-[#2E2E2F] hover:bg-white hover:text-[#2E2E2F] transition-colors text-left group text-xs font-semibold w-full border-t border-[#2E2E2F]/5"
                      onClick={() => {
                        setPublicMode('organizer');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <ICONS.Zap className="w-4 h-4 opacity-70 group-hover:opacity-100 shrink-0" />
                      <span>Organize Events</span>
                    </Link>
                  )}

                  <Link
                    to="/liked"
                    className="flex items-center gap-3 px-4 py-3 text-[#2E2E2F] hover:bg-white hover:text-[#2E2E2F] transition-colors text-left group text-xs font-semibold w-full border-t border-[#2E2E2F]/5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ICONS.Heart className="w-4 h-4 opacity-70 group-hover:opacity-100 shrink-0" />
                    <span>Liked</span>
                  </Link>

                  <Link
                    to="/followings"
                    className="flex items-center gap-3 px-4 py-3 text-[#2E2E2F] hover:bg-white hover:text-[#2E2E2F] transition-colors text-left group text-xs font-semibold w-full border-t border-[#2E2E2F]/5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ICONS.Users className="w-4 h-4 opacity-70 group-hover:opacity-100 shrink-0" />
                    <span>Followings</span>
                  </Link>

                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-[#2E2E2F] hover:bg-red-50 hover:text-red-500 transition-colors text-left group text-xs font-semibold border-t border-[#2E2E2F]/5"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
      <main className="flex-1">{children}</main>
      <footer className="bg-[#0F172A] text-white py-12 px-4 lg:px-10 border-t border-white/10 relative overflow-hidden" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#38BDF2]/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        
        {/* Logo Watermark */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
          <img src="/lgo-footer.png" className="w-[800px] h-auto object-contain" alt="" />
        </div>

        <div className="max-w-full mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1px_1.8fr] gap-6 lg:gap-10">
            {/* Left Section: Branding & Newsletter */}
            <div className="flex flex-col items-start text-left">
              <img src="/lgo-footer.png" className="h-20 w-auto mb-1" alt="StartupLab" />
              <h3 className="mt-3 text-lg font-black text-white">Build. Connect. Launch.</h3>
              <p className="mt-2 text-xs font-medium max-w-sm text-gray-400 leading-relaxed">
                Your gateway to StartupLab events — from internal workshops to public showcases,
                this platform delivers seamless registration for every gathering.
              </p>

              {/* Social Links */}
              <div className="mt-4 flex items-center gap-2">
                <a href="https://www.facebook.com/StartupLabAI/" target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-full bg-[#1877F2] text-white hover:brightness-110 transition-all">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </a>
                <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition-all">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a href="https://discord.com/invite/abt3dkaYTr" target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-full bg-[#5865F2] text-white hover:brightness-110 transition-all">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
                </a>
                <a href="https://www.linkedin.com/in/startup-lab-center-36a15734b/" target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-full bg-[#0A66C2] text-white hover:brightness-110 transition-all">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
              </div>

              {/* Newsletter */}
              <div className="mt-6 max-w-[320px] w-full">
                <form className="flex focus-within:ring-2 focus-within:ring-[#38BDF2]/30 rounded-xl overflow-hidden transition-all shadow-sm" onSubmit={handleNewsletterSubscribe}>
                  <input
                    type="email"
                    placeholder="Email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    disabled={isSubscribing}
                    className="flex-1 px-3 py-2.5 bg-white/5 text-white placeholder:text-gray-500 outline-none text-xs font-medium border-r border-white/10 disabled:opacity-50"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={isSubscribing}
                    className="bg-[#38BDF2] text-white px-5 py-2.5 text-xs font-black transition-colors hover:bg-[#38BDF2]/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubscribing ? (
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : null}
                    {isSubscribing ? '...' : 'Subscribe'}
                  </button>
                </form>
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="hidden lg:block bg-white/10 w-[1px] h-full" />

            {/* Right Section: Multi-column Links */}
            <div className="flex flex-col">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {/* Column 1: Platform */}
                <div>
                  <h4 className="font-black text-white text-[14px] mb-3">Platform</h4>
                  <nav className="flex flex-col gap-2.5">
                    <Link to="/" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">Home</Link>
                    <Link to="/live" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">Live</Link>
                    <Link to="/browse-events" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">Events</Link>
                    <Link to="/organizers/discover" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">Explore</Link>
                    <button onClick={() => openAuthModal && openAuthModal('login')} className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors text-left">Login</button>
                  </nav>
                </div>

                {/* Column 2: Company */}
                <div>
                  <h4 className="font-black text-white text-[14px] mb-3">Company</h4>
                  <nav className="flex flex-col gap-2.5">
                    <Link to="/about-us" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">About</Link>
                    <Link to="/pricing" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">Pricing</Link>
                    <a href="mailto:hello@startuplab.ph" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">Partner</a>
                  </nav>
                </div>

                {/* Column 3: Support */}
                <div>
                  <h4 className="font-black text-white text-[14px] mb-3">Support</h4>
                  <nav className="flex flex-col gap-2.5">
                    <Link to="/contact-us" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">Contact</Link>
                    <Link to="/faq" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">Faq</Link>
                    <button
                      onClick={() => setIsSupportModalOpen(true)}
                      className="text-[#38BDF2] hover:text-white font-bold text-[14px] mt-1 flex items-center gap-1.5"
                    >
                      <ICONS.AlertTriangle className="w-3.5 h-3.5" />
                      Support
                    </button>
                  </nav>
                </div>

                {/* Column 4: Legal */}
                <div>
                  <h4 className="font-black text-white text-[14px] mb-3">Legal</h4>
                  <nav className="flex flex-col gap-2.5">
                    <Link to="/privacy-policy" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">Privacy</Link>
                    <Link to="/terms-of-service" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">Terms</Link>
                    <Link to="/refund-policy" className="text-gray-400 hover:text-[#38BDF2] font-semibold text-[14px] transition-colors">Refund</Link>
                  </nav>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-4 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="text-[10px] font-bold text-gray-400">
              © 2026 <span className="font-black text-white">StartupLab</span> Business Center
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">Secure Payments by</span>
              <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/images/hitpay.png" alt="HitPay" className="h-3.5 w-auto grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>

      <FloatingSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        userEmail={email || ''}
      />
    </div>
  );
};

// â”€â”€â”€ USER PORTAL LAYOUT (icon sidebar only, no header bar) â”€â”€â”€
// ─── USER DASHBOARD WRAPPER ───
const DashboardWrapper: React.FC = () => {
  const { role } = useUser();
  if (role === UserRole.ADMIN) return <PortalLayout><AdminDashboard /></PortalLayout>;
  // For organizers and all others allowed on /dashboard, show the UserHome dashboard
  return <UserPortalLayout><OrganizerDashboard /></UserPortalLayout>;
};

// ─── USER PORTAL LAYOUT (Synced with Admin PortalLayout) ───
const UserPortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, role, email, name, imageUrl, isAuthenticated, clearUser, setUser, canViewEvents, canEditEvents, canManualCheckIn, canReceiveNotifications, hasResolvedSession, employerLogoUrl, employerName } = useUser();
  const { isAttendingView, setPublicMode } = useEngagement();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Use localStorage to persist the desktop sidebar toggle status
  const [desktopSidebarOpen, setDesktopSidebarOpen] = React.useState(() => {
    const saved = localStorage.getItem('desktopSidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Sync state to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('desktopSidebarOpen', JSON.stringify(desktopSidebarOpen));
  }, [desktopSidebarOpen]);
  const [settingsOpen, setSettingsOpen] = React.useState(location.pathname === '/user-settings');
  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  const [selectedNotification, setSelectedNotification] = React.useState<any | null>(null);


  // Fetch notifications for the notification bell
  const fetchNotifications = React.useCallback(async () => {
    const isAuthenticated = Boolean(email);
    if (!isAuthenticated) return;
    // Only fetch for staff if they have permission
    if (role === UserRole.STAFF && canReceiveNotifications === false) return;

    try {
      setNotificationsLoading(true);
      const data = await apiService.getMyNotifications(25);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      if (err?.message?.includes('401')) {
        clearUser();
        navigate('/login', { replace: true });
      }
    } finally {
      setNotificationsLoading(false);
    }
  }, [email, role, canReceiveNotifications, clearUser, navigate]);

  // Mark a single notification as read
  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationRead(notificationId);
      setNotifications(prev => prev.map(n =>
        n.notificationId === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Real-time polling for new notifications (every 30 seconds)
  React.useEffect(() => {
    const isAuthenticated = Boolean(email);
    if (!isAuthenticated) return;

    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [email, fetchNotifications]);

  // Also fetch when notification panel opens
  React.useEffect(() => {
    const isAuthenticated = Boolean(email);
    if (notificationOpen && isAuthenticated) {
      fetchNotifications();
    }
  }, [notificationOpen, email, fetchNotifications]);

  React.useEffect(() => {
    if (location.pathname === '/user-settings') setSettingsOpen(true);
  }, [location.pathname]);
  const displayName = email?.trim() || name?.trim() || 'User';
  const roleLabel = getRoleLabel(role);
  const initials = (email?.split('@')[0] || name?.trim() || displayName || 'U').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const organizerProfilePath = '/user-settings?tab=organizer';

  React.useEffect(() => {
    const syncSession = async () => {
      const isUserPortalRoute = [
        '/user-home', '/my-events', '/my-events/create', '/my-events/edit', '/user-settings', '/organizer-settings',
        '/account-settings', '/user/attendees', '/user/checkin', '/user/archive',
        '/user/reports', '/dashboard', '/subscription'
      ].includes(location.pathname);
      if (!isUserPortalRoute || hasResolvedSession) return;

      try {
        const res = await apiService._fetch(`${API}/api/whoAmI`, { credentials: 'include', cache: 'no-store' });
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
          userId: me.userId || me.id,
          role: normalizedRole,
          email: me.email,
          name: me.name ?? null,
          imageUrl: me.imageUrl ?? null,
          canViewEvents: me.canViewEvents ?? true,
          canEditEvents: me.canEditEvents ?? true,
          canManualCheckIn: me.canManualCheckIn ?? true,
          canReceiveNotifications: me.canReceiveNotifications ?? true,
          isOnboarded: !!me.isOnboarded,
          employerId: me.employerId || null,
          employerLogoUrl: me.employerLogoUrl || null,
          employerName: me.employerName || null,
        });
      } catch {
        // fail silent? or clear?
      }
    };
    syncSession();
  }, [clearUser, hasResolvedSession, location.pathname, navigate, setUser]);

  // Priority support flag for use in help/contact widgets
  const [hasPrioritySupport, setHasPrioritySupport] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchPrioritySupport = async () => {
      if (role !== UserRole.ORGANIZER && role !== UserRole.STAFF) return;
      try {
        const organizer = await apiService.getMyOrganizer();
        if (isMounted) setHasPrioritySupport(!!(organizer?.plan?.features?.priority_support));
      } catch { }
    };
    fetchPrioritySupport();
    return () => { isMounted = false; };
  }, [role, isAuthenticated]);

  // No longer needed as handled by RequireRoleRoute
  /*
  React.useEffect(() => {
    const checkOnboarding = async () => { ... }
    checkOnboarding();
  }, [role, location.pathname, navigate]);
  */

  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await apiService._fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
      await supabase.auth.signOut();
      clearUser();
      showToast('success', 'Logged out successfully. See you soon!');
      navigate('/');
    } catch {
      clearUser();
      navigate('/');
    }
  };

  const [expandedSections, setExpandedSections] = React.useState<string[]>(['Main', 'Events Records', 'Communication', 'Settings']);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const menuItems = (
    !isAuthenticated || !role
      ? []
      : role === UserRole.STAFF && canViewEvents === false && canManualCheckIn === false
        ? [
          { label: 'Attendees', path: '/user/attendees', icon: <ICONS.Users className="w-6 h-6" /> },
        ]
        : role === UserRole.STAFF
          ? [
            ...(canViewEvents !== false ? [{ label: 'Events', path: '/my-events', icon: <ICONS.Calendar className="w-6 h-6" /> }] : []),
            { label: 'Attendees', path: '/user/attendees', icon: <ICONS.Users className="w-6 h-6" /> },
            ...(canManualCheckIn !== false ? [{ label: 'Scan', path: '/user/checkin', icon: <ICONS.CheckCircle className="w-6 h-6" /> }] : []),
          ]
          : [
            { label: 'Home', path: '/user-home', icon: <ICONS.Home className="w-6 h-6" /> },
            { label: 'Dashboard', path: '/dashboard', icon: <ICONS.Layout className="w-6 h-6" /> },
            { label: 'Events Management', path: '/my-events', icon: <ICONS.Calendar className="w-6 h-6" /> },
            { label: 'Attendees', path: '/user/attendees', icon: <ICONS.Users className="w-6 h-6" /> },
            { label: 'Check In', path: '/user/checkin', icon: <ICONS.CheckCircle className="w-6 h-6" /> },
            { label: 'Reports', path: '/user/reports', icon: <ICONS.BarChart className="w-6 h-6" /> },
            { label: 'Archive', path: '/user/archive', icon: <ICONS.Archive className="w-6 h-6" /> },
            { label: 'Plans', path: '/subscription', icon: <ICONS.Layout className="w-6 h-6" /> },
            { label: 'Organization Profile', path: organizerProfilePath, icon: <ICONS.Users className="w-6 h-6" /> },
            { label: 'Team and Access', path: '/user-settings?tab=team', icon: <ICONS.Users className="w-6 h-6" /> },
            { label: 'Email Settings', path: '/user-settings?tab=email', icon: <ICONS.Mail className="w-6 h-6" /> },
            { label: 'Payment Settings', path: '/user-settings?tab=payments', icon: <ICONS.CreditCard className="w-6 h-6" /> },
            { label: 'Support', path: '/organizer-support', icon: <ICONS.MessageSquare className="w-6 h-6" /> },
            { label: 'Account Settings', path: '/user-settings?tab=account', icon: <ICONS.Settings className="w-6 h-6" /> },
          ]
  );

  const checkIsActive = (itemPath: string) => {
    if (itemPath.includes('?')) {
      const [base, query] = itemPath.split('?');
      if (location.pathname !== base) return false;
      const tab = new URLSearchParams(query).get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab');
      if (!currentTab && tab === 'organizer') return true;
      return currentTab === tab;
    }
    return location.pathname === itemPath;
  };

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
    <div className="min-h-screen flex bg-[#F2F2F2] selection:bg-[#38BDF2]/30">
      {/* Sidebar for desktop */}
      <aside
        className={`bg-[#F2F2F2] border-r border-[#D1D5DB] hidden md:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out ${desktopSidebarOpen ? 'w-52' : 'w-16'}`}
        style={{ overflow: desktopSidebarOpen ? 'hidden' : 'visible' }}
      >
        <div className={`flex items-center justify-center border-b border-[#D1D5DB] shrink-0 h-24`}>
          <Link to="/user-home" className="flex items-center justify-center group transition-all duration-500 transform hover:scale-[1.02] active:scale-[0.98]">
            {employerLogoUrl ? (
              <img
                src={employerLogoUrl}
                alt={employerName || 'Logo'}
                className={desktopSidebarOpen ? "h-20 w-auto max-w-full object-contain px-4 font-black" : "h-12 w-12 object-contain rounded-lg border border-[#E5E7EB]"}
              />
            ) : (
              desktopSidebarOpen ? (
                <Branding className="h-20 w-auto" />
              ) : (
                <img src="/lgo.webp" alt="Logo" className="h-10 w-10 object-contain" />
              )
            )}
          </Link>
        </div>
        <nav className={`flex-1 pt-6 pb-6 ${desktopSidebarOpen ? 'px-0' : 'px-2'} flex flex-col gap-0.5 overflow-y-auto overflow-x-visible scrollbar-none scroll-smooth`}
          style={{ width: desktopSidebarOpen ? '100%' : '220px', paddingRight: desktopSidebarOpen ? '0' : '150px' }}>
          {menuItems.map((item: any, idx) => {
            const isActive = checkIsActive(item.path);

            return (
              <React.Fragment key={item.path || idx}>
                {item.separator && (
                  <div className={`mx-5 my-3 h-[1px] bg-[#D1D5DB] shrink-0 ${!desktopSidebarOpen ? 'mx-2' : ''}`} />
                )}
                <Link
                  to={item.path}
                  className={`flex transition-all duration-200 group relative shrink-0 ${desktopSidebarOpen
                    ? 'flex-row items-center gap-3 px-3 py-2.5 mx-2 rounded-lg'
                    : 'flex-col items-center justify-center w-11 h-11 mx-auto rounded-xl'
                    } ${isActive
                      ? 'bg-[#38BDF2] text-white shadow-md shadow-[#38BDF2]/20'
                      : 'text-[#000000]/90 hover:bg-[#D1D5DB]/50 hover:text-[#000000]'
                    }`}
                  title={!desktopSidebarOpen ? item.label : undefined}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    {React.cloneElement(item.icon as React.ReactElement<any>, {
                      className: `transition-colors duration-200 ${desktopSidebarOpen ? 'w-[18px] h-[18px]' : 'w-5 h-5 group-hover:scale-105'} ${isActive ? 'stroke-[2.5px] text-white' : 'stroke-[1.8px] text-[#000000] group-hover:text-[#000000]'}`
                    })}
                    {item.premium && <CrownBadge />}
                  </div>

                  {desktopSidebarOpen ? (
                    <span className={`text-[13px] tracking-tight truncate ${isActive ? 'font-bold text-white' : 'font-semibold text-[#000000]'}`}>
                      {item.label}
                    </span>
                  ) : (
                    <div className="absolute left-full ml-5 px-3 py-1.5 bg-[#38BDF2] text-white text-[11px] font-bold rounded-md opacity-0 translate-x-[-10px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-[999] whitespace-nowrap shadow-xl flex items-center">
                      <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-[4px] border-transparent border-r-[#38BDF2]" />
                      {item.label}
                    </div>
                  )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>
      </aside>

      <main
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${desktopSidebarOpen ? 'md:pl-52' : 'md:pl-16'}`}
      >
        <header className="h-24 bg-[#F2F2F2] border-b border-[#D1D5DB] px-4 sm:px-8 flex items-center justify-between gap-4 sm:gap-6 sticky top-0 z-[500] w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(true);
                } else {
                  setDesktopSidebarOpen(!desktopSidebarOpen);
                }
              }}
              className="p-2.5 rounded-lg border border-[#D1D5DB] bg-[#F2F2F2] hover:bg-gray-100 transition-all group active:scale-95"
              aria-label="Toggle Sidebar"
            >
              <svg className={`w-5 h-5 transition-transform duration-500 ${!desktopSidebarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="ml-1 hidden sm:block">
              <p className="text-[10px] uppercase font-black text-[#111111] tracking-[0.2em]">
                Organizer Portal
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {(!(role === UserRole.STAFF && canReceiveNotifications === false)) && (
              <div className="relative group">
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-[#F2F2F2] hover:bg-gray-100 transition-all active:scale-95 shadow-sm relative"
                  onClick={() => setNotificationOpen(!notificationOpen)}
                >
                  <ICONS.Bell className="w-5 h-5 text-[#4B5563]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-[#F2F2F2] animate-in zoom-in duration-300">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {notificationOpen && (
                  <>
                    <div className="fixed inset-0 z-[100] bg-[#2E2E2F]/10 backdrop-blur-[2px]" onClick={() => setNotificationOpen(false)} />
                    <div className="fixed left-3 right-3 top-24 bottom-24 sm:left-auto sm:right-6 sm:bottom-6 w-auto sm:w-full sm:max-w-[420px] bg-[#F2F2F2] rounded-xl sm:rounded-xl border border-[#2E2E2F]/5 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.15)] z-[101] flex flex-col overflow-hidden animate-in slide-in-from-right-8 fade-in duration-500">
                      <div className="p-8 border-b border-[#2E2E2F]/5 flex items-start justify-between bg-[#F2F2F2]/80 backdrop-blur-xl sticky top-0 z-10">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-black tracking-tight text-[#2E2E2F]">Notifications</h2>
                            {unreadCount > 0 && (
                              <span className="bg-red-500/10 text-red-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                {unreadCount} New
                              </span>
                            )}
                          </div>
                          <p className="text-[#2E2E2F] text-xs font-bold uppercase tracking-widest">Stay up to date on important information</p>
                        </div>
                        <button onClick={() => setNotificationOpen(false)} className="w-10 h-10 rounded-xl bg-[#F2F2F2] flex items-center justify-center text-[#2E2E2F] hover:text-[#2E2E2F] hover:bg-[#2E2E2F]/5 transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
                        {notificationsLoading && notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                            <div className="w-12 h-12 border-4 border-[#38BDF2]/20 border-t-[#38BDF2] rounded-full animate-spin mb-4" />
                            <p className="text-[#2E2E2F] text-xs font-black uppercase tracking-widest">Syncing notifications...</p>
                          </div>
                        ) : notifications.length > 0 ? (
                          <div className="px-4 space-y-2">
                            <div className="px-4 py-2 flex justify-between items-center mb-4">
                              <span className="text-[10px] font-black text-[#2E2E2F] uppercase tracking-[0.2em]">RECENT ACTIVITY</span>
                              <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] font-black text-[#38BDF2] hover:text-[#2E2E2F] uppercase tracking-[0.2em] transition-colors"
                              >
                                Mark all read
                              </button>
                            </div>
                            {notifications.map((n) => (
                              <div
                                key={n.notificationId || Math.random()}
                                onClick={() => {
                                  setSelectedNotification(n);
                                  if (!n.isRead) handleMarkNotificationRead(n.notificationId);
                                }}
                                className={`p-5 rounded-xl transition-all group relative border cursor-pointer ${n.isRead
                                  ? 'bg-transparent border-transparent opacity-60'
                                  : 'bg-[#F2F2F2] border-[#2E2E2F]/5 hover:border-[#38BDF2]/30 shadow-sm'
                                  }`}
                              >
                                <div className="flex items-start gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.isRead ? 'bg-[#2E2E2F]/5 text-[#2E2E2F]' : 'bg-[#38BDF2]/10 text-[#38BDF2]'
                                    }`}>
                                    <ICONS.Bell className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="text-sm font-black text-[#2E2E2F] tracking-tight truncate">{n.title}</h4>
                                      <span className="text-[9px] text-[#2E2E2F] font-black uppercase tracking-widest whitespace-nowrap ml-2">
                                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Now'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-[#2E2E2F] font-medium leading-relaxed line-clamp-2 mb-3">{n.message}</p>
                                    {!n.isRead && (
                                      <button
                                        onClick={() => handleMarkNotificationRead(n.notificationId)}
                                        className="text-[10px] font-black text-[#38BDF2] uppercase tracking-widest hover:text-[#2E2E2F] transition-colors"
                                      >
                                        Mark as read
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                            <div className="w-24 h-24 bg-[#F2F2F2] rounded-xl flex items-center justify-center mb-8">
                              <ICONS.Bell className="w-10 h-10 text-[#2E2E2F]" />
                            </div>
                            <h3 className="text-xl font-black text-[#2E2E2F] tracking-tighter uppercase mb-2">Clean Slate</h3>
                            <p className="text-sm font-medium text-[#2E2E2F] max-w-[240px] leading-relaxed">
                              You're all caught up. We'll alert you when there's news.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#F2F2F2] hover:bg-gray-100 transition-all active:scale-95"
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-200 text-[#111827] flex items-center justify-center border border-[#E5E7EB]">
                {imageUrl ? (
                  <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-medium text-xs text-[#4B5563]">{initials}</span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-bold text-[#111827] truncate max-w-[100px] leading-none">{displayName}</p>
                <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide mt-1">{roleLabel}</p>
              </div>
              <svg className="w-4 h-4 text-[#9CA3AF]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-xl shadow-xl z-50 p-2 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                  <div className="px-4 py-3 border-b border-[#2E2E2F]/5 mb-1">
                    <p className="text-[10px] font-medium text-[#2E2E2F] uppercase tracking-widest mb-0.5">Account</p>
                    <p className="text-xs font-semibold text-[#2E2E2F] truncate">{displayName}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2E2E2F] mt-1">{roleLabel}</p>
                  </div>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
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
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                      onClick={handleToggleAttendingMode}
                    >
                      <ICONS.Users className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>{isAttendingView ? 'Organize Events' : 'Switch to Attending'}</span>
                    </button>
                  )}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                    onClick={() => {
                      navigate(organizerProfilePath);
                      setUserMenuOpen(false);
                    }}
                  >
                    <ICONS.Users className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                    <span>Org Profile</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                    onClick={() => {
                      navigate('/user-settings?tab=team');
                      setUserMenuOpen(false);
                    }}
                  >
                    <ICONS.Shield className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                    <span>Teams & Access</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                    onClick={() => {
                      navigate('/user-settings?tab=email');
                      setUserMenuOpen(false);
                    }}
                  >
                    <ICONS.Mail className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                    <span>Email Setup</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                    onClick={() => {
                      navigate('/user-settings?tab=payments');
                      setUserMenuOpen(false);
                    }}
                  >
                    <ICONS.CreditCard className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                    <span>Payment Gateway</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                    onClick={() => {
                      navigate('/user-settings?tab=account');
                      setUserMenuOpen(false);
                    }}
                  >
                    <ICONS.Settings className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                    <span>Account Settings</span>
                  </button>
                  {hasPrioritySupport === true && (
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-colors text-left group"
                      onClick={() => {
                        navigate('/organizer-support');
                        setUserMenuOpen(false);
                      }}
                    >
                      <ICONS.MessageSquare className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span>Support</span>
                    </button>
                  )}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2E2E2F] hover:bg-red-50 hover:text-red-500 transition-colors text-left group"
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
        </header>



        {sidebarOpen && (
          <div className="fixed inset-0 z-[100] flex lg:hidden">
            <div className="fixed inset-0 bg-[#2E2E2F]/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="relative w-[min(18.5rem,calc(100vw-1rem))] bg-[#F2F2F2] border-r border-[#E5E7EB] flex flex-col h-full z-50 animate-in slide-in-from-left duration-300 shadow-2xl">
              <div className="p-8 pb-3 flex items-center justify-between border-b border-[#E5E7EB]">
                <Link to="/user-home" onClick={() => setSidebarOpen(false)} className="flex flex-col items-start gap-2 group transition-all duration-500">
                  {employerLogoUrl ? (
                    <img
                      src={employerLogoUrl}
                      alt={employerName || 'Logo'}
                      className="h-12 w-auto max-w-[168px] object-contain"
                    />
                  ) : (
                    <img
                      src="/lgo.webp"
                      alt="Logo"
                      className="h-10 w-10 object-contain shadow-sm border border-[#E5E7EB] rounded-lg"
                    />
                  )}
                  {employerName && (
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2E2E2F] ml-0.5">
                      {employerName}
                    </span>
                  )}
                </Link>
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#2E2E2F]/5 text-[#2E2E2F] hover:bg-gray-100 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 px-4 pt-4 pb-24 space-y-1 overflow-y-auto scrollbar-none">
                {menuItems.map((item: any) => {
                  const isActive = checkIsActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-4 px-5 py-3.5 mx-2 rounded-lg transition-all duration-200 group ${isActive
                        ? 'bg-[#38BDF2] text-white shadow-md shadow-[#38BDF2]/20'
                        : 'text-[#000000]/90 hover:bg-[#E5E7EB]/50 hover:text-[#000000]'
                        }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <div className={isActive ? 'text-white' : 'text-[#000000]/90 group-hover:text-[#000000]'}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { className: 'w-5 h-5 ' + (isActive ? 'stroke-[2px]' : 'stroke-[1.5px]') })}
                      </div>
                      <span className={`text-sm tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>

        <Modal
          isOpen={!!selectedNotification}
          onClose={() => setSelectedNotification(null)}
          title={selectedNotification?.title || 'Notification details'}
          subtitle={selectedNotification?.createdAt ? new Date(selectedNotification.createdAt).toLocaleString() : ''}
          size="md"
        >
          <div className="py-6 sm:py-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[#38BDF2]/10 flex items-center justify-center text-[#38BDF2] shrink-0 border border-[#38BDF2]/20">
                <ICONS.Bell className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#2E2E2F] uppercase tracking-widest">Notification</p>
                <p className="text-lg font-black text-[#2E2E2F] tracking-tight mt-0.5">Message Details</p>
              </div>
            </div>

            <div className="p-6 sm:p-8 rounded-[1.5rem] bg-[#F2F2F2] border border-[#2E2E2F]/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#38BDF2]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#38BDF2]/10 transition-all duration-700" />
              <p className="text-sm sm:text-base text-[#2E2E2F] font-medium leading-relaxed relative z-10 whitespace-pre-wrap">
                {selectedNotification?.message}
              </p>
            </div>

            <div className="mt-10 flex justify-end">
              <Button
                onClick={() => setSelectedNotification(null)}
                className="px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest bg-[#38BDF2] text-white hover:bg-[#2E2E2F] transition-all"
              >
                Close Details
              </Button>
            </div>
          </div>
        </Modal>
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
  const { role: currentRole, isOnboarded: currentOnboarded, hasResolvedSession } = useUser();
  const location = useLocation();

  if (!hasResolvedSession) return null;

  if (currentRole === UserRole.ORGANIZER && currentOnboarded === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (!currentRole) return <Navigate to="/login" replace />;
  if (!allow.includes(currentRole)) return <Navigate to={roleHomePath(currentRole)} replace />;
  return children;
};

const ScrollToTop: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // 1. Scroll to top whenever the path changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });

    // 2. Dynamic Browser Titles
    const path = location.pathname;
    const baseTitle = 'StartupLab';
    
    // Explicit mappings
    const titleMap: { [key: string]: string } = {
      '/': `${baseTitle} | Build. Connect. Launch.`,
      '/live': `Watch Live | ${baseTitle} Events`,
      '/browse-events': `Explore Events | ${baseTitle}`,
      '/about-us': `About Us | ${baseTitle}`,
      '/contact-us': `Contact Us | ${baseTitle}`,
      '/pricing': `Pricing | ${baseTitle}`,
      '/user-home': `Organizer Portal | ${baseTitle}`,
      '/my-events': `My Events | ${baseTitle}`,
      '/dashboard': `Platform Dashboard | ${baseTitle}`,
      '/onboarding': `Startup Onboarding | ${baseTitle}`,
      '/faq': `FAQ | ${baseTitle}`,
      '/privacy-policy': `Privacy Policy | ${baseTitle}`,
      '/terms-of-service': `Terms of Service | ${baseTitle}`,
      '/my-tickets': `My Tickets | ${baseTitle}`,
      '/liked': `Liked Events | ${baseTitle}`,
      '/followings': `Followings | ${baseTitle}`,
      '/organizer-support': `Support | ${baseTitle}`,
      '/user-settings': `Account Settings | ${baseTitle}`,
      '/onboarding-complete': `Welcome Ready | ${baseTitle}`,
    };

    // Handle dynamic patterns
    if (path.startsWith('/events/')) {
        const slug = path.split('/')[2];
        if (path.endsWith('/register')) {
            document.title = `Register for Event | ${baseTitle}`;
        } else {
            // Title will be updated by EventDetails component if it fetches data, 
            // but we provide a solid fallback here.
            document.title = `Event Details | ${baseTitle}`;
        }
    } else if (path.startsWith('/organizer/')) {
        document.title = `Organizer Profile | ${baseTitle}`;
    } else if (path.startsWith('/tickets/')) {
        document.title = `Your Ticket | ${baseTitle}`;
    } else {
        document.title = titleMap[path] || baseTitle;
    }
  }, [location.pathname]);

  return null;
};

const HashBypassBridge: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If the browser lands on a non-hash path that matches our success route
    // (This happens when HitPay/Browsers strip the # part or misinterpret the redirect)
    if (window.location.pathname === '/subscription/success') {
      console.log('🔀 [App] Redirecting clean URL to Hash route...');
      const search = window.location.search;
      navigate(`/subscription/success${search}`, { replace: true });
    }
  }, [navigate]);

  return null;
};

const GlobalOnboardingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, isOnboarded, isAuthenticated, setUser, clearUser, hasResolvedSession, authModal, closeAuthModal } = useUser();
  const { isAttendingView } = useEngagement();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const res = await apiService._fetch(`${API}/api/whoAmI`, { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const me = await res.json();
          const normalizedRole = normalizeUserRole(me?.role);
          if (!cancelled && normalizedRole && me?.email) {
            setUser({
              userId: me.userId || me.id,
              role: normalizedRole,
              email: me.email,
              name: me.name ?? null,
              imageUrl: me.imageUrl ?? null,
              isOnboarded: !!me.isOnboarded,
              canViewEvents: me.canViewEvents ?? true,
              canEditEvents: me.canEditEvents ?? true,
              canManualCheckIn: me.canManualCheckIn ?? true,
              canReceiveNotifications: me.canReceiveNotifications ?? true,
              employerId: me.employerId || null,
              employerLogoUrl: me.employerLogoUrl || null,
              employerName: me.employerName || null,
            });
            return;
          }
        }
      } catch {
        // Silent fail for guest
      }

      if (!cancelled) {
        clearUser();
      }
    };

    // 1. Initial sync if not resolved
    if (!hasResolvedSession) {
      sync();
    }

    // 2. Listen for auth changes (Login/Logout) to trigger re-sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || (event === 'INITIAL_SESSION' && session)) {
        sync();
      } else if (event === 'SIGNED_OUT') {
        clearUser();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [clearUser, hasResolvedSession, setUser]);

  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password', '/accept-invite'].includes(location.pathname);
  const isOnboardingPage = location.pathname === '/onboarding';

  // Organizer-portal paths that require onboarding to be complete
  const organizerPortalPaths = [
    '/user-home', '/my-events', '/my-events/create', '/my-events/edit',
    '/user-settings', '/organizer-settings', '/account-settings',
    '/user/attendees', '/user/checkin', '/user/archive', '/user/reports',
    '/dashboard', '/subscription', '/organizer-support', '/payment-settings',
  ];
  const isOrganizerPortalPage = organizerPortalPaths.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + '/')
  );

  // 1. Automatic redirection from home to portal for logged-in users
  useEffect(() => {
    const isPortalUser = role === UserRole.ADMIN || role === UserRole.STAFF;
    const shouldRedirect = hasResolvedSession && isAuthenticated && location.pathname === '/' && (isPortalUser || !isAttendingView);

    if (shouldRedirect) {
      if (role === UserRole.ADMIN) {
        navigate('/dashboard', { replace: true });
      } else if (role === UserRole.STAFF) {
        navigate('/events', { replace: true });
      } else if (role === UserRole.ORGANIZER) {
        navigate(isOnboarded ? '/user-home' : '/onboarding', { replace: true });
      }
    }
  }, [hasResolvedSession, isAuthenticated, isAttendingView, location.pathname, role, isOnboarded, navigate]);

  if (!hasResolvedSession) return <PageLoader label="Standardizing Platform..." variant="viewport" />;

  // 2. Force redirection if trying to access portal routes (Setup required)
  if (isAuthenticated && role === UserRole.ORGANIZER && isOnboarded === false && isOrganizerPortalPage && !isOnboardingPage && !isAuthPage) {
    return <Navigate to="/onboarding" replace />;
  }

  // 3. Force redirection from ANY other page back to welcome view if not in attending mode
  // (This ensures they stay on Onboarding/Welcome unless they explicitly choose "Browse Events")
  if (isAuthenticated && role === UserRole.ORGANIZER && isOnboarded === false && !isAttendingView && !isOnboardingPage && !isAuthPage) {
    return <Navigate to="/onboarding" replace />;
  }



  return (
    <>
      {children}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        initialView={authModal.view}
      />
    </>
  );
};

const EventsPortal = () => {
  const { role } = useUser();
  return role === UserRole.ADMIN ? <EventsManagement /> : <UserEvents />;
};

const App: React.FC = () => (
  <Router>
    <ScrollToTop />
    <HashBypassBridge />
    <GlobalOnboardingGuard>
      <React.Suspense fallback={<div className="suspense-progress"><div className="suspense-progress-bar" /></div>}>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/" replace />} />
          <Route path="/welcome" element={<WelcomeView />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/" element={<PublicLayout><EventList /></PublicLayout>} />
          <Route path="/live" element={<PublicLayout><LivePage /></PublicLayout>} />
          <Route path="/categories/:categoryKey" element={<PublicLayout><CategoryEvents /></PublicLayout>} />
          <Route path="/events/:slug" element={<PublicLayout><EventDetails /></PublicLayout>} />
          <Route path="/organizer/:id" element={<PublicLayout><OrganizerProfilePage /></PublicLayout>} />
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
          <Route path="/organizers/discover" element={<PublicLayout><OrganizerDiscoveryPage /></PublicLayout>} />
          <Route path="/faq" element={<PublicLayout><FaqPage /></PublicLayout>} />
          <Route path="/refund-policy" element={<PublicLayout><RefundPolicyPage /></PublicLayout>} />
          <Route path="/onboarding" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><WelcomeView /></RequireRoleRoute>} />

          {/* User Portal Routes */}
          <Route path="/user-home" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><UserHome /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/my-events" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><UserEvents /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/my-events/create" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><UserEvents /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/my-events/edit/:eventId" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><UserEvents /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/user-settings" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><UserSettings /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/organizer-settings" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><Navigate to="/user-settings?tab=organizer" replace /></RequireRoleRoute>} />
          <Route path="/payment-settings" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><Navigate to="/user-settings?tab=payments" replace /></RequireRoleRoute>} />
          <Route path="/account-settings" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><Navigate to="/user-settings?tab=account" replace /></RequireRoleRoute>} />
          <Route path="/user/attendees" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><RegistrationsList /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/user/checkin" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><CheckIn /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/user/archive" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><ArchiveEvents /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/user/reports" element={<RequireRoleRoute allow={[UserRole.ORGANIZER, UserRole.STAFF]}><UserPortalLayout><OrganizerReports /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/subscription" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><OrganizerSubscription /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/organizer-support" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><OrganizerSupport /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/organizer-support/archive" element={<RequireRoleRoute allow={[UserRole.ORGANIZER]}><UserPortalLayout><ArchiveSupport /></UserPortalLayout></RequireRoleRoute>} />
          <Route path="/subscription/success" element={<PublicLayout><SubscriptionSuccess /></PublicLayout>} />

          {/* Admin Portal Routes */}
          <Route path="/dashboard" element={<RequireRoleRoute allow={[UserRole.ADMIN, UserRole.ORGANIZER]}><DashboardWrapper /></RequireRoleRoute>} />
          <Route path="/events" element={<RequireRoleRoute allow={[UserRole.ADMIN, UserRole.STAFF]}><PortalLayout><EventsPortal /></PortalLayout></RequireRoleRoute>} />
          <Route path="/attendees" element={<RequireRoleRoute allow={[UserRole.ADMIN, UserRole.STAFF]}><PortalLayout><RegistrationsList /></PortalLayout></RequireRoleRoute>} />
          <Route path="/checkin" element={<RequireRoleRoute allow={[UserRole.ADMIN, UserRole.STAFF]}><PortalLayout><CheckIn /></PortalLayout></RequireRoleRoute>} />
          <Route path="/admin/categories" element={<RequireRoleRoute allow={[UserRole.ADMIN]}><PortalLayout><CategoryManagement /></PortalLayout></RequireRoleRoute>} />
          <Route path="/admin/discovery" element={<RequireRoleRoute allow={[UserRole.ADMIN]}><PortalLayout><DiscoveryHub /></PortalLayout></RequireRoleRoute>} />
          <Route path="/admin/announcements" element={<RequireRoleRoute allow={[UserRole.ADMIN]}><PortalLayout><Announcements /></PortalLayout></RequireRoleRoute>} />
          <Route path="/settings" element={<RequireRoleRoute allow={[UserRole.ADMIN, UserRole.STAFF]}><PortalLayout><SettingsView /></PortalLayout></RequireRoleRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </GlobalOnboardingGuard>
  </Router>
);
export default App;


