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
    <div
      className="min-h-screen flex items-center justify-center bg-[#F2F2F2] px-4 overflow-hidden relative"
      style={{ zoom: 0.8 }}
    >
      {/* Decorative side elements */}
      <div className="hidden lg:block absolute left-12 top-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none">
        <ICONS.Zap className="w-64 h-64 text-[#2E2E2F]" />
      </div>
      <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none">
        <ICONS.Calendar className="w-64 h-64 text-[#2E2E2F]" />
      </div>
      <Card className="p-10 w-full max-w-[540px] bg-[#F2F2F2] border border-[#2E2E2F]/20 rounded-xl origin-center shadow-2xl">
        <div className="mb-8">
            <h2 className="text-2xl font-black text-[#2E2E2F] mb-1">
                {inviteInfo?.accountExists ? 'Join Organization' : `Become a ${inviteInfo?.role || 'Staff'}`}
            </h2>
            <p className="text-[11px] font-bold text-[#2E2E2F]/50 uppercase tracking-widest">
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
  );
};

