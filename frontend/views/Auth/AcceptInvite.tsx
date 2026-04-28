import React, { useState } from 'react';
import { maskPassword } from '../../utils/authUtils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, Input, PasswordInput } from '../../components/Shared';
import { ICONS } from '../../constants';
export const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token') || '';
  const token = rawToken.trim().replace(/[?.,;:!]+$/, '');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE;

  const [inviteInfo, setInviteInfo] = useState<{ email: string; role: string; accountExists: boolean; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`${API}/api/invite/check-invite?token=${token}`);
        if (!res.ok) throw new Error('Invite not found');
        const data = await res.json();
        setInviteInfo(data);
        if (data.name) setName(data.name);
      } catch (err: any) {
        setError(err.message || 'Invalid or expired invite');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchInfo();
    else setLoading(false);
  }, [token, API]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    const needsPassword = !inviteInfo?.accountExists;
    if (needsPassword) {
      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match');
        return;
      }
    }

    const res = await fetch(`${API}/api/invite/accept-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token, 
        password: needsPassword ? maskPassword(password) : undefined, 
        name: name.trim() 
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to accept invitation');
      return;
    }
    setSuccess(needsPassword ? 'Account created! Redirecting...' : 'Organization joined! Redirecting...');
    setTimeout(() => {
        if (inviteInfo?.accountExists) navigate('/login');
        else navigate('/login');
    }, 2000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F2F2F2]"><div className="w-12 h-12 border-4 border-[#38BDF2] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen flex bg-white overflow-hidden relative">
      <div className="w-full flex flex-col relative overflow-y-auto bg-[#F2F2F2] scrollbar-none">
        <div className="min-h-full flex flex-col items-center justify-center p-8 sm:p-12 w-full relative">
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
            className="absolute top-8 right-8 p-3 rounded-2xl bg-white/50 text-[#2E2E2F] hover:bg-[#38BDF2] hover:text-white transition-all group shadow-sm"
            title="Back to Home"
          >
            <ICONS.Home className="w-5 h-5" />
          </button>

          {/* Decorative side elements (Only visible on Desktop) */}
          <div className="hidden lg:block absolute left-12 top-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none">
            <ICONS.Zap className="w-64 h-64 text-[#2E2E2F]" />
          </div>
          <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none">
            <ICONS.Calendar className="w-64 h-64 text-[#2E2E2F]" />
          </div>

          <Card className="p-10 w-full max-w-[540px] bg-white border border-[#2E2E2F]/10 rounded-[2.5rem] shadow-2xl mb-12 lg:-translate-y-24">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-[#2E2E2F] mb-1 tracking-tight">
                    {inviteInfo?.accountExists ? 'Join Organization' : `Become a ${inviteInfo?.role || 'Staff'}`}
                </h2>
                <p className="text-[11px] font-black text-[#38BDF2] uppercase tracking-widest">
                    Invited as {inviteInfo?.email}
                </p>
            </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5 w-full">
            <label className="block text-[10.5px] font-bold text-[#2E2E2F]/70 tracking-tight ml-1">Full Name <span className="text-red-500">*</span></label>
            <div className="relative group/input">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2E2E2F]/40 group-focus-within/input:text-[#38BDF2] transition-colors z-10">
                <ICONS.Users className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. John Doe"
                className="w-full pl-12 pr-4 py-3 bg-[#F2F2F2] border border-[#2E2E2F]/20 rounded-xl text-[#2E2E2F] placeholder-[#2E2E2F]/40 focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/40 focus:border-[#38BDF2] transition-colors font-semibold text-[14px]"
              />
            </div>
          </div>

          {!inviteInfo?.accountExists && (
            <>
              <div className="space-y-1.5 w-full">
                <label className="block text-[10.5px] font-bold text-[#2E2E2F]/70 tracking-tight ml-1">New Password <span className="text-red-500">*</span></label>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  icon={<ICONS.Lock className="w-5 h-5" />}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5 w-full">
                <label className="block text-[10.5px] font-bold text-[#2E2E2F]/70 tracking-tight ml-1">Confirm Password <span className="text-red-500">*</span></label>
                <PasswordInput
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  icon={<ICONS.Lock className="w-5 h-5" />}
                  className="w-full"
                />
              </div>
            </>
          )}

          {error && <div className="mt-1 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[11px] font-bold text-center">{error}</div>}
          {success && <div className="mt-1 p-3 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-[11px] font-bold text-center">{success}</div>}
          
          <Button type="submit" className="w-full py-4 text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl">
            {inviteInfo?.accountExists ? 'Join Now' : 'Create & Join'}
          </Button>
        </form>
      </Card>
        </div>
      </div>
    </div>
  );
};

