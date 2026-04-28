import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, PasswordInput, PasswordRequirements } from '../../components/Shared';
import { supabase } from "../../supabase/supabaseClient.js";
import { ICONS } from '../../constants';
import { useToast } from '../../context/ToastContext';
import { validatePassword } from '../../utils/passwordValidation';

const parseResetParams = (): URLSearchParams => {
    const merged = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;

    const segments = hash.split('#').filter(Boolean);
    for (const segment of segments) {
        const queryPart = segment.includes('?') ? segment.split('?').slice(1).join('?') : segment;
        if (!queryPart.includes('=')) continue;
        const params = new URLSearchParams(queryPart);
        params.forEach((value, key) => {
            if (!merged.has(key)) merged.set(key, value);
        });
    }

    return merged;
};

const clearResetUrlTokens = () => {
    window.history.replaceState({}, document.title, `${window.location.pathname}#/reset-password`);
};

export const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const resetParams = useMemo(() => parseResetParams(), []);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [recoveryVerified, setRecoveryVerified] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        const passError = validatePassword(password);
        if (passError) {
          setError(passError);
          showToast('error', passError);
          return;
        }

        setLoading(true);
        setError('');

        try {
            if (!recoveryVerified) {
                const tokenHash = resetParams.get('token_hash');
                const accessToken = resetParams.get('access_token');
                const refreshToken = resetParams.get('refresh_token');
                const code = resetParams.get('code');

                if (tokenHash) {
                    const { error: verifyErr } = await supabase.auth.verifyOtp({
                        type: 'recovery',
                        token_hash: tokenHash,
                    });
                    if (verifyErr) throw verifyErr;
                } else if (accessToken && refreshToken) {
                    const { error: sessionErr } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (sessionErr) throw sessionErr;
                } else if (code) {
                    const { error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
                    if (codeErr) throw codeErr;
                } else {
                    throw new Error('Reset link is invalid or expired. Please request a new one.');
                }

                setRecoveryVerified(true);
            }

            const { error: resetError } = await supabase.auth.updateUser({
                password: password
            });

            if (resetError) throw resetError;

            clearResetUrlTokens();
            const msg = 'Your password has been successfully updated.';
            setMessage(msg);
            showToast('success', msg);
            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err: any) {
            let errMsg = err.message || "Failed to update password. Link may be expired.";
            if (errMsg.toLowerCase().includes('expired') || errMsg.toLowerCase().includes('fetch')) {
                errMsg = "This reset link has expired. Please request a new one.";
            }
            setError(errMsg);
            showToast('error', errMsg);
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
              Account Restoration
            </span>
            <h1 className="text-6xl font-black text-[#2E2E2F] leading-[1.1] tracking-tight mb-8">
              Update your <span className="text-[#38BDF2]">security credentials.</span>
            </h1>
            <p className="text-lg text-[#2E2E2F]/60 font-medium leading-relaxed max-w-[480px]">
              Set a strong, unique password to ensure your account remains protected and your business continues to flourish.
            </p>
          </div>
        </div>

        {/* Feature Cards Bottom */}
        <div className="flex gap-6 mt-12">
          <div className="flex-1 p-6 bg-white rounded-3xl border border-[#2E2E2F]/10 shadow-sm">
            <h4 className="font-black text-[#2E2E2F] text-sm uppercase tracking-tight mb-2">Stronger Security</h4>
            <p className="text-[12px] text-[#2E2E2F]/50 leading-relaxed">Our system verifies password strength in real-time for your protection.</p>
          </div>
          <div className="flex-1 p-6 bg-white rounded-3xl border border-[#2E2E2F]/10 shadow-sm">
            <h4 className="font-black text-[#2E2E2F] text-sm uppercase tracking-tight mb-2">Session Shield</h4>
            <p className="text-[12px] text-[#2E2E2F]/50 leading-relaxed">Any other active sessions will be reviewed for maximum security.</p>
          </div>
        </div>

        {/* Decorative Absolutes */}
        <ICONS.Zap className="absolute bottom-24 right-12 w-64 h-64 text-[#38BDF2] opacity-[0.03] rotate-12" />
      </div>

      {/* RIGHT COLUMN: Auth Form */}
      <div className="w-full lg:w-[40%] flex flex-col relative overflow-y-auto bg-white scrollbar-none">
        <div className="min-h-full flex flex-col items-center justify-center p-8 sm:p-12 w-full">
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

          <div className="w-full max-w-[420px] pb-12 lg:-translate-y-24">
            <div className="mb-10">
            <span className="text-[#38BDF2] text-[11px] font-black uppercase tracking-widest mb-2 block">New Access</span>
            <h2 className="text-3xl font-black text-[#2E2E2F] tracking-tight">Setup your new password.</h2>
            <p className="text-[#2E2E2F]/40 text-sm font-medium mt-1">Please enter a new password that you haven't used before.</p>
          </div>

          <div className="bg-[#F2F2F2]/50 p-8 rounded-[2.5rem] border border-[#2E2E2F]/5 backdrop-blur-sm shadow-sm">
            {!message ? (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">New Password</label>
                    <PasswordInput
                      placeholder="••••••••"
                      value={password}
                      onChange={(e: any) => setPassword(e.target.value)}
                      required
                      className="!rounded-2xl !py-4 !bg-white !shadow-sm !border-[#2E2E2F]/10"
                    />
                    <PasswordRequirements password={password} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-[#2E2E2F] uppercase tracking-widest ml-1 opacity-60">Confirm New Password</label>
                    <PasswordInput
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e: any) => setConfirmPassword(e.target.value)}
                      required
                      className="!rounded-2xl !py-4 !bg-white !shadow-sm !border-[#2E2E2F]/10"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full py-5 text-[14px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-[#38BDF2]/20 hover:shadow-xl transition-all border-none bg-[#38BDF2]"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Updating password...' : 'Update Password'}
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
                <h3 className="text-2xl font-black text-[#2E2E2F] mb-2 tracking-tight leading-tight">Password Updated!</h3>
                <p className="text-[#2E2E2F]/60 font-medium text-sm mb-8 leading-relaxed">{message}</p>
                <div className="flex items-center justify-center gap-2 text-[#38BDF2] font-black text-[11px] uppercase tracking-widest bg-[#38BDF2]/5 py-3 rounded-2xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#38BDF2] animate-ping" />
                  Redirecting to login...
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
