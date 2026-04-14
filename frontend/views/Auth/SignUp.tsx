import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, PasswordInput, PasswordRequirements, Checkbox, Modal } from '../../components/Shared';
import { useToast } from '../../context/ToastContext';
import { ICONS } from '../../constants';
import { validatePassword } from '../../utils/passwordValidation';
import { supabase } from "../../supabase/supabaseClient.js";
import { maskPassword } from '../../utils/authUtils';

const API = import.meta.env.VITE_API_BASE;

export const SignUpView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

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
    } catch (err: any) {
      setSocialLoading(null);
      const msg = err.message || `Failed to sign up with ${provider}`;
      setError(msg);
      showToast('error', msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      const msg = 'Passwords do not match.';
      setError(msg);
      showToast('error', msg);
      return;
    }
    const passError = validatePassword(formData.password);
    if (passError) {
      setError(passError);
      showToast('error', passError);
      return;
    }
    if (!formData.name.trim()) {
      const msg = 'Name is required.';
      setError(msg);
      showToast('error', msg);
      return;
    }
    if (!agreedToTerms) {
      const msg = 'You must agree to the Terms of Service and Privacy Policy.';
      setError(msg);
      showToast('error', msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: maskPassword(formData.password)
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.message || 'Failed to create account.';
        setError(msg);
        showToast('error', msg);
        setIsSubmitting(false);
        return;
      }

      const msg = data.message || 'Account created. Verify your email, then continue setup.';
      showToast('success', msg);
      navigate('/login', { replace: true });
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account.';
      setError(msg);
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
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
              Join the creator revolution
            </span>
            <h1 className="text-6xl font-black text-[#2E2E2F] leading-[1.1] tracking-tight mb-8">
              Start building your <span className="text-[#38BDF2]">digital empire.</span>
            </h1>
            <p className="text-lg text-[#2E2E2F]/60 font-medium leading-relaxed max-w-[480px]">
              The all-in-one platform for Filipino creators to monetize their skills through events, courses, and communities.
            </p>
          </div>
        </div>

        {/* Feature Cards Bottom */}
        <div className="flex gap-6 mt-12">
          <div className="flex-1 p-6 bg-white rounded-3xl border border-[#2E2E2F]/10 shadow-sm">
            <h4 className="font-black text-[#2E2E2F] text-sm uppercase tracking-tight mb-2">Build once, earn forever</h4>
            <p className="text-[12px] text-[#2E2E2F]/50 leading-relaxed">Systematize your knowledge into recurring revenue streams.</p>
          </div>
          <div className="flex-1 p-6 bg-white rounded-3xl border border-[#2E2E2F]/10 shadow-sm">
            <h4 className="font-black text-[#2E2E2F] text-sm uppercase tracking-tight mb-2">Grow your tribe</h4>
            <p className="text-[12px] text-[#2E2E2F]/50 leading-relaxed">Engage with your fans and build a lasting community of learners.</p>
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
          className="absolute top-8 right-8 p-3 rounded-2xl bg-[#F2F2F2] text-[#2E2E2F] hover:bg-[#38BDF2] hover:text-white transition-all group shadow-sm z-50"
          title="Back to Home"
        >
          <ICONS.Home className="w-5 h-5" />
        </button>

        <div className="w-full max-w-[440px] pt-12 lg:pt-0">
          <div className="mb-8">
            <span className="text-[#38BDF2] text-[11px] font-black uppercase tracking-widest mb-2 block">Get Started</span>
            <h2 className="text-3xl font-black text-[#2E2E2F] tracking-tight">Create your account.</h2>
            <p className="text-[#2E2E2F]/40 text-sm font-medium mt-1">Join thousands of creators building on StartupLab.</p>
          </div>

          <div className="bg-[#F2F2F2]/50 p-6 sm:p-8 rounded-[2.5rem] border border-[#2E2E2F]/5 backdrop-blur-sm shadow-sm scale-[0.95] origin-top">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="space-y-4">
                <div className="space-y-1.5 w-full">
                  <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Full Name</label>
                  <input
                    placeholder="e.g. John Doe"
                    required
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-3.5 bg-white border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/30 focus:outline-none focus:ring-4 focus:ring-[#38BDF2]/10 focus:border-[#38BDF2] transition-all font-semibold text-sm shadow-sm"
                  />
                </div>

                <div className="space-y-1.5 w-full">
                  <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={formData.email}
                    onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-3.5 bg-white border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/30 focus:outline-none focus:ring-4 focus:ring-[#38BDF2]/10 focus:border-[#38BDF2] transition-all font-semibold text-sm shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Password</label>
                  <PasswordInput
                    placeholder="••••••••"
                    required
                    value={formData.password}
                    onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
                    className="!rounded-2xl !py-3.5 !bg-white !shadow-sm !border-[#2E2E2F]/10"
                  />
                  <PasswordRequirements password={formData.password} />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Confirm Password</label>
                  <PasswordInput
                    placeholder="••••••••"
                    required
                    value={formData.confirmPassword}
                    onChange={(e: any) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="!rounded-2xl !py-3.5 !bg-white !shadow-sm !border-[#2E2E2F]/10"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-2">
                <div className="flex items-start gap-3 px-1 group">
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

                <Button
                  type="submit"
                  className="w-full py-4 text-[14px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-[#38BDF2]/20 hover:shadow-xl transition-all border-none bg-[#38BDF2]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[11px] font-bold text-center">
                  {error}
                </div>
              )}
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2E2E2F]/10"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase font-black tracking-[0.2em] text-[#2E2E2F]/30">
                <span className="bg-[#F2F2F2] px-4">Or sign up with</span>
              </div>
            </div>

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
              <span className="text-[12px] font-bold text-[#2E2E2F]">Sign up with Google</span>
            </button>
          </div>

          <div className="mt-8 text-center space-y-3">
            <p className="text-[#2E2E2F]/60 text-[13px] font-medium">
              Already have an account?{' '}
              <button
                className="text-[#38BDF2] font-black hover:underline ml-1"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
            </p>
            <p className="text-[#2E2E2F]/40 text-[11px] font-medium">
              Need help? Contact us at <a href="mailto:hello@upskwela.com" className="hover:text-[#38BDF2] transition-colors">hello@upskwela.com</a>
            </p>
          </div>
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
      >
        <div className="space-y-6 text-[#2E2E2F] text-[13px] leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[10px] tracking-widest mb-2">1. Acceptance of Terms</h4>
            <p>By creating an account on StartupLab Business Center, you agree to abide by these terms. Our platform provides event ticketing and management services for organizers and attendees.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[10px] tracking-widest mb-2">2. Organizer Responsibilities</h4>
            <p>Organizers are responsible for the accuracy of event details, ticket pricing, and fulfillment of event promises. StartupLab acts as a facilitator and is not liable for event cancellations or modifications.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[10px] tracking-widest mb-2">3. Fees and Payments</h4>
            <p>Our platform may charge service fees per ticket sold. These fees are non-refundable unless otherwise stated in specific event policies. Payment processing is handled by secure third-party gateways.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[10px] tracking-widest mb-2">4. Prohibited Content</h4>
            <p>Users may not post illegal, fraudulent, or harmful content. We reserve the right to suspend accounts that violate our community standards or engage in suspicious activity.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[10px] tracking-widest mb-2">5. Limitation of Liability</h4>
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
      >
        <div className="space-y-6 text-[#2E2E2F] text-[13px] leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[10px] tracking-widest mb-2">1. Data Collection</h4>
            <p>We collect personal information such as name, email, and billing details to process registrations and maintain your organizer profile. We also collect usage data to improve our platform experience.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[10px] tracking-widest mb-2">2. How We Use Data</h4>
            <p>Your information is used to facilitate ticket sales, send transactional emails, and provide customer support. We do not sell your personal data to third-party advertisers.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[10px] tracking-widest mb-2">3. Data Sharing</h4>
            <p>Attendee data is shared with the specific event organizer for check-in and event communication purposes. Metadata may be shared with our payment processors to ensure secure transactions.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[10px] tracking-widest mb-2">4. Security Measures</h4>
            <p>We implement industry-standard encryption and security protocols to protect your data from unauthorized access. However, no internet transmission is 100% secure.</p>
          </section>

          <section>
            <h4 className="font-bold text-[#2E2E2F] uppercase text-[10px] tracking-widest mb-2">5. Your Rights</h4>
            <p>You have the right to access, update, or delete your personal information at any time through your account settings or by contacting our support team.</p>
          </section>
        </div>
      </Modal>
    </div>
  );
};
