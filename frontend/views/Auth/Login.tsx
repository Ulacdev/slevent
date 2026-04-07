import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, PasswordInput } from '../../components/Shared';
import { ICONS } from '../../constants';
import { supabase } from "../../supabase/supabaseClient.js";
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { UserRole, normalizeUserRole } from '../../types';
import { apiService } from '../../services/apiService';

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
        userId: user.id, 
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
        setLoading(false);
        showToast('info', 'Please confirm your email address first.');
        return;
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
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) {
        setLoading(false);
        const msg = loginError.message || "Incorrect email or password.";
        setError(msg);
        showToast('error', msg);
        return;
      }

      if (data.user && data.session) {
        await handleLoginSuccess(data.user, data.session);
      } else {
        throw new Error("Auth session missing");
      }
    } catch (err: any) {
      setLoading(false);
      setError("Unable to connect to security server.");
      showToast('error', 'Connection error.');
    }
  };

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center py-4 px-[5px] overflow-y-auto bg-[#F2F2F2]"
    >
      {/* Decorative side elements */}
      <div className="hidden lg:block absolute left-12 top-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none">
        <ICONS.Zap className="w-64 h-64 text-[#2E2E2F]" />
      </div>
      <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none">
        <ICONS.Calendar className="w-64 h-64 text-[#2E2E2F]" />
      </div>

      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 p-2 rounded-full text-[#2E2E2F] hover:text-[#38BDF2] hover:bg-white shadow-sm transition-all group"
        title="Go to Home"
      >
        <ICONS.Home className="w-6 h-6" />
      </button>

      <div className="max-w-[540px] w-full relative z-10 origin-center flex flex-col items-center" style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}>
        <Card className="p-8 sm:p-10 border-[#2E2E2F]/10 border-[1.5px] flex flex-col w-full bg-[#F2F2F2] shadow-2xl rounded-xl overflow-hidden">
          <div className="text-center flex flex-col items-center mb-6">
            <img
              src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
              alt="StartupLab Business Center Logo"
              className="mx-auto mb-3 w-[180px] h-auto"
              style={{ objectFit: 'contain' }}
            />
            <p className="text-[#2E2E2F] text-base font-medium">Sign in to your account</p>
            <div className="w-16 h-1 bg-[#38BDF2] mx-auto mt-3 rounded-full"></div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="space-y-4">
                <div className="space-y-1.5 w-full">
                  <label className="block text-[10.5px] font-bold text-[#2E2E2F] tracking-tight ml-1">Email Address <span className="text-red-500">*</span></label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2E2E2F] group-focus-within/input:text-[#38BDF2] transition-colors z-10">
                      <ICONS.Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      placeholder="e.g. you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/40 focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/40 focus:border-[#38BDF2] transition-colors font-semibold text-[14px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10.5px] font-bold text-[#2E2E2F] tracking-tight ml-1">Password <span className="text-red-500">*</span></label>
                  <div className="space-y-2">
                    <PasswordInput
                      value={password}
                      onChange={(e: any) => setPassword(e.target.value)}
                      required
                      icon={<ICONS.Lock className="w-5 h-5" />}
                      className="!rounded-2xl"
                    />
                    <div className="flex justify-end pr-1">
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

              <div className="mt-1">
                <Button
                  className="w-full py-4 text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Signing you in...' : 'Sign In'}
                </Button>
              </div>

            {error && (
              <div className="mt-1 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[11px] font-bold text-center">
                {error}
              </div>
            )}
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2E2E2F]/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-[#F2F2F2] px-4 text-[#2E2E2F]/40">Or continue with</span>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={!!socialLoading}
              title="Sign in with Google"
              className="w-full flex items-center justify-center gap-3 py-4 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl hover:bg-black/5 hover:border-[#38BDF2]/40 transition-all shadow-sm group disabled:opacity-50"
            >
              {socialLoading === 'google' ? (
                <div className="w-5 h-5 border-2 border-[#4285F4]/20 border-t-[#4285F4] rounded-full animate-spin" />
              ) : (
                <ICONS.Google className="w-5 h-5 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-[13px] font-black text-[#2E2E2F]">Continue with Google</span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-[#2E2E2F]/10 text-center">
            <p className="text-[#2E2E2F] text-[13px] font-medium">
              Don't have an account?{' '}
              <button
                className="text-[#38BDF2] font-black hover:text-[#2E2E2F] transition-colors ml-1"
                onClick={() => navigate('/signup')}
              >
                Create Account
              </button>
            </p>
          </div>
        </Card>

      </div>
    </div>
  );
};




