import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, Input } from '../../components/Shared';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    const res = await fetch(`${API}/api/invite/accept-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, name: name.trim() })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Invalid or expired invite');
      return;
    }
    setSuccess('Account created! You can now log in.');
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F2] px-4">
      <Card className="p-10 w-full max-w-md bg-[#F2F2F2] border border-[#2E2E2F]/20 rounded-[2.5rem]">
        <h2 className="text-2xl font-black mb-6 text-[#2E2E2F]">Complete Your Account</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
          {error && <div className="text-[#2E2E2F] text-sm font-bold">{error}</div>}
          {success && <div className="text-[#2E2E2F] text-sm font-bold">{success}</div>}
          <Button type="submit" className="w-full">Set Password</Button>
        </form>
      </Card>
    </div>
  );
};
