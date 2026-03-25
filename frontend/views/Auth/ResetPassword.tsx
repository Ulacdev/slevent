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
            const errMsg = err.message || "Failed to update password. Link may be expired.";
            setError(errMsg);
            showToast('error', errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center px-4 overflow-hidden bg-[#F2F2F2]">
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
                        <p className="text-[#2E2E2F]/70 text-base font-medium">Reset Password</p>
                        <div className="w-16 h-1 bg-[#38BDF2] mx-auto mt-3 rounded-full"></div>
                    </div>

                    {!message ? (
                        <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                             <div className="space-y-4">
                                 <div className="space-y-1.5 w-full">
                                     <label className="block text-[10.5px] font-bold text-[#2E2E2F]/70 tracking-tight ml-1">New Password <span className="text-red-500">*</span></label>
                                     <PasswordInput
                                         placeholder="••••••••"
                                         value={password}
                                         onChange={(e: any) => setPassword(e.target.value)}
                                         required
                                         icon={<ICONS.Lock className="w-5 h-5" />}
                                         className="!rounded-2xl"
                                     />
                                 </div>
                                 <PasswordRequirements password={password} />
                                 <div className="space-y-1.5 w-full">
                                     <label className="block text-[10.5px] font-bold text-[#2E2E2F]/70 tracking-tight ml-1">Confirm New Password <span className="text-red-500">*</span></label>
                                     <PasswordInput
                                         placeholder="••••••••"
                                         value={confirmPassword}
                                         onChange={(e: any) => setConfirmPassword(e.target.value)}
                                         required
                                         icon={<ICONS.Lock className="w-5 h-5" />}
                                         className="!rounded-2xl"
                                         hideEye
                                     />
                                 </div>
                             </div>
                            <div className="mt-1">
                                <Button
                                    className="w-full py-4 text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl"
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? 'Updating password...' : 'Update Password'}
                                </Button>
                            </div>
                            {error && (
                                <div className="mt-1 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[11px] font-bold text-center">
                                    {error}
                                </div>
                            )}
                        </form>
                    ) : (
                        <div className="text-center py-4 px-2 animate-in zoom-in-95 duration-500">
                            <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500 text-white shadow-xl shadow-green-500/30 rotate-3 transition-transform">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-xl font-black text-[#2E2E2F] mb-1 uppercase tracking-tight">PASSWORD UPDATED!</h3>
                            <p className="text-[#2E2E2F]/60 font-bold text-[13px] mb-6 leading-relaxed">{message}</p>
                            <div className="flex items-center justify-center gap-2 text-[#38BDF2] font-black text-[10px] uppercase tracking-widest">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#38BDF2] animate-ping" />
                                Redirecting to login...
                            </div>
                        </div>
                    )}
                </Card>

            </div>
        </div>
    );
};
