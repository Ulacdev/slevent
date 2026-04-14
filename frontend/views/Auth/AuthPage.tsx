import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button, PasswordInput, Checkbox } from '../../components/Shared';
import { ICONS } from '../../constants';
import { supabase } from "../../supabase/supabaseClient.js";
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { UserRole, normalizeUserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { maskPassword } from '../../utils/authUtils';

const API = import.meta.env.VITE_API_BASE;

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useUser();
  const { showToast } = useToast();

  const [view, setView] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  // Sync view with URL
  useEffect(() => {
    if (location.pathname === '/signup') setView('signup');
    else if (location.pathname === '/forgot-password') setView('forgot-password');
    else setView('login');
  }, [location.pathname]);

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
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: maskPassword(password) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message || "Invalid credentials."); setLoading(false); return; }
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
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password: maskPassword(password) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message || 'Failed to register.'); setLoading(false); return; }
      showToast('success', 'Account created! Please verify email.');
      setView('login');
      setPassword(''); setEmail('');
    } catch (err) { setError('Failed to register.'); } finally { setLoading(false); }
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
      <div className="fixed inset-0 h-[100dvh] w-full flex bg-[#F2F2F2] overflow-y-auto lg:overflow-hidden font-sans select-none">
        {/* LEFT: Branding (55%) */}
        <div className="hidden lg:flex w-[55%] h-full flex-col px-10 pt-4 justify-between bg-[#F2F2F2] border-r border-black/5 relative">
          <div className="z-10 transform origin-top-left scale-[0.9] flex flex-col items-start">
            <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
              <img
                src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
                alt="StartupLab"
                className="h-[8.5rem] w-auto mb-2.5"
              />
            </Link>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#38BDF2] text-white text-[10px] font-black mb-2 shadow-lg shadow-[#38BDF2]/20 animate-in fade-in slide-in-from-top-4 duration-700">
               <ICONS.Megaphone className="w-3 h-3 text-white" />
               <span>New: Advanced QR ticketing & analytics launched!</span>
            </div>
            <h1 className="text-[3rem] font-bold text-black leading-[1.1] tracking-tight mb-2 max-w-[500px]">
              Empower your event business <span className="text-[#38BDF2]">instantly.</span>
            </h1>
            <p className="text-black/60 text-base font-medium leading-relaxed max-w-[400px]">
              The complete workspace for Pinoy creators to host events, courses, and communities.
            </p>
          </div>
        </div>

        {/* RIGHT: Auth Forms (45%) */}
        <div className="w-full lg:w-[45%] lg:h-full flex flex-col items-center justify-center p-8 bg-[#F2F2F2] overflow-y-auto relative">
          <div className="w-full max-w-[340px] transform lg:-translate-y-20">
            
            {/* MOBILE ONLY LOGO */}
            <div className="lg:hidden flex justify-center mb-6">
              <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
                <img
                  src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
                  alt="StartupLab"
                  className="h-28 w-auto"
                />
              </Link>
            </div>

            <div className="text-left mb-4">
               <span className="text-[#38BDF2] text-[11px] font-black mb-1.5 block">
                 {view === 'login' ? 'Returning user' : 'New creator'}
               </span>
               <h2 className="text-2xl font-black text-black tracking-tight leading-tight mb-1">
                 {view === 'login' ? 'Login' : 'Sign up'}
               </h2>
               <p className="text-[11px] text-black/40 font-bold max-w-[280px] leading-relaxed">
                 {view === 'login' 
                   ? 'Welcome back! Enter your details to manage your events.' 
                   : 'Join a community of Pinoy creators and start monetizing your skills.'}
               </p>
            </div>

            <div className="bg-[#F2F2F2] p-6 rounded-[5px] border border-black/10">
              {view === 'login' && (
                <form onSubmit={handleLogin} className="flex flex-col gap-3 items-stretch">
                  <div className="space-y-3">
                    <div className="space-y-0.5 text-left">
                      <label className="text-[11px] font-bold text-black/40 ml-0.5">Email address *</label>
                      <input type="email" placeholder="you@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} required 
                      className="w-full px-4 py-2.5 bg-[#F2F2F2] border border-black/10 rounded-[5px] text-[10px] font-medium text-black outline-none focus:border-[#38BDF2] transition-all" />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <label className="text-[11px] font-bold text-black/40 ml-0.5">Password *</label>
                      <PasswordInput value={password} onChange={(e: any) => setPassword(e.target.value)} required placeholder="••••••••" 
                      inputClassName="!bg-[#F2F2F2] !border-black/10 !rounded-[5px] !py-2 !text-[10px] !font-medium !outline-none focus:!border-[#38BDF2] !transition-all !min-h-0" />
                      <button type="button" onClick={() => setView('forgot-password')} className="text-[11px] font-bold text-[#38BDF2] hover:underline mt-1 flex justify-end w-full">Forgot password?</button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full py-2.5 text-[10px] font-black rounded-[5px] border-none bg-[#38BDF2] text-white" disabled={loading}>
                    {loading ? 'Wait...' : 'Sign in'}
                  </Button>

                  <div className="relative my-0.5">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/5"></div></div>
                    <div className="relative flex justify-center text-[11px] font-bold text-black/20"><span className="bg-[#F2F2F2] px-3">Or continue with</span></div>
                  </div>

                  <button type="button" onClick={() => handleSocialLogin('google')} disabled={!!socialLoading}
                    className="flex items-center justify-center gap-3 w-full py-2.5 bg-[#F2F2F2] border border-black/10 rounded-[5px] hover:bg-black/[0.04] transition-all"
                  >
                    <ICONS.Google className="w-3 h-3" />
                    <span className="text-[11px] font-bold text-black">Google account</span>
                  </button>

                  <p className="text-black/40 text-[10px] font-bold text-center mt-3">
                    Don't have an account? <button type="button" onClick={() => setView('signup')} className="text-[#38BDF2] hover:underline">Create account</button>
                  </p>
                </form>
              )}

              {view === 'signup' && (
                 <form onSubmit={handleSignup} className="flex flex-col gap-3">
                    <div className="space-y-0.5">
                      <label className="text-[11px] font-bold text-black/40 ml-0.5">Full Name *</label>
                      <input placeholder="Juan Dela Cruz" required value={name} onChange={(e) => setName(e.target.value)} 
                      className="w-full px-4 py-2.5 bg-[#F2F2F2] border border-black/10 rounded-[5px] text-[11px] font-medium text-black outline-none focus:border-[#38BDF2] transition-all" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[11px] font-bold text-black/40 ml-0.5">Email Address *</label>
                      <input type="email" placeholder="you@domain.com" required value={email} onChange={(e) => setEmail(e.target.value)} 
                      className="w-full px-4 py-2.5 bg-[#F2F2F2] border border-black/10 rounded-[5px] text-[11px] font-medium text-black outline-none focus:border-[#38BDF2] transition-all" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[11px] font-bold text-black/40 ml-0.5">Password *</label>
                      <PasswordInput placeholder="Create password" required value={password} onChange={(e: any) => setPassword(e.target.value)}
                      inputClassName="!bg-[#F2F2F2] !border-black/10 !rounded-[5px] !py-2 !text-[11px] !font-medium !outline-none focus:!border-[#38BDF2] !transition-all !min-h-0" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[11px] font-bold text-black/40 ml-0.5">Confirm Password *</label>
                      <PasswordInput placeholder="Confirm password" required value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)}
                      inputClassName="!bg-[#F2F2F2] !border-black/10 !rounded-[5px] !py-2 !text-[11px] !font-medium !outline-none focus:!border-[#38BDF2] !transition-all !min-h-0" />
                    </div>
                    <div className="flex items-center gap-2 p-1 bg-black/[0.01] rounded-[5px] mt-0.5">
                      <Checkbox checked={agreedToTerms} onChange={setAgreedToTerms} />
                      <span className="text-[11px] text-black/70 font-bold leading-tight">
                        I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-[#38BDF2] hover:underline">Terms of Service</button> and <button type="button" onClick={() => setShowPrivacy(true)} className="text-[#38BDF2] hover:underline">Privacy Policy</button>.
                      </span>
                    </div>
                    <Button type="submit" className="w-full py-2.5 text-[11px] font-black bg-[#38BDF2] rounded-[5px] border-none text-white mt-1" disabled={loading}>
                      {loading ? 'Wait...' : 'Create account'}
                    </Button>
                    
                    <div className="relative my-0.5">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/5"></div></div>
                      <div className="relative flex justify-center text-[11px] font-bold text-black/20"><span className="bg-[#F2F2F2] px-3">Or sign up with</span></div>
                    </div>

                    <button type="button" onClick={() => handleSocialLogin('google')} disabled={!!socialLoading}
                      className="flex items-center justify-center gap-3 w-full py-2.5 bg-[#F2F2F2] border border-black/10 rounded-[5px] hover:bg-black/[0.04] transition-all"
                    >
                      <ICONS.Google className="w-3 h-3" />
                      <span className="text-[11px] font-bold text-black">Google account</span>
                    </button>

                    <p className="text-black/40 text-[11px] font-bold text-center mt-1">
                      Already have an account? <button type="button" onClick={() => setView('login')} className="text-[#38BDF2] hover:underline">Sign In</button>
                    </p>
                 </form>
              )}

              {view === 'forgot-password' && (
                <div className="space-y-4">
                  {!forgotMessage ? (
                    <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); setForgotMessage('Success'); setLoading(false); }} className="space-y-3">
                      <div className="space-y-0.5">
                        <label className="text-[11px] font-bold text-black/40 ml-0.5">Account Email</label>
                        <input type="email" placeholder="you@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} required 
                        className="w-full px-4 py-2.5 bg-[#F2F2F2] border border-black/10 rounded-[5px] text-[11px] font-medium text-black outline-none focus:border-[#38BDF2] transition-all" />
                      </div>
                      <Button type="submit" className="w-full py-2.5 bg-[#38BDF2] rounded-[5px] font-black border-none text-white mt-2" disabled={loading}>Send Link</Button>
                    </form>
                  ) : (
                    <div className="text-center py-2 text-[10px] font-bold text-black">Check your email for reset instructions.</div>
                  )}
                  <button type="button" onClick={() => setView('login')} className="w-full text-center text-[11px] font-black text-black/40 hover:text-[#38BDF2] transition-colors">Back to login</button>
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
