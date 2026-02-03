
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../../components/Shared';
import { ICONS } from '../../constants';
import { UserRole } from '../../types';

export const SignUpView: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API registration delay
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Account created successfully! Redirecting to login...');
      navigate('/login');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center px-4">
      <div className="max-w-xl w-full py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-[#003E86] tracking-tighter mb-3">
            Join <span className="text-[#38BDF2]">StartupLab</span>
          </h1>
          <p className="text-[#2E2E2F]/70 text-lg font-medium">Create your professional portal account</p>
        </div>

        <Card className="p-10 bg-[#F2F2F2] border border-[#3768A2]/20 rounded-[3rem]">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Perspective Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.3em] ml-1">Select Perspective</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole(UserRole.ADMIN)}
                  className={`py-4 rounded-2xl border-2 font-bold text-sm transition-colors flex flex-col items-center gap-2 ${
                    role === UserRole.ADMIN 
                    ? 'border-[#003E86] bg-[#38BDF2]/10 text-[#003E86]' 
                    : 'border-[#3768A2]/20 text-[#2E2E2F]/50 hover:border-[#003E86]/40 hover:text-[#003E86]'
                  }`}
                >
                  <ICONS.Layout className="w-5 h-5" />
                  Administrator
                </button>
                <button
                  type="button"
                  onClick={() => setRole(UserRole.STAFF)}
                  className={`py-4 rounded-2xl border-2 font-bold text-sm transition-colors flex flex-col items-center gap-2 ${
                    role === UserRole.STAFF 
                    ? 'border-[#3768A2] bg-[#3768A2]/15 text-[#003E86]' 
                    : 'border-[#3768A2]/20 text-[#2E2E2F]/50 hover:border-[#003E86]/40 hover:text-[#003E86]'
                  }`}
                >
                  <ICONS.CheckCircle className="w-5 h-5" />
                  Event Staff
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <Input 
                label="Full Name" 
                placeholder="e.g. Jordan Miller" 
                required
                className="py-4 px-6 rounded-2xl bg-[#F2F2F2] border-[#3768A2]/30 focus:border-[#003E86]"
                value={formData.name}
                onChange={(e: any) => setFormData({...formData, name: e.target.value})}
              />
              <Input 
                label="Professional Email" 
                type="email"
                placeholder="j.miller@organization.com" 
                required
                className="py-4 px-6 rounded-2xl bg-[#F2F2F2] border-[#3768A2]/30 focus:border-[#003E86]"
                value={formData.email}
                onChange={(e: any) => setFormData({...formData, email: e.target.value})}
              />
              <Input 
                label="Organization" 
                placeholder="Company or Entity Name" 
                required
                className="py-4 px-6 rounded-2xl bg-[#F2F2F2] border-[#3768A2]/30 focus:border-[#003E86]"
                value={formData.company}
                onChange={(e: any) => setFormData({...formData, company: e.target.value})}
              />
              <Input 
                label="Password" 
                type="password"
                placeholder="••••••••" 
                required
                className="py-4 px-6 rounded-2xl bg-[#F2F2F2] border-[#3768A2]/30 focus:border-[#003E86]"
                value={formData.password}
                onChange={(e: any) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <Button 
              type="submit"
              className={`w-full py-5 text-base font-black uppercase tracking-widest rounded-2xl transition-colors ${
                role === UserRole.ADMIN ? 'bg-[#003E86] text-[#F2F2F2] hover:bg-[#3768A2]' : 'bg-[#3768A2] text-[#F2F2F2] hover:bg-[#003E86]'
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Provisioning...' : 'Initialize Account'}
            </Button>

            <p className="text-center text-[#2E2E2F]/60 text-xs font-medium">
              By initializing, you agree to our <a href="#" className="text-[#003E86] font-bold hover:underline">Executive Terms</a>
            </p>
          </form>
        </Card>

        <div className="mt-8 text-center">
          <button 
            className="text-[#2E2E2F]/60 hover:text-[#003E86] transition-colors text-sm font-bold flex items-center justify-center gap-2 mx-auto"
            onClick={() => navigate('/login')}
          >
            Already have an account? <span className="text-[#003E86] hover:underline">Login to Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
