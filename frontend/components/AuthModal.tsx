import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, PasswordInput, PasswordRequirements, Checkbox, Modal } from './Shared';
import { ICONS } from '../constants';
import { supabase } from "../supabase/supabaseClient.js";
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { UserRole, normalizeUserRole } from '../types';
import { validatePassword } from '../utils/passwordValidation';
import { apiService } from '../services/apiService';
import { maskPassword } from '../utils/authUtils';

const API = import.meta.env.VITE_API_BASE;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'signup' | 'forgot-password';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialView = 'login' }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot-password'>(initialView);
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup States
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const handleSocialAuth = async (provider: 'google' | 'facebook' | 'apple') => {
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (authError) throw authError;
    } catch (err: any) {
      setError(err.message || `Failed to connect to ${provider}.`);
      showToast('error', `${provider} Auth Error`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setError('');
      setForgotMessage('');
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  const handleLoginSuccess = async (user: any, session: any) => {
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

      setLoading(false);
      showToast('success', 'Logged in successfully!');
      onClose();

      if (normalizedRole === UserRole.ADMIN) navigate('/dashboard');
      else if (normalizedRole === UserRole.STAFF) navigate('/events');
      else if (normalizedRole === UserRole.ORGANIZER) navigate(isOnboarded ? '/user-home' : '/onboarding');
      else if (normalizedRole === UserRole.ATTENDEE) navigate('/browse-events');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
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
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const passError = validatePassword(signupData.password);
    if (passError) {
      setError(passError);
      showToast('error', passError);
      return;
    }
    if (!signupData.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!agreedToTerms) {
      setError('You must agree to the terms.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupData.name.trim(),
          email: signupData.email.trim().toLowerCase(),
          password: maskPassword(signupData.password)
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.message || 'Failed to create account.';
        setError(msg);
        showToast('error', msg);
        return;
      }

      showToast('success', data.message || 'Account created. Verify your email to continue.');
      setView('login');
      setEmail(signupData.email);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setForgotMessage('');
    setError('');

    try {
      const response = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.message || 'Failed to send reset link');

      const msg = 'Check your email for the password reset link.';
      setForgotMessage(msg);
      showToast('success', msg);
    } catch (err: any) {
      const errMsg = err.message || "An error occurred. Please try again.";
      setError(errMsg);
      showToast('error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-w-[480px] w-full relative origin-center animate-in zoom-in-95 slide-in-from-bottom-4 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white p-8 sm:p-12 border border-[#2E2E2F]/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] rounded-[3rem] overflow-hidden relative">
          <button
            onClick={onClose}
            className="absolute top-8 right-8 p-3 rounded-2xl bg-[#F2F2F2] text-[#2E2E2F] hover:bg-[#38BDF2] hover:text-white transition-all group shadow-sm z-50"
          >
            <ICONS.X className="w-5 h-5" />
          </button>

          {/* Header Section */}
          <div className="text-center mb-10 pt-2">
            <img
              src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
              alt="Logo"
              className="mx-auto mb-8 w-44 h-auto"
              style={{ objectFit: 'contain' }}
            />
            {view === 'login' && (
              <div className="space-y-1">
                <span className="text-[#38BDF2] text-[10px] font-black uppercase tracking-[0.2em] block mb-2">Authenticated Access</span>
                <h2 className="text-3xl font-black text-[#2E2E2F] tracking-tight">Welcome back.</h2>
                <p className="text-[#2E2E2F]/40 text-sm font-medium">Log in to manage your offerings.</p>
              </div>
            )}
            {view === 'signup' && (
              <div className="space-y-1">
                <span className="text-[#38BDF2] text-[10px] font-black uppercase tracking-[0.2em] block mb-2">Creator Journey</span>
                <h2 className="text-3xl font-black text-[#2E2E2F] tracking-tight">Create account.</h2>
                <p className="text-[#2E2E2F]/40 text-sm font-medium">Join our network of Filipino experts.</p>
              </div>
            )}
            {view === 'forgot-password' && (
              <div className="space-y-1">
                <span className="text-[#38BDF2] text-[10px] font-black uppercase tracking-[0.2em] block mb-2">Security Hub</span>
                <h2 className="text-3xl font-black text-[#2E2E2F] tracking-tight">Reset password.</h2>
                <p className="text-[#2E2E2F]/40 text-sm font-medium">Enter email to recover access.</p>
              </div>
            )}
          </div>

          <div className="bg-[#F2F2F2]/50 p-6 sm:p-8 rounded-[2.5rem] border border-[#2E2E2F]/5 relative">
            {view === 'login' && (
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div className="space-y-4">
                  <div className="space-y-2 w-full text-left">
                    <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-white border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/30 focus:outline-none focus:ring-4 focus:ring-[#38BDF2]/10 focus:border-[#38BDF2] transition-all font-semibold text-sm shadow-sm"
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Password</label>
                    <PasswordInput
                      value={password}
                      onChange={(e: any) => setPassword(e.target.value)}
                      required
                      placeholder="Enter password"
                      className="!rounded-2xl !py-4 !bg-white !shadow-sm !border-[#2E2E2F]/10 !text-sm"
                    />
                    <div className="flex justify-end pr-1">
                      <button
                        type="button"
                        onClick={() => setView('forgot-password')}
                        className="text-[11px] font-bold text-[#38BDF2] hover:text-[#2E2E2F] transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full py-5 text-[14px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-[#38BDF2]/20 hover:shadow-xl transition-all border-none bg-[#38BDF2]"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                  </Button>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#2E2E2F]/10"></div>
                  </div>
                  <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]/30">
                    <span className="bg-[#F2F2F2] px-3">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSocialAuth('google')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-[#2E2E2F]/5 rounded-2xl hover:bg-white hover:border-[#38BDF2]/40 transition-all shadow-sm group disabled:opacity-50"
                >
                  <ICONS.Google className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[12px] font-bold text-[#2E2E2F]">Google Account</span>
                </button>

                <div className="mt-4 pt-6 border-t border-[#2E2E2F]/5 text-center">
                  <p className="text-[#2E2E2F]/60 text-[13px] font-medium">
                    New here?{' '}
                    <button
                      type="button"
                      className="text-[#38BDF2] font-black hover:underline ml-1"
                      onClick={() => setView('signup')}
                    >
                      Join now for free
                    </button>
                  </p>
                </div>
              </form>
            )}

            {view === 'signup' && (
              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <div className="space-y-4 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
                  <div className="space-y-1.5 w-full text-left">
                    <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Full Name</label>
                    <input
                      placeholder="e.g. John Doe"
                      required
                      value={signupData.name}
                      onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                      className="w-full px-5 py-3.5 bg-white border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/30 focus:outline-none focus:ring-4 focus:ring-[#38BDF2]/10 focus:border-[#38BDF2] transition-all font-semibold text-sm shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5 w-full text-left">
                    <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Email Address</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      className="w-full px-5 py-3.5 bg-white border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/30 focus:outline-none focus:ring-4 focus:ring-[#38BDF2]/10 focus:border-[#38BDF2] transition-all font-semibold text-sm shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Password</label>
                    <PasswordInput
                      placeholder="••••••••"
                      required
                      value={signupData.password}
                      onChange={(e: any) => setSignupData({ ...signupData, password: e.target.value })}
                      className="!rounded-2xl !py-3.5 !bg-white !shadow-sm !border-[#2E2E2F]/10 !text-sm"
                    />
                    <PasswordRequirements password={signupData.password} />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Confirm Password</label>
                    <PasswordInput
                      placeholder="••••••••"
                      required
                      value={signupData.confirmPassword}
                      onChange={(e: any) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      className="!rounded-2xl !py-3.5 !bg-white !shadow-sm !border-[#2E2E2F]/10 !text-sm"
                    />
                  </div>

                  <div className="flex items-start gap-3 px-1 mt-6">
                    <Checkbox
                      checked={agreedToTerms}
                      onChange={setAgreedToTerms}
                    />
                    <span className="text-[11px] text-[#2E2E2F] font-medium leading-relaxed">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-[#38BDF2] font-black hover:underline"
                      >
                        Terms
                      </button>
                      {' '}and{' '}
                      <button
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        className="text-[#38BDF2] font-black hover:underline"
                      >
                        Privacy Policy
                      </button>.
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full py-5 text-[14px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-[#38BDF2]/20 hover:shadow-xl transition-all border-none bg-[#38BDF2]"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </div>

                <div className="pt-6 border-t border-[#2E2E2F]/5 text-center">
                  <button
                    type="button"
                    className="text-[#2E2E2F]/60 text-[13px] font-medium hover:text-[#38BDF2] transition-colors"
                    onClick={() => setView('login')}
                  >
                    Already have an account? <span className="text-[#38BDF2] font-black hover:underline">Sign In</span>
                  </button>
                </div>
              </form>
            )}

            {view === 'forgot-password' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {!forgotMessage ? (
                  <form onSubmit={handleForgotRequest} className="flex flex-col gap-6">
                    <p className="text-[#2E2E2F]/60 text-[13px] font-medium text-center leading-relaxed">
                      Enter your email and we'll send you a secure link to reset your password.
                    </p>
                    <div className="space-y-2 w-full text-left">
                      <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Registered Email</label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        className="w-full px-5 py-4 bg-white border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/30 focus:outline-none focus:ring-4 focus:ring-[#38BDF2]/10 focus:border-[#38BDF2] transition-all font-semibold text-sm shadow-sm"
                      />
                    </div>
                    <Button
                      className="w-full py-5 text-[14px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-[#38BDF2]/20 hover:shadow-xl transition-all border-none bg-[#38BDF2]"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? 'Sending link...' : 'Send Recovery Link'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setView('login')}
                      className="text-[12px] font-black text-[#2E2E2F]/40 hover:text-[#38BDF2] transition-colors"
                    >
                      Return to Sign In
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-4 px-2">
                    <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-[#38BDF2] text-white shadow-xl shadow-[#38BDF2]/30 rotate-3 transition-transform">
                      <ICONS.Check className="w-10 h-10" strokeWidth={4} />
                    </div>
                    <h3 className="text-2xl font-black text-[#2E2E2F] mb-2 tracking-tight">Recovery Sent.</h3>
                    <p className="text-[#2E2E2F]/60 font-medium text-sm mb-8 leading-relaxed">
                      Check your inbox for a link to securely reset your password.
                    </p>
                    <Button
                      className="w-full py-4 text-[12px] font-black uppercase tracking-widest rounded-2xl"
                      onClick={() => setView('login')}
                    >
                      Back to Login
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[11px] font-bold text-center leading-relaxed animate-in shake duration-300">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Terms of Service Modal */}
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terms of Service"
        subtitle="Last updated: March 2026"
        size="lg"
        zIndex={20000}
        zoom
      >
        <div className="space-y-6 text-[#2E2E2F] text-[13px] leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[13px] tracking-widest mb-2">1. Acceptance of Terms</h4>
            <p>By creating an account on StartupLab Business Center, you agree to abide by these terms. Our platform provides event ticketing and management services for organizers and attendees.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[13px] tracking-widest mb-2">2. Organizer Responsibilities</h4>
            <p>Organizers are responsible for the accuracy of event details, ticket pricing, and fulfillment of event promises. StartupLab acts as a facilitator and is not liable for event cancellations or modifications.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[13px] tracking-widest mb-2">3. Fees and Payments</h4>
            <p>Our platform may charge service fees per ticket sold. These fees are non-refundable unless otherwise stated in specific event policies. Payment processing is handled by secure third-party gateways.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[13px] tracking-widest mb-2">4. Prohibited Content</h4>
            <p>Users may not post illegal, fraudulent, or harmful content. We reserve the right to suspend accounts that violate our community standards or engage in suspicious activity.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[13px] tracking-widest mb-2">5. Limitation of Liability</h4>
            <p>StartupLab shall not be held liable for any indirect, incidental, or consequential damages resulting from the use of our ticketing services or platform downtime.</p>
          </section>
        </div>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Privacy Policy"
        subtitle="How we protect your data"
        size="lg"
        zIndex={20000}
        zoom
      >
        <div className="space-y-6 text-[#2E2E2F] text-[13px] leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[13px] tracking-widest mb-2">1. Data Collection</h4>
            <p>We collect personal information such as name, email, and billing details to process registrations and maintain your organizer profile. We also collect usage data to improve our platform experience.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[13px] tracking-widest mb-2">2. How We Use Data</h4>
            <p>Your information is used to facilitate ticket sales, send transactional emails, and provide customer support. We do not sell your personal data to third-party advertisers.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[13px] tracking-widest mb-2">3. Data Sharing</h4>
            <p>Attendee data is shared with the specific event organizer for check-in and event communication purposes. Metadata may be shared with our payment processors to ensure secure transactions.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[13px] tracking-widest mb-2">4. Security Measures</h4>
            <p>We implement industry-standard encryption and security protocols to protect your data from unauthorized access. However, no internet transmission is 100% secure.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[13px] tracking-widest mb-2">5. Your Rights</h4>
            <p>You have the right to access, update, or delete your personal information at any time through your account settings or by contacting our support team.</p>
          </section>
        </div>
      </Modal>
    </div>
  );
};
