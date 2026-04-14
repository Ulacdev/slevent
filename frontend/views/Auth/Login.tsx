import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, PasswordInput } from '../../components/Shared';
import { ICONS } from '../../constants';
import { supabase } from "../../supabase/supabaseClient.js";
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { UserRole, normalizeUserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { maskPassword } from '../../utils/authUtils';

const API = import.meta.env.VITE_API_BASE;

export const LoginPerspective: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  // Handle OAuth redirect results
  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !loading) {
        // If we have a session but no user set in context, sync with backend
        handleLoginSuccess(session.user, session);
      }
    };
    checkSession();
  }, []);

  const handleLoginSuccess = async (user: any, session: any) => {
    try {
      setLoading(true);
      // Fetch enriched profile from our backend JIT whoAmI
      // The backend uses the session tokens to identify the user and set cookies
      const profileRes = await apiService._fetch(`${API}/api/whoAmI`, { cache: 'no-store' });
      const profile = await profileRes.json().catch(() => ({}));

      const normalizedRole = normalizeUserRole(profile?.role || 'ORGANIZER');
      const isOnboarded = !!profile?.isOnboarded;

      setUser({
        userId: user.id || user.userId, // Support both formats
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

      if (!user.email_confirmed_at && user.app_metadata?.provider === 'email') {
        const isEmailConfirmed = !!user.email_confirmed_at;
        if (!isEmailConfirmed) {
          setLoading(false);
          showToast('info', 'Please confirm your email address first.');
          return;
        }
      }

      setLoading(false);
      showToast('success', 'Logged in successfully!');

      // Redirect based on role
      if (normalizedRole === UserRole.ADMIN) navigate('/dashboard');
      else if (normalizedRole === UserRole.STAFF) navigate('/events');
      else if (normalizedRole === UserRole.ORGANIZER) navigate(isOnboarded ? '/user-home' : '/onboarding');
      else if (normalizedRole === UserRole.ATTENDEE) navigate('/browse-events');
    } catch (err) {
      setLoading(false);
      showToast('error', 'Failed to synchronize session.');
    }
  };

  const handleSocialLogin = async (provider: 'facebook' | 'apple' | 'google') => {
    setError('');
    setSocialLoading(provider);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/#/login`
        }
      });

      if (authError) throw authError;
      // Redirect happens automatically
    } catch (err: any) {
      setSocialLoading(null);
      const msg = err.message || `Failed to sign in with ${provider}`;
      setError(msg);
      showToast('error', msg);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 🚀 Using backend login with masked password for payload obfuscation
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password: maskPassword(password) 
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoading(false);
        const msg = data.message || "Incorrect email or password.";
        setError(msg);
        showToast('error', msg);
        return;
      }

      if (data.user && data.session) {
        // 🔥 Synchronize Supabase JS Client with backend-generated session tokens
        // This ensures subsequent client-side Supabase calls work as expected
        const { error: syncError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });

        if (syncError) {
           console.warn("[Auth] Failed to sync session in client client:", syncError.message);
        }

        await handleLoginSuccess(data.user, data.session);
      } else {
        throw new Error("Auth session missing in server response");
      }
    } catch (err: any) {
      console.error("[Auth] Login error:", err);
      setLoading(false);
      setError("Unable to connect to security server.");
      showToast('error', 'Connection error.');
    }
  };

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      {/* LEFT COLUMN: Branding & Value Prop (Hidden on Mobile) */}
      <div className="hidden lg:flex w-[60%] bg-[#F2F2F2] flex-col relative p-16 justify-between border-r border-[#2E2E2F]/10">
        <div>
          {/* Logo Section */}
          <div className="flex items-center gap-3 mb-12">
            <img
              src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
              alt="StartupLab Logo"
              className="w-48 h-auto"
              style={{ objectFit: 'contain' }}
            />
          </div>

          <div className="max-w-[540px]">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#38BDF2]/10 text-[#38BDF2] text-[10px] font-black uppercase tracking-widest mb-6 border border-[#38BDF2]/20">
              Built for creators, mentors, and communities
            </span>
            <h1 className="text-6xl font-black text-[#2E2E2F] leading-[1.1] tracking-tight mb-8">
              Turn your expertise into <span className="text-[#38BDF2]">steady income.</span>
            </h1>
            <p className="text-lg text-[#2E2E2F]/60 font-medium leading-relaxed max-w-[480px]">
              Launch memberships, courses, paid events, and digital offers in one place, with local payments that work for Filipino creators.
            </p>
          </div>
        </div>

        {/* Feature Cards Bottom */}
        <div className="flex gap-6 mt-12">
          <div className="flex-1 p-6 bg-white rounded-3xl border border-[#2E2E2F]/10 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-black text-[#2E2E2F] text-sm uppercase tracking-tight mb-2">Teach with structure</h4>
            <p className="text-[12px] text-[#2E2E2F]/50 leading-relaxed">Bring your audience into courses, live sessions, and private communities.</p>
          </div>
          <div className="flex-1 p-6 bg-white rounded-3xl border border-[#2E2E2F]/10 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-black text-[#2E2E2F] text-sm uppercase tracking-tight mb-2">Get paid locally</h4>
            <p className="text-[12px] text-[#2E2E2F]/50 leading-relaxed">Accept GCash and Maya while keeping your offers simple to manage.</p>
          </div>
        </div>

        {/* Decorative Absolutes */}
        <ICONS.Zap className="absolute bottom-24 right-12 w-64 h-64 text-[#38BDF2] opacity-[0.03] rotate-12" />
      </div>

      {/* RIGHT COLUMN: Auth Form */}
      <div className="w-full lg:w-[40%] flex flex-col items-center justify-center p-8 sm:p-12 relative overflow-y-auto bg-white">
        {/* Mobile Logo Only */}
        <div className="lg:hidden absolute top-8 left-8">
          <img
            src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
            alt="StartupLab Logo"
            className="w-32 h-auto"
          />
        </div>

        <button
          onClick={() => navigate('/')}
          className="absolute top-8 right-8 p-3 rounded-2xl bg-[#F2F2F2] text-[#2E2E2F] hover:bg-[#38BDF2] hover:text-white transition-all group shadow-sm"
          title="Back to Home"
        >
          <ICONS.Home className="w-5 h-5" />
        </button>

        <div className="w-full max-w-[420px]">
          <div className="mb-10 lg:mt-0 mt-12">
            <span className="text-[#38BDF2] text-[11px] font-black uppercase tracking-widest mb-2 block">Welcome back</span>
            <h2 className="text-3xl font-black text-[#2E2E2F] tracking-tight">Log in to continue building.</h2>
            <p className="text-[#2E2E2F]/40 text-sm font-medium mt-1">Access your community, courses, and creator tools from one account.</p>
          </div>

          <div className="bg-[#F2F2F2]/50 p-8 rounded-[2.5rem] border border-[#2E2E2F]/5 backdrop-blur-sm">
            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Email address or username</label>
                  <div className="relative group">
                    <input
                      type="email"
                      placeholder="john@example.com or username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-white border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/30 focus:outline-none focus:ring-4 focus:ring-[#38BDF2]/10 focus:border-[#38BDF2] transition-all font-semibold text-sm shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest opacity-60">Password</label>
                  </div>
                  <div className="relative">
                    <PasswordInput
                      value={password}
                      onChange={(e: any) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className="!rounded-2xl !py-4 !bg-white !shadow-sm !border-[#2E2E2F]/10"
                    />
                    <div className="flex justify-end mt-2 px-1">
                      <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        className="text-[11px] font-bold text-[#38BDF2] hover:text-[#2E2E2F] transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full py-5 text-[14px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-[#38BDF2]/20 hover:shadow-xl hover:shadow-[#38BDF2]/30 transition-all border-none bg-[#38BDF2]"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : 'Login'}
                </Button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[11px] font-bold text-center leading-relaxed">
                  {error}
                </div>
              )}
            </form>

            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2E2E2F]/10"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase font-black tracking-[0.2em] text-[#2E2E2F]/30">
                <span className="bg-[#F2F2F2] px-4">Or continue with</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {}} // Placeholder for Send Login Link if exists
                className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-[#2E2E2F]/5 rounded-2xl hover:bg-white hover:border-[#38BDF2]/40 transition-all shadow-sm group"
              >
                <ICONS.Mail className="w-4 h-4 text-[#2E2E2F]/40" />
                <span className="text-[12px] font-bold text-[#2E2E2F]">Send Login Link</span>
              </button>

              <button
                onClick={() => handleSocialLogin('google')}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-[#2E2E2F]/5 rounded-2xl hover:bg-white hover:border-[#38BDF2]/40 transition-all shadow-sm group disabled:opacity-50"
              >
                {socialLoading === 'google' ? (
                  <div className="w-4 h-4 border-2 border-[#4285F4]/20 border-t-[#4285F4] rounded-full animate-spin" />
                ) : (
                  <ICONS.Google className="w-4 h-4 group-hover:scale-110 transition-transform" />
                )}
                <span className="text-[12px] font-bold text-[#2E2E2F]">Continue with Google</span>
              </button>

              <button
                onClick={() => handleSocialLogin('apple')}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-[#2E2E2F]/5 rounded-2xl hover:bg-white hover:border-[#38BDF2]/40 transition-all shadow-sm group disabled:opacity-50"
              >
                <ICONS.Apple className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[12px] font-bold text-[#2E2E2F]">Continue with Apple</span>
              </button>
            </div>
          </div>

          <div className="mt-10 text-center space-y-3">
            <p className="text-[#2E2E2F]/60 text-[13px] font-medium">
              Don't have an account?{' '}
              <button
                className="text-[#38BDF2] font-black hover:underline ml-1"
                onClick={() => navigate('/signup')}
              >
                Sign up here for free
              </button>
            </p>
            <p className="text-[#2E2E2F]/40 text-[11px] font-medium">
              Need help? Contact us at <a href="mailto:hello@upskwela.com" className="hover:text-[#38BDF2] transition-colors">hello@upskwela.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
