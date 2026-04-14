import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../../components/Shared';
import { ICONS } from '../../constants';

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const API = import.meta.env.VITE_API_BASE;
            const response = await fetch(`${API}/api/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || result.message || 'Failed to send reset link');
            }

            setMessage('Check your email for the password reset link.');
        } catch (err: any) {
            setError(err.message || "An error occurred. Please try again.");
        } finally {
            setLoading(false);
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
              Identity & Security
            </span>
            <h1 className="text-6xl font-black text-[#2E2E2F] leading-[1.1] tracking-tight mb-8">
              Keep your account <span className="text-[#38BDF2]">safe and accessible.</span>
            </h1>
            <p className="text-lg text-[#2E2E2F]/60 font-medium leading-relaxed max-w-[480px]">
              We use industry-standard encryption and recovery protocols to ensure you never lose access to your creator tools.
            </p>
          </div>
        </div>

        {/* Feature Cards Bottom */}
        <div className="flex gap-6 mt-12">
          <div className="flex-1 p-6 bg-white rounded-3xl border border-[#2E2E2F]/10 shadow-sm">
            <h4 className="font-black text-[#2E2E2F] text-sm uppercase tracking-tight mb-2">Secure Recovery</h4>
            <p className="text-[12px] text-[#2E2E2F]/50 leading-relaxed">Multi-factor ready and secure email verification for all resets.</p>
          </div>
          <div className="flex-1 p-6 bg-white rounded-3xl border border-[#2E2E2F]/10 shadow-sm">
            <h4 className="font-black text-[#2E2E2F] text-sm uppercase tracking-tight mb-2">Real-time alerts</h4>
            <p className="text-[12px] text-[#2E2E2F]/50 leading-relaxed">Get notified instantly of any sensitive changes to your account.</p>
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
            <span className="text-[#38BDF2] text-[11px] font-black uppercase tracking-widest mb-2 block">Trouble signing in?</span>
            <h2 className="text-3xl font-black text-[#2E2E2F] tracking-tight">Reset your password.</h2>
            <p className="text-[#2E2E2F]/40 text-sm font-medium mt-1">We'll send you a secure link to enter a new password safely.</p>
          </div>

          <div className="bg-[#F2F2F2]/50 p-8 rounded-[2.5rem] border border-[#2E2E2F]/5 backdrop-blur-sm shadow-sm">
            {!message ? (
              <form onSubmit={handleResetRequest} className="flex flex-col gap-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Registered email address</label>
                  <input
                    type="email"
                    placeholder="e.g. you@example.com"
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                    required
                    className="w-full px-5 py-4 bg-white border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/30 focus:outline-none focus:ring-4 focus:ring-[#38BDF2]/10 focus:border-[#38BDF2] transition-all font-semibold text-sm shadow-sm"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full py-5 text-[14px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-[#38BDF2]/20 hover:shadow-xl transition-all border-none bg-[#38BDF2]"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Sending link...' : 'Send Reset Link'}
                  </Button>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[11px] font-bold text-center">
                    {error}
                  </div>
                )}
              </form>
            ) : (
              <div className="text-center py-4 px-2 animate-in zoom-in-95 duration-500">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-[#38BDF2] text-white shadow-xl shadow-[#38BDF2]/30 rotate-3 transition-transform">
                  <ICONS.Check className="w-10 h-10" strokeWidth={4} />
                </div>
                <h3 className="text-2xl font-black text-[#2E2E2F] mb-2 tracking-tight leading-tight">Link Sent!</h3>
                <p className="text-[#2E2E2F]/60 font-medium text-sm mb-8 leading-relaxed">
                  We've sent a recovery link to <span className="text-[#2E2E2F] font-bold">{email}</span>. Please check your inbox (and spam folder) to proceed.
                </p>
                <Button
                  className="w-full py-4 text-[12px] font-black uppercase tracking-widest rounded-2xl"
                  onClick={() => navigate('/login')}
                >
                  Return to Login
                </Button>
              </div>
            )}
          </div>

          <div className="mt-10 text-center">
            <button
              className="text-[#2E2E2F]/60 text-[13px] font-medium hover:text-[#38BDF2] transition-colors"
              onClick={() => navigate('/login')}
            >
              Remembered password? <span className="text-[#38BDF2] font-black hover:underline cursor-pointer">Sign In</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
