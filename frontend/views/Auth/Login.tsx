import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, PasswordInput } from '../../components/Shared';
import { ICONS } from '../../constants';
import { supabase } from "../../supabase/supabaseClient.js";
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { UserRole, normalizeUserRole } from '../../types';

const API = import.meta.env.VITE_API_BASE;

export const LoginPerspective: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError || !data.session) {
      setLoading(false);
      const msg = loginError?.message || "Incorrect email or password.";
      setError(msg);
      showToast('error', msg);
      return;
    }
    const roleRes = await fetch(`${API}/api/user/role-by-email?email=${encodeURIComponent(email)}`);
    if (!roleRes.ok) {
      setLoading(false);
      const msg = 'Account not found or not authorized.';
      setError(msg);
      showToast('error', msg);
      return;
    }
    const userData = await roleRes.json().catch(() => null);
    const normalizedRole = normalizeUserRole(userData?.role);
    if (!normalizedRole) {
      setLoading(false);
      const msg = 'Account not found or not authorized.';
      setError(msg);
      showToast('error', msg);
      return;
    }
    const isOnboarded = !!userData?.isOnboarded;
    setUser({ userId: data.user.id, role: normalizedRole, email, isOnboarded });
    const { access_token, refresh_token } = data.session;
    const response = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ access_token, refresh_token })
    });
    if (!response.ok) {
      setLoading(false);
      const result = await response.json().catch(() => ({}));
      const msg = result.message || "Failed to store session";
      setError(msg);
      showToast('error', msg);
      return;
    }
    localStorage.removeItem("sb-ddkkbtijqrgpitncxylx-auth-token");
    const user = data.user;
    if (!user?.email_confirmed_at) {
      setLoading(false);
      showToast('info', 'Please confirm your email address if you haven\'t already.');
      await supabase.auth.signOut();
      return;
    }

    setLoading(false);
    // User is confirmed, we can show a welcome if we want, but user said "only toast message no redirect... only happen if already confirm"
    // Wait, "only happen [redirect] if already confirm" 
    // So if confirmed, WE REDIRECT.
    showToast('success', 'Welcome back!');
    if (normalizedRole === UserRole.ADMIN) {
      navigate('/dashboard');
    } else if (normalizedRole === UserRole.STAFF) {
      navigate('/events');
    } else if (normalizedRole === UserRole.ORGANIZER) {
      if (isOnboarded) {
        navigate('/user-home');
      } else {
        navigate('/onboarding');
      }
    } else if (normalizedRole === UserRole.ATTENDEE) {
      navigate('/browse-events');
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
        className="absolute top-6 left-6 p-2 rounded-full text-[#2E2E2F]/40 hover:text-[#38BDF2] hover:bg-white shadow-sm transition-all group"
        title="Go to Home"
      >
        <ICONS.Home className="w-6 h-6" />
      </button>

      <div className="max-w-[540px] w-full relative z-10 origin-center flex flex-col items-center" style={{ zoom: 0.8 }}>
        <Card className="p-8 sm:p-10 border-[#2E2E2F]/10 border-[1.5px] flex flex-col w-full bg-[#F2F2F2] shadow-2xl rounded-xl overflow-hidden">
          <div className="text-center flex flex-col items-center mb-6">
            <img
              src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
              alt="StartupLab Business Center Logo"
              className="mx-auto mb-3 w-[180px] h-auto"
              style={{ objectFit: 'contain' }}
            />
            <p className="text-[#2E2E2F]/70 text-base font-medium">Sign in to your account</p>
            <div className="w-16 h-1 bg-[#38BDF2] mx-auto mt-3 rounded-full"></div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="space-y-4">
                <div className="space-y-1.5 w-full">
                  <label className="block text-[10.5px] font-bold text-[#2E2E2F]/70 tracking-tight ml-1">Email Address <span className="text-red-500">*</span></label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2E2E2F]/40 group-focus-within/input:text-[#38BDF2] transition-colors z-10">
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
                  <label className="block text-[10.5px] font-bold text-[#2E2E2F]/70 tracking-tight ml-1">Password <span className="text-red-500">*</span></label>
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

          <div className="mt-6 pt-6 border-t border-[#2E2E2F]/10 text-center">
            <p className="text-[#2E2E2F]/60 text-[13px] font-medium">
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




