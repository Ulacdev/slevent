import React, { useState, useEffect, useRef } from 'react';
import ReCAPTCHA from "react-google-recaptcha";
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Button, PasswordInput, Checkbox, PasswordRequirements, Modal } from '../../components/Shared';
import { ICONS } from '../../constants';
import { supabase } from "../../supabase/supabaseClient.js";
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { UserRole, normalizeUserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { maskPassword } from '../../utils/authUtils';
import { validatePassword } from '../../utils/passwordValidation';

const EnvelopeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><rect width="20" height="16" x="2" y="4" rx="2" /></svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);

const IconInput = (props: any) => {
  const { icon, ...inputProps } = props;
  return (
    <div className="relative group/input w-full">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 group-focus-within/input:text-[#38BDF2] transition-colors z-10 w-4 h-4 flex items-center justify-center">
          {icon}
        </div>
      )}
      <input
        {...inputProps}
        className={`w-full px-5 py-3 bg-[#F2F2F2] border border-black/[0.03] rounded-[16px] text-[14px] font-medium text-black outline-none focus:border-[#38BDF2] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${icon ? 'pl-11' : 'pl-4'} ${inputProps.className || ''}`}
      />
    </div>
  );
};

const API = import.meta.env.VITE_API_BASE;

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useUser();
  const { showToast } = useToast();

  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'login' | 'signup' | 'forgot-password' | 'reset-password' | 'accept-invite'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showLoginCaptcha, setShowLoginCaptcha] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [captchaValue, setCaptchaValue] = useState<string | null>(null);

  // Reset/Invite States
  const [inviteInfo, setInviteInfo] = useState<{ email: string; role: string; accountExists: boolean; name: string } | null>(null);
  const [recoveryVerified, setRecoveryVerified] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Sync view with URL
  useEffect(() => {
    if (location.pathname === '/signup') setView('signup');
    else if (location.pathname === '/forgot-password') setView('forgot-password');
    else if (location.pathname === '/reset-password') setView('reset-password');
    else if (location.pathname === '/accept-invite') setView('accept-invite');
    else setView('login');
  }, [location.pathname]);

  // Fetch Invite Info
  useEffect(() => {
    if (view === 'accept-invite') {
      const rawToken = searchParams.get('token') || '';
      const token = rawToken.trim().replace(/[?.,;:!]+$/, '');
      if (!token) return;

      const fetchInfo = async () => {
        setLoading(true);
        try {
          const res = await fetch(`${API}/api/invite/check-invite?token=${token}`);
          if (!res.ok) throw new Error('Invite not found or expired.');
          const data = await res.json();
          setInviteInfo(data);
          if (data.name) setName(data.name);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchInfo();
    }
  }, [view, searchParams]);

  useEffect(() => {
    const titleMap: Record<string, string> = {
      'login': 'Login | StartupLab Business Center',
      'signup': 'Create Account | StartupLab Business Center',
      'forgot-password': 'Forgot Password | StartupLab Business Center',
      'reset-password': 'Setup New Password | StartupLab Business Center',
      'accept-invite': 'Join Organization | StartupLab Business Center'
    };
    document.title = titleMap[view] || 'Authentication | StartupLab Business Center';
  }, [view]);

  const parseResetParams = () => {
    const merged = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const segments = hash.split('#').filter(Boolean);
    for (const segment of segments) {
      const queryPart = segment.includes('?') ? segment.split('?').slice(1).join('?') : segment;
      if (!queryPart.includes('=')) continue;
      const params = new URLSearchParams(queryPart);
      params.forEach((value, key) => { if (!merged.has(key)) merged.set(key, value); });
    }
    return merged;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const passError = validatePassword(password);
    if (passError) {
      setError(passError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!recoveryVerified) {
        const resetParams = parseResetParams();
        const tokenHash = resetParams.get('token_hash');
        const accessToken = resetParams.get('access_token');
        const refreshToken = resetParams.get('refresh_token');
        const code = resetParams.get('code');

        if (tokenHash) {
          const { error: verifyErr } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
          if (verifyErr) throw verifyErr;
        } else if (accessToken && refreshToken) {
          const { error: sessionErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionErr) throw sessionErr;
        } else if (code) {
          const { error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (codeErr) throw codeErr;
        } else {
          throw new Error('Reset link is invalid or expired. Please request a new one.');
        }
        setRecoveryVerified(true);
      }

      const { error: resetError } = await supabase.auth.updateUser({ password });
      if (resetError) throw resetError;

      setSuccessMessage('Your password has been successfully updated.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const rawToken = searchParams.get('token') || '';
    const token = rawToken.trim().replace(/[?.,;:!]+$/, '');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    const needsPassword = !inviteInfo?.accountExists;
    if (needsPassword) {
      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }
    if (!name.trim()) { setError('Full Name is required.'); return; }
    if (!inviteInfo?.accountExists && !password) { setError('Password is required.'); return; }
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/invite/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          name: name.trim(), 
          password: !inviteInfo?.accountExists ? maskPassword(password) : undefined
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to accept invitation');
      }
      setSuccessMessage(needsPassword ? 'Account created! Redirecting...' : 'Organization joined! Redirecting...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (user: any, session: any) => {
    try {
      const profileRes = await apiService._fetch(`${API}/api/whoAmI`, { cache: 'no-store' });
      const profile = await profileRes.json().catch(() => ({}));
      const normalizedRole = normalizeUserRole(profile?.role || 'ORGANIZER');
      const isOnboarded = !!profile?.isOnboarded;

      setUser({
        userId: user.id || user.userId,
        role: normalizedRole as UserRole,
        email: user.email!,
        name: profile?.name || user.email?.split('@')[0],
        imageUrl: profile?.imageUrl || null,
        isOnboarded,
        canViewEvents: profile?.canViewEvents ?? true,
        canEditEvents: profile?.canEditEvents ?? true,
        canManualCheckIn: profile?.canManualCheckIn ?? true,
        canReceiveNotifications: profile?.canReceiveNotifications ?? true,
        employerId: profile?.employerId || null,
        employerLogoUrl: profile?.employerLogoUrl || null,
        employerName: profile?.employerName || null
      });

      showToast('success', 'Logged in successfully!');
      if (normalizedRole === UserRole.ADMIN) navigate('/dashboard');
      else if (normalizedRole === UserRole.STAFF) navigate('/events');
      else if (normalizedRole === UserRole.ORGANIZER) navigate(isOnboarded ? '/user-home' : '/onboarding');
      else if (normalizedRole === UserRole.ATTENDEE) navigate('/browse-events');
    } catch (err) {
      showToast('error', 'Failed to synchronize session.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Require reCAPTCHA after 15 failed attempts
    if (loginAttempts >= 15 && !captchaValue) {
      setError('Please complete the reCAPTCHA verification.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password: maskPassword(password),
          captchaToken: captchaValue || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { 
        if (data.requiresCaptcha) {
          setShowLoginCaptcha(true);
          setLoginAttempts(Math.max(loginAttempts, 15));
        } else {
          setLoginAttempts(prev => {
            const next = prev + 1;
            if (next >= 15) setShowLoginCaptcha(true);
            return next;
          });
        }
        setError(data.message || "Invalid credentials."); 
        setLoading(false); 
        return; 
      }

      // Reset attempts on success
      setLoginAttempts(0);
      setShowLoginCaptcha(false);
      setCaptchaValue(null);

      if (data.user && data.session) {
        await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
        await handleLoginSuccess(data.user, data.session);
      }
    } catch (err) { setError("Security server error."); setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!name.trim()) { setError('Full Name is required.'); return; }
    if (!agreedToTerms) { setError('Please agree to terms.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: name.trim(), 
          email: email.trim().toLowerCase(), 
          password: maskPassword(password)
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message || 'Failed to register.'); setLoading(false); return; }
      showToast('success', 'Account created! Please verify email.');
      setView('login');
      setPassword(''); setEmail('');
    } catch (err) { 
      setError('Failed to register.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    setSocialLoading(provider);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/#/login` }
      });
      if (authError) throw authError;
    } catch (err: any) { setSocialLoading(null); showToast('error', err.message); }
  };

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <>
      <div className="relative min-h-screen w-full flex bg-[#F2F2F2] lg:overflow-y-auto font-sans">
        {/* LEFT: Branding (55%) */}
        <div className="hidden lg:flex w-[60%] lg:h-screen lg:sticky lg:top-0 flex-col pl-10 pr-4 pt-4 justify-between bg-[#F2F2F2] border-r border-black/5 relative overflow-hidden isolate">

          {/* Mockup Display: Premium Dark Shells */}
          <div className="absolute left-[74%] -translate-x-1/2 top-[40%] -translate-y-1/2 z-0 pointer-events-none transform scale-[0.6] lg:scale-[0.75] opacity-[0.9] transition-opacity duration-700">

            {/* Laptop Mockup (Clay Blue Shell - Off Axis 1 Left) */}
            <div
              className="relative w-[700px] h-[450px]"
              style={{
                transform: 'perspective(2000px) rotateX(15deg) rotateY(30deg) rotateZ(-5deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Screen Frame (Clay Blue Shell) */}
              <div className="absolute inset-0 bg-[#38BDF2] rounded-[2.5rem] shadow-[0_40px_100px_rgba(56,189,242,0.2),inset_0_-12px_24px_rgba(0,0,0,0.1),inset_0_12px_24px_rgba(255,255,255,0.4)] border border-white/20 p-3.5"
                style={{ transform: 'translateZ(1px)', transformStyle: 'preserve-3d' }}>
                {/* Macbook-style Lip Indentation */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-[#2daade]/40 rounded-b-lg border-b border-white/10 z-20" />
                {/* Internal Screen Area */}
                <div className="w-full h-full rounded-[1.8rem] overflow-visible border border-black/[0.05] relative z-10 flex flex-col font-sans"
                  style={{ transform: 'translateZ(0)', WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
                  {/* Webpage Header (Real-time Layout) */}
                  <div className="h-12 border-b border-black/5 flex items-center px-4 justify-between bg-[#F2F2F2] shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 grayscale opacity-60">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      </div>
                      <div className="h-4 w-px bg-black/10 mx-2" />
                      <div className="flex items-center gap-1.5 transition-opacity hover:opacity-70 cursor-pointer">
                        <div className="w-4 h-4 bg-[#38BDF2] rounded-md flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full opacity-40" />
                        </div>
                        <span className="text-[10px] font-black tracking-tight text-black">StartupLab / <span className="text-black/40">Events</span></span>
                      </div>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="flex items-center gap-2 px-2 py-1 bg-black/[0.03] rounded-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <div className="w-12 h-1.5 bg-black/10 rounded-full" />
                      </div>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 border border-white" />
                    </div>
                  </div>

                  {/* Dashboard Body */}
                  <div className="flex-1 p-5 grid grid-cols-12 gap-5 overflow-hidden bg-[#F2F2F2]">
                    {/* Sidebar (Real Pages - Enhanced Visibility with Accurate Icons) */}
                    <div className="col-span-3 border-r border-black/[0.03] pr-2 h-full flex flex-col gap-0.5 pt-1 overflow-hidden transform scale-[1.1] origin-top-left">
                      {[
                        { name: 'Home', icon: ICONS.Home },
                        { name: 'Dashboard', icon: ICONS.Activity },
                        { name: 'Events Management', icon: ICONS.Calendar },
                        { name: 'Attendees', icon: ICONS.Users },
                        { name: 'Check In', icon: ICONS.CheckCircle },
                        { name: 'Reports', icon: ICONS.BarChart },
                        { name: 'Archive', icon: ICONS.Archive },
                        { name: 'Plans', icon: ICONS.CreditCard },
                        { name: 'Organization Profile', icon: ICONS.Layout },
                        { name: 'Team and Access', icon: ICONS.Shield },
                        { name: 'Email Settings', icon: ICONS.Mail },
                        { name: 'Payment Settings', icon: ICONS.CreditCard },
                        { name: 'Support', icon: ICONS.Info },
                        { name: 'Account Settings', icon: ICONS.Settings }
                      ].map((item, i) => (
                        <div key={i} className={`flex items-center gap-2 px-2 py-0.5 rounded-md transition-colors ${item.name === 'Dashboard' ? 'bg-[#38BDF2]/10' : ''}`}>
                          <item.icon className={`w-3 h-3 ${item.name === 'Dashboard' ? 'text-[#38BDF2]' : 'text-black/30'}`} />
                          <span className={`text-[9.5px] font-black tracking-tight whitespace-nowrap ${item.name === 'Dashboard' ? 'text-[#38BDF2]' : 'text-black/60'}`}>
                            {item.name}
                          </span>
                        </div>
                      ))}

                      <div className="mt-auto mb-2 p-2 bg-[#F2F2F2] border border-black/5 rounded-lg flex items-center justify-between">
                        <div className="w-4 h-4 rounded-full bg-[#38BDF2]/20" />
                        <div className="w-10 h-1 bg-black/10 rounded-full" />
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-span-9 space-y-5">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { val: '3.59', label: 'Total Sales', color: '#38BDF2' },
                          { val: '328', label: 'Attendees', color: '#000000' },
                          { val: '3.00', label: 'Conversion', color: '#000000' }
                        ].map((stat, i) => (
                          <div key={i} className="p-4 bg-[#F2F2F2] border border-black/5 rounded-2xl transition-shadow">
                            <div className="text-[8px] font-bold text-black/30 uppercase tracking-widest mb-1">{stat.label}</div>
                            <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.val}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                              <div className="h-1 w-8 bg-black/5 rounded-full" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Chart Area */}
                      <div className="h-36 w-full bg-[#F2F2F2] border border-black/5 rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <div className="h-2.5 w-24 bg-black/5 rounded-full" />
                          <div className="flex gap-2">
                            <div className="w-8 h-4 bg-black/[0.02] rounded-lg" />
                            <div className="w-8 h-4 bg-[#38BDF2]/10 rounded-lg" />
                          </div>
                        </div>
                        <div className="flex items-end justify-between flex-1 gap-2 pt-2 border-l border-b border-black/[0.03]">
                          {[40, 70, 45, 90, 65, 80, 50, 95, 60, 75, 85, 45].map((h, i) => (
                            <div key={i} className="flex-1 bg-gradient-to-t from-[#38BDF2]/30 to-[#38BDF2]/50 rounded-t-lg transition-all hover:scale-x-110" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                      </div>

                      {/* Recent Activities */}
                      <div className="bg-[#F2F2F2] border border-black/5 rounded-2xl p-4">
                        <div className="h-2.5 w-32 bg-black/5 rounded-full mb-4" />
                        <div className="space-y-3">
                          {[1, 2].map(i => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-black/[0.03] last:border-0">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-black/5" />
                                <div className="space-y-1">
                                  <div className="h-2 w-24 bg-black/10 rounded-full" />
                                  <div className="h-1.5 w-32 bg-black/5 rounded-full" />
                                </div>
                              </div>
                              <div className="h-8 w-16 bg-black/[0.02] rounded-lg" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Smartphone Mockup (Clay Blue Shell) */}
            <div
              className="absolute right-16 bottom-0 z-10 transform origin-bottom-right hover:-translate-y-4 transition-transform duration-700 ease-in-out"
              style={{
                transform: 'scale(0.6) perspective(2000px) rotateX(15deg) rotateY(-30deg) rotateZ(2deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              <div className="w-[320px] h-[640px] bg-[#38BDF2] rounded-[4.5rem] p-3.5 shadow-[20px_40px_100px_rgba(56,189,242,0.2),inset_0_-20px_40px_rgba(0,0,0,0.1),inset_0_20px_40px_rgba(255,255,255,0.4)] border border-white/20 relative overflow-visible flex flex-col items-stretch"
                style={{ transformStyle: 'preserve-3d' }}>

                {/* FRONT FACE (Inner F2F2F2 Screen Area) */}
                <div className="w-full h-full bg-[#F2F2F2] rounded-[3.5rem] border border-black/5 relative overflow-visible flex flex-col"
                  style={{ backfaceVisibility: 'hidden' }}>

                  {/* Notch (Clay Blue) */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#38BDF2] rounded-b-3xl shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 z-20">
                    <div className="w-2 h-2 rounded-full bg-white/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]" />
                    <div className="w-12 h-1 bg-white/20 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]" />
                  </div>

                  {/* Digital Ticket Layout */}
                  <div className="mt-10 flex flex-col gap-0.5 px-0">
                    {/* Ticket Info Area (Live Context) */}
                    <div className="bg-[#F2F2F2] border border-black/5 rounded-t-3xl p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-[#38BDF2] tracking-wider uppercase">StartupLab Live</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#38BDF2] animate-pulse" />
                            <span className="text-[9px] font-black text-black/20 uppercase">In Session</span>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-black text-white text-[8px] font-black rounded-full uppercase tracking-widest">VIP PASS</div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="text-[14px] font-black text-black leading-tight">Tech Founders Summit 2024</div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-16 bg-black/5 rounded-md" />
                            <div className="h-3 w-20 bg-black/5 rounded-md" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="p-2 border border-black/5 rounded-xl">
                            <span className="text-[7px] font-black text-black/20 block uppercase">Section</span>
                            <span className="text-[10px] font-black text-[#38BDF2]">A-12</span>
                          </div>
                          <div className="p-2 border border-black/5 rounded-xl">
                            <span className="text-[7px] font-black text-black/20 block uppercase">Seat</span>
                            <span className="text-[10px] font-black text-[#38BDF2]">VIP-04</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Perforation Effect */}
                    <div className="relative h-6 flex items-center justify-between px-[-10px]">
                      <div className="absolute left-[-15px] w-6 h-6 rounded-full bg-[#F2F2F2] border border-black/5" />
                      <div className="flex-1 border-t-2 border-dashed border-black/5 mx-6" />
                      <div className="absolute right-[-15px] w-6 h-6 rounded-full bg-[#F2F2F2] border border-black/5" />
                    </div>

                    {/* QR Validation Area (Real-time Sync) */}
                    <div className="bg-[#F2F2F2] border border-black/5 rounded-b-3xl p-6 flex flex-col items-center gap-4 relative">
                      <div className="absolute top-2 right-4 flex items-center gap-1 opacity-20">
                        <span className="text-[6px] font-black uppercase">Valid Ticket</span>
                      </div>

                      <div className="flex items-center gap-4 w-full">
                        {/* Side Scanning Line */}
                        <div className="w-2 h-32 bg-black/[0.03] rounded-full relative overflow-hidden">
                          <div className="absolute inset-x-0 h-8 bg-[#38BDF2] shadow-[0_0_12px_rgba(56,189,242,0.8)] animate-bounce" />
                        </div>
                        <div className="flex-1 p-2 bg-[#F2F2F2] relative">
                          <img
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=StartupLab-Business-Center-Validation-2024"
                            alt="QR Validation"
                            className="w-full h-full mix-blend-multiply transition-opacity"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-1.5">
                        <div className="text-[10px] font-black text-black leading-none opacity-20">SCAN TO CHECK IN</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex justify-center pb-2">
                    <div className="w-20 h-1 bg-black/10 rounded-full"></div>
                  </div>
                </div> {/* Closes Inner F2F2F2 Screen Area */}

              </div>
            </div>

          </div>

          {/* Top Branding Section */}
          <div className="z-10 transform origin-top-left scale-[0.9] flex flex-col items-start">
            <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
              <img
                src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
                alt="StartupLab"
                className="h-[7.1rem] w-auto mb-4"
              />
            </Link>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#38BDF2] text-white text-[10px] font-black mb-2 shadow-lg shadow-[#38BDF2]/20 animate-in fade-in slide-in-from-top-4 duration-700">
              <ICONS.Megaphone className="w-3 h-3 text-white" />
              <span>New: Advanced QR ticketing & analytics launched!</span>
            </div>
            <h1 className="text-[2.2rem] font-bold text-black leading-[1.1] tracking-tight mb-2 max-w-[450px]">
              {view === 'reset-password' ? 'Secure your access' :
                view === 'accept-invite' ? 'Join your team' :
                  'Empower your event business'} <span className="text-[#38BDF2]">{view === 'reset-password' ? 'instantly.' : view === 'accept-invite' ? 'today.' : 'instantly.'}</span>
            </h1>
            <p className="text-black/60 text-[13px] font-bold leading-relaxed max-w-[400px]">
              {view === 'reset-password' ? 'Set a strong password to protect your event management portal.' :
                view === 'accept-invite' ? 'Complete your profile to start collaborating with your organization.' :
                  'Trusted by over 1,000+ Filipino creators to host, manage, and sell out events.'}
            </p>

            {/* Feature Cards Group - Claymorphic Style */}
            <div className="flex flex-col gap-5 max-w-[360px] z-10 mt-8 relative items-start">
              {[
                { title: 'Create events easily', desc: 'Quickly set up and automate your event workflows.', icon: ICONS.Megaphone },
                { title: 'Manage attendees', desc: 'Track check-ins and engagement in real-time.', icon: ICONS.CheckCircle },
                { title: 'Sell tickets effortlessly', desc: 'Boost sales with seamless QR code ticketing.', icon: ICONS.Zap }
              ].map((card, i) => (
                <div key={i} className="w-full bg-[#F2F2F2] p-4 rounded-[1.2rem] border border-black/[0.02] flex items-center gap-4 transition-transform hover:scale-[1.02] shadow-[0_15px_30px_rgba(0,0,0,0.04),inset_0_-6px_12px_rgba(0,0,0,0.04),inset_0_6px_12px_rgba(255,255,255,0.9)] animate-in fade-in slide-in-from-left duration-700 cursor-default" style={{ animationDelay: `${i * 150 + 200}ms` }}>
                  <div className="w-11 h-11 rounded-[14px] bg-[#38BDF2] flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(56,189,242,0.3),inset_0_-2px_4px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.4)]">
                    <card.icon className="w-5 h-5 text-white drop-shadow-sm" />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-black text-black leading-tight mb-0.5">{card.title}</h3>
                    <p className="text-[10.5px] text-black/50 font-bold leading-tight max-w-[220px]">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Auth Forms (45%) */}
        <div className="w-full lg:w-[40%] min-h-full flex flex-col items-center justify-center lg:justify-start lg:pt-[10vh] p-8 bg-[#F2F2F2] overflow-visible relative custom-scrollbar">
          <div className="w-full max-w-[380px] py-10 lg:py-0">
            
            {/* MOBILE ONLY LOGO */}
            <div className="lg:hidden flex justify-center mb-6">
              <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
                <img
                  src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
                  alt="StartupLab"
                  className="h-16 w-auto"
                />
              </Link>
            </div>

            <div className="text-left mb-4">
              <span className="text-[#38BDF2] text-[11px] font-black mb-1.5 block">
                {view === 'login' ? 'Returning user' :
                  view === 'signup' ? 'New creator' :
                    view === 'forgot-password' ? 'Security help' :
                      view === 'reset-password' ? 'New Access' :
                        'Join Organization'}
              </span>
              <h2 className="text-2xl font-black text-black tracking-tight leading-tight mb-1">
                {view === 'login' ? 'Welcome back 👋' :
                  view === 'signup' ? 'Join StartupLab' :
                    view === 'forgot-password' ? 'Trouble signing in?' :
                      view === 'reset-password' ? 'Setup your password' :
                        (inviteInfo?.accountExists ? 'Join Organization' : 'Create your account')}
              </h2>
              <p className="text-[11px] text-black/40 font-bold max-w-[280px] leading-relaxed">
                {view === 'login' ? "Let's get your events running." :
                  view === 'signup' ? 'Scale your event business effortlessly with our tools.' :
                    view === 'forgot-password' ? "Enter your email and we'll send you a link to get back into your account." :
                      view === 'reset-password' ? 'Please enter a new password that you haven\'t used before.' :
                        `Invited as ${inviteInfo?.email || 'new member'}`}
              </p>
            </div>

            <div className="bg-[#F2F2F2] p-8 rounded-[24px] border border-black/[0.03] shadow-[0_20px_40px_rgba(0,0,0,0.05),inset_0_-8px_16px_rgba(0,0,0,0.05),inset_0_8px_16px_rgba(255,255,255,0.8)] overflow-visible">
              {view === 'login' && (
                <form onSubmit={handleLogin} className="flex flex-col gap-3 items-stretch">
                  <div className="space-y-3">
                    <div className="space-y-0.5 text-left relative">
                      <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">Email Address <span className="text-red-500">*</span></label>
                      <IconInput
                        type="email"
                        placeholder="you@domain.com"
                        value={email}
                        onChange={(e: any) => setEmail(e.target.value)}
                        required
                        icon={<EnvelopeIcon className="w-4 h-4" />}
                      />
                    </div>

                    <div className="space-y-0.5 text-left relative">
                      <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">Password <span className="text-red-500">*</span></label>
                      <PasswordInput value={password} onChange={(e: any) => setPassword(e.target.value)} required placeholder="••••••••"
                        icon={<LockIcon className="w-4 h-4" />}
                        inputClassName="!bg-[#F2F2F2] !border-black/10 !rounded-[11px] !py-2 !text-[10px] !font-medium !outline-none focus:!border-[#38BDF2] !transition-all !min-h-0" />
                      <button type="button" onClick={() => setView('forgot-password')} className="text-[11px] font-bold text-[#38BDF2] hover:underline mt-1 flex justify-end w-full">Forgot password?</button>
                    </div>
                  </div>

                  {showLoginCaptcha && (
                    <div className="flex justify-center my-2 overflow-visible">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                        onChange={(val) => setCaptchaValue(val)}
                        theme="light"
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full py-4 text-[11px] font-black rounded-[16px] border-none bg-gradient-to-r from-[#38BDF2] to-[#2DAADF] text-white shadow-[0_10px_20px_rgba(56,189,242,0.2),inset_0_-4px_8px_rgba(0,0,0,0.1),inset_0_4px_8px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all" disabled={loading}>
                    {loading ? 'Wait...' : 'Login'}
                  </Button>

                  <div className="relative my-0.5">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/5"></div></div>
                    <div className="relative flex justify-center text-[11px] font-bold text-black/20"><span className="bg-[#F2F2F2] px-3">Or continue with</span></div>
                  </div>

                  <button type="button" onClick={() => handleSocialLogin('google')} disabled={!!socialLoading}
                    className="flex items-center justify-center gap-3 w-full py-3 bg-[#F2F2F2] !border-[1px] !border-solid !border-black/[0.05] rounded-[16px] shadow-[inset_0_-2px_6px_rgba(0,0,0,0.02),inset_0_2px_6px_rgba(255,255,255,0.7),0_4px_12px_rgba(0,0,0,0.03)] hover:scale-[1.02] transition-all"
                  >
                    <ICONS.Google className="w-4 h-4" />
                    <span className="text-[11px] font-bold text-black/80">Continue with Google</span>
                  </button>

                  <p className="text-black/40 text-[10px] font-bold text-center mt-3">
                    Don't have an account? <button type="button" onClick={() => setView('signup')} className="text-[#38BDF2] hover:underline">Create account</button>
                  </p>
                </form>
              )}

              {view === 'signup' && (
                <div className="w-full" style={{ zoom: 0.8 }}>
                  <form onSubmit={handleSignup} className="flex flex-col gap-3 pb-10">
                    <div className="space-y-3">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
                    <IconInput
                      placeholder="Juan Dela Cruz"
                      required
                      value={name}
                      onChange={(e: any) => setName(e.target.value)}
                      icon={<UserIcon className="w-4 h-4" />}
                      inputClassName="!bg-[#F2F2F2] !border-black/5 !rounded-[12px] !py-2.5 !text-[14px] !font-medium"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">Email Address <span className="text-red-500">*</span></label>
                    <IconInput
                      type="email"
                      placeholder="you@domain.com"
                      required
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      icon={<EnvelopeIcon className="w-4 h-4" />}
                      inputClassName="!bg-[#F2F2F2] !border-black/5 !rounded-[12px] !py-2.5 !text-[14px] !font-medium"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">Password <span className="text-red-500">*</span></label>
                    <PasswordInput placeholder="Create password" required value={password} onChange={(e: any) => setPassword(e.target.value)}
                      icon={<LockIcon className="w-4 h-4" />}
                      inputClassName="!bg-[#F2F2F2] !border-black/5 !rounded-[12px] !py-3 !text-[14px] !font-medium !shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] !outline-none focus:!border-[#38BDF2] !transition-all" />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">Confirm Password <span className="text-red-500">*</span></label>
                    <PasswordInput placeholder="Confirm password" required value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)}
                      icon={<LockIcon className="w-4 h-4" />}
                      inputClassName="!bg-[#F2F2F2] !border-black/5 !rounded-[12px] !py-3 !text-[14px] !font-medium !shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] !outline-none focus:!border-[#38BDF2] !transition-all" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-1 bg-black/[0.01] rounded-[11px] mt-0.5">
                    <Checkbox checked={agreedToTerms} onChange={setAgreedToTerms} />
                    <span className="text-[11px] text-black/70 font-bold leading-tight">
                      I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-[#38BDF2] hover:underline">Terms of Service</button> and <button type="button" onClick={() => setShowPrivacy(true)} className="text-[#38BDF2] hover:underline">Privacy Policy</button>.
                    </span>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full py-4 text-[11px] font-black bg-[#38BDF2] rounded-[16px] border-none text-white shadow-[0_10px_20px_rgba(56,189,242,0.1),inset_0_-4px_8px_rgba(0,0,0,0.1),inset_0_4px_8px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all" 
                    disabled={loading}
                  >
                    {loading ? 'Wait...' : 'Create account'}
                  </Button>

                  <div className="relative my-0.5">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/5"></div></div>
                    <div className="relative flex justify-center text-[11px] font-bold text-black/20"><span className="bg-[#F2F2F2] px-3">Or sign up with</span></div>
                  </div>

                  <button type="button" onClick={() => handleSocialLogin('google')} disabled={!!socialLoading}
                    className="flex items-center justify-center gap-3 w-full py-3 bg-[#F2F2F2] !border-[1px] !border-solid !border-black/[0.05] rounded-[16px] shadow-[inset_0_-2px_6px_rgba(0,0,0,0.02),inset_0_2px_6px_rgba(255,255,255,0.7),0_4px_12px_rgba(0,0,0,0.03)] hover:scale-[1.02] transition-all"
                  >
                    <ICONS.Google className="w-4 h-4" />
                    <span className="text-[11px] font-bold text-black/80">Continue with Google</span>
                  </button>

                  <p className="text-black/40 text-[11px] font-bold text-center mt-1">
                    Already have an account? <button type="button" onClick={() => setView('login')} className="text-[#38BDF2] hover:underline">Sign In</button>
                  </p>
                </form>
                </div>
              )}

              {view === 'forgot-password' && (
                <div className="space-y-4">
                  {!forgotMessage ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setError('');
                        setLoading(true);
                        try {
                          const res = await fetch(`${API}/api/auth/forgot-password`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email.trim().toLowerCase() })
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            setError(data.error || 'Failed to send reset link.');
                          } else {
                            setForgotMessage('Success');
                            showToast('success', 'Reset link sent! Please check your email inbox.');
                          }
                        } catch (err) {
                          setError('Connection error. Please try again.');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="space-y-3"
                    >
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">Account Email <span className="text-red-500">*</span></label>
                        <IconInput
                          type="email"
                          placeholder="you@domain.com"
                          value={email}
                          onChange={(e: any) => setEmail(e.target.value)}
                          required
                        icon={<EnvelopeIcon className="w-4 h-4" />}
                        />
                      </div>

                      {error && (
                        <div className="p-3 bg-red-50/50 border border-red-100 rounded-[16px] flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300 shadow-[inset_0_2px_4px_rgba(255,0,0,0.02)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <p className="text-[10px] font-black text-red-600 leading-tight uppercase tracking-tight">{error}</p>
                        </div>
                      )}

                      <Button type="submit" className="w-full py-4 text-[11px] font-black bg-[#38BDF2] rounded-[16px] border-none text-white shadow-[0_10px_20px_rgba(56,189,242,0.1),inset_0_-4px_8px_rgba(0,0,0,0.1),inset_0_4px_8px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50" disabled={loading}>
                        {loading ? 'Wait...' : 'Send Link'}
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-6 bg-green-50/30 rounded-[16px] border border-green-100/50 text-[11px] font-bold text-green-600 shadow-sm">Check your email for reset instructions.</div>
                  )}
                  <button type="button" onClick={() => { setView('login'); setError(''); }} className="w-full text-center text-[11px] font-black text-black/40 hover:text-[#38BDF2] transition-colors mt-2">Back to login</button>
                </div>
              )}

              {view === 'reset-password' && (
                <div className="space-y-4">
                  {!successMessage ? (
                    <form onSubmit={handleResetPassword} className="space-y-3">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">New Password <span className="text-red-500">*</span></label>
                        <PasswordInput
                          value={password}
                          onChange={(e: any) => setPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          icon={<LockIcon className="w-4 h-4" />}
                          inputClassName="!bg-[#F2F2F2] !border-black/[0.03] !rounded-[16px] !py-3 !text-[10px] !font-medium !shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] !outline-none focus:!border-[#38BDF2] !transition-all !min-h-0"
                        />
                        <PasswordRequirements password={password} />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">Confirm New Password <span className="text-red-500">*</span></label>
                        <PasswordInput
                          value={confirmPassword}
                          onChange={(e: any) => setConfirmPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          icon={<LockIcon className="w-4 h-4" />}
                          inputClassName="!bg-[#F2F2F2] !border-black/[0.03] !rounded-[16px] !py-3 !text-[10px] !font-medium !shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] !outline-none focus:!border-[#38BDF2] !transition-all !min-h-0"
                        />
                      </div>

                      {error && (
                        <div className="p-2.5 bg-red-50 border border-red-100 rounded-[16px] flex items-center gap-2 shadow-[inset_0_2px_4px_rgba(255,0,0,0.02)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <p className="text-[10px] font-black text-red-600 leading-tight uppercase tracking-tight">{error}</p>
                        </div>
                      )}

                      <Button type="submit" className="w-full py-4 bg-[#38BDF2] rounded-[16px] font-black border-none text-white shadow-[0_10px_20px_rgba(56,189,242,0.1),inset_0_-4px_8px_rgba(0,0,0,0.1),inset_0_4px_8px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-all" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Password'}
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-4 text-[11px] font-black text-[#38BDF2]">{successMessage}</div>
                  )}
                </div>
              )}

              {view === 'accept-invite' && (
                <div className="space-y-4">
                  {!successMessage ? (
                    <form onSubmit={handleAcceptInvite} className="space-y-3">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
                        <IconInput
                          placeholder="e.g. John Doe"
                          value={name}
                          onChange={(e: any) => setName(e.target.value)}
                          required
                          icon={<UserIcon className="w-4 h-4" />}
                          inputClassName="!bg-[#F2F2F2] !border-black/5 !rounded-[12px] !py-3 !text-[14px] !font-medium"
                        />
                      </div>

                      {!inviteInfo?.accountExists && (
                        <>
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">Create Password <span className="text-red-500">*</span></label>
                            <PasswordInput
                              value={password}
                              onChange={(e: any) => setPassword(e.target.value)}
                              required
                              placeholder="••••••••"
                              icon={<LockIcon className="w-4 h-4" />}
                              inputClassName="!bg-[#F2F2F2] !border-black/5 !rounded-[12px] !py-3 !text-[14px] !font-medium !shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] !outline-none focus:!border-[#38BDF2] !transition-all"
                            />
                            <PasswordRequirements password={password} />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-black/40 ml-0.5 uppercase tracking-wider">Confirm Password <span className="text-red-500">*</span></label>
                            <PasswordInput
                              value={confirmPassword}
                              onChange={(e: any) => setConfirmPassword(e.target.value)}
                              required
                              placeholder="••••••••"
                              icon={<LockIcon className="w-4 h-4" />}
                              inputClassName="!bg-[#F2F2F2] !border-black/5 !rounded-[12px] !py-3 !text-[14px] !font-medium !shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] !outline-none focus:!border-[#38BDF2] !transition-all"
                            />
                          </div>
                        </>
                      )}

                      {error && (
                        <div className="p-2.5 bg-red-50 border border-red-100 rounded-[16px] flex items-center gap-2 shadow-[inset_0_2px_4px_rgba(255,0,0,0.02)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <p className="text-[10px] font-black text-red-600 leading-tight uppercase tracking-tight">{error}</p>
                        </div>
                      )}

                      <Button type="submit" className="w-full py-4 bg-[#38BDF2] rounded-[16px] font-black border-none text-white shadow-[0_10px_20px_rgba(56,189,242,0.1),inset_0_-4px_8px_rgba(0,0,0,0.1),inset_0_4px_8px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-all" disabled={loading}>
                        {loading ? 'Wait...' : (inviteInfo?.accountExists ? 'Join Organization' : 'Create & Join')}
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-4 text-[11px] font-black text-[#38BDF2]">{successMessage}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Terms/Privacy Overlays */}
      {(showTerms || showPrivacy) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => { setShowTerms(false); setShowPrivacy(false); }}>
          <div className="bg-[#F2F2F2] border border-black/10 rounded-[5px] w-full max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-black/5 flex justify-between items-center">
              <h3 className="text-sm font-black text-black">{showTerms ? 'Terms of Service' : 'Privacy Policy'}</h3>
              <button onClick={() => { setShowTerms(false); setShowPrivacy(false); }} className="p-2 hover:bg-black/5 rounded-[5px] transition-colors">
                <ICONS.X className="w-4 h-4 text-black" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-4 text-[11px] leading-relaxed text-black/60 font-bold">
                <p>Welcome to StartupLab. By using our services, you agree to these terms.</p>
                <div className="space-y-2">
                  <p className="text-black uppercase text-[9px] tracking-widest">General Usage</p>
                  <p>Our platform provides tools for event management, communities, and courses. You must provide accurate information when creating an account.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-black uppercase text-[9px] tracking-widest">Intellectual Property</p>
                  <p>All content provided on the platform is either owned by us or our creators. Unauthorized reproduction is strictly prohibited.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
