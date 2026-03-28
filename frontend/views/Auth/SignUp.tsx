import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, PasswordInput, PasswordRequirements, Checkbox, Modal } from '../../components/Shared';
import { useToast } from '../../context/ToastContext';
import { ICONS } from '../../constants';
import { validatePassword } from '../../utils/passwordValidation';

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
          password: formData.password
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
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center py-4 px-[5px] overflow-y-auto bg-[#F2F2F2]"
      style={{ zoom: 0.8 }}
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

      <div className="max-w-[540px] w-full relative z-10 origin-center flex flex-col items-center">
        <Card className="p-6 sm:p-10 border-[#2E2E2F]/10 border-[1.5px] flex flex-col w-full bg-[#F2F2F2] shadow-2xl rounded-xl overflow-hidden">
          <div className="text-center flex flex-col items-center mb-2">
            <img
              src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
              alt="StartupLab Business Center Logo"
              className="mx-auto mb-2 w-[160px] h-auto"
              style={{ objectFit: 'contain' }}
            />
            <p className="text-[#2E2E2F] text-[14px] font-medium">Create your account</p>
            <div className="w-16 h-1 bg-[#38BDF2] mx-auto mt-2 rounded-full"></div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-3">
              <div className="space-y-1 w-full">
                <label className="block text-[10.5px] font-bold text-[#2E2E2F] tracking-tight ml-1">Full Name <span className="text-red-500">*</span></label>
                <div className="relative group/input">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2E2E2F] group-focus-within/input:text-[#38BDF2] transition-colors z-10">
                    <ICONS.Users className="w-4 h-4" />
                  </div>
                  <input
                    placeholder="e.g. John Doe"
                    required
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-11 pr-4 py-2 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/40 focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/40 focus:border-[#38BDF2] transition-colors font-semibold text-[13px]"
                  />
                </div>
              </div>

              <div className="space-y-1 w-full">
                <label className="block text-[10.5px] font-bold text-[#2E2E2F] tracking-tight ml-1">Email <span className="text-red-500">*</span></label>
                <div className="relative group/input">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2E2E2F] group-focus-within/input:text-[#38BDF2] transition-colors z-10">
                    <ICONS.Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={formData.email}
                    onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-2 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/40 focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/40 focus:border-[#38BDF2] transition-colors font-semibold text-[13px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10.5px] font-bold text-[#2E2E2F] tracking-tight ml-1">Password <span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  <PasswordInput
                    placeholder="••••••••"
                    required
                    value={formData.password}
                    onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
                    icon={<ICONS.Lock className="w-4 h-4" />}
                    className="!rounded-2xl"
                  />
                  <PasswordRequirements password={formData.password} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10.5px] font-bold text-[#2E2E2F] tracking-tight ml-1">Confirm Password <span className="text-red-500">*</span></label>
                <PasswordInput
                  placeholder="••••••••"
                  required
                  value={formData.confirmPassword}
                  onChange={(e: any) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  icon={<ICONS.Lock className="w-4 h-4" />}
                  className="!rounded-2xl"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-start gap-3 px-1 group">
                <Checkbox
                  checked={agreedToTerms}
                  onChange={setAgreedToTerms}
                />
                <span className="text-[11px] text-[#2E2E2F] font-medium leading-relaxed mt-0.5">
                  I agree to the{' '}
                  <button 
                    type="button"
                    onClick={() => setShowTermsModal(true)} 
                    className="text-[#38BDF2] font-bold hover:underline"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button 
                    type="button"
                    onClick={() => setShowPrivacyModal(true)} 
                    className="text-[#38BDF2] font-bold hover:underline"
                  >
                    Privacy Policy
                  </button>.
                </span>
              </div>

              <Button
                type="submit"
                className="w-full py-4 text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>

            {error && (
              <div className="mt-1 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[11px] font-bold text-center">
                {error}
              </div>
            )}
          </form>

          <div className="mt-5 pt-5 border-t border-[#2E2E2F]/10 text-center">
            <p className="text-[#2E2E2F] text-[12px] font-medium">
              Already have an account?{' '}
              <button
                className="text-[#38BDF2] font-black hover:text-[#2E2E2F] transition-colors ml-1"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
            </p>
          </div>
        </Card>

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




