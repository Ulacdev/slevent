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
        <div 
            className="fixed inset-0 flex flex-col items-center justify-center px-4 overflow-hidden bg-[#F2F2F2]"
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
                className="absolute top-6 left-6 p-2 rounded-full text-[#2E2E2F]/40 hover:text-[#38BDF2] hover:bg-white shadow-sm transition-all group"
                title="Go to Home"
            >
                <ICONS.Home className="w-6 h-6" />
            </button>

            <div className="max-w-[540px] w-full relative z-10 origin-center flex flex-col items-center">
                <Card className="p-8 sm:p-10 border-[#2E2E2F]/10 border-[1.5px] flex flex-col w-full bg-[#F2F2F2] shadow-2xl rounded-xl overflow-hidden">
                    <div className="text-center flex flex-col items-center mb-6">
                        <img
                            src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/assets/assets/image%20(1).svg"
                            alt="StartupLab Business Center Logo"
                            className="mx-auto mb-3 w-[180px] h-auto"
                            style={{ objectFit: 'contain' }}
                        />
                        <p className="text-[#2E2E2F]/70 text-base font-medium">Forgot Password?</p>
                        <div className="w-16 h-1 bg-[#38BDF2] mx-auto mt-3 rounded-full"></div>
                    </div>

                    {!message ? (
                        <form onSubmit={handleResetRequest} className="flex flex-col gap-5">
                            <p className="text-[#2E2E2F]/60 text-[13px] font-medium text-center mb-1 leading-relaxed">
                                Enter your email and we'll send you a link to reset your password.
                            </p>
                            <div className="space-y-1.5 w-full">
                                <label className="block text-[10.5px] font-bold text-[#2E2E2F]/70 tracking-tight ml-1">Email Address <span className="text-red-500">*</span></label>
                                <div className="relative group/input">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2E2E2F]/40 group-focus-within/input:text-[#38BDF2] transition-all z-10">
                                        <ICONS.Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e: any) => setEmail(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl text-[#2E2E2F] placeholder-[#2E2E2F]/40 focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/40 focus:border-[#38BDF2] transition-colors font-semibold text-[14px]"
                                    />
                                </div>
                            </div>
                            <div className="mt-1">
                                <Button
                                    className="w-full py-4 text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl"
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? 'Sending link...' : 'Send Reset Link'}
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
                            <h3 className="text-xl font-black text-[#2E2E2F] mb-1 uppercase tracking-tight">Check your inbox!</h3>
                            <p className="text-[#2E2E2F]/60 font-bold text-[13px] mb-6 leading-relaxed">{message}</p>
                            <Button
                                className="w-full py-4 text-[11px] font-black uppercase tracking-widest rounded-2xl"
                                onClick={() => navigate('/login')}
                            >
                                Back to Sign In
                            </Button>
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-[#2E2E2F]/10 text-center">
                        <button
                            className="text-[#2E2E2F]/60 text-[13px] font-medium hover:text-[#38BDF2] transition-colors"
                            onClick={() => navigate('/login')}
                        >
                            Remembered password? <span className="text-[#38BDF2] font-black">Sign In</span>
                        </button>
                    </div>
                </Card>

            </div>
        </div>
    );
};
