
import React, { useState } from 'react';
import { Card, Button, Input, Badge, Modal } from '../../components/Shared';
import { ICONS } from '../../constants';
import { UserRole } from '../../types';
import { apiService } from '../../services/apiService';

const API_BASE = import.meta.env.VITE_API_BASE;

// Refined granular permissions for staff as per developer brief
type PermissionCategory = 'view_events' | 'edit_events' | 'manual_checkin';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  perspective: UserRole;
  status: 'Active' | 'Inactive' | 'Pending';
  isOwner?: boolean;
  permissions: PermissionCategory[];
}

export const SettingsView: React.FC = () => {
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'team' | 'permission' | 'payment' | 'workflow'>('team');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  React.useEffect(() => {
    fetch(`${API_BASE}/api/users/all`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const mapped = Array.isArray(data)
          ? data.map(u => ({
              id: u.userId,
              name: u.name || '',
              email: u.email,
              role: u.role || '',
              perspective: u.role === 'STAFF' ? UserRole.STAFF : UserRole.ADMIN,
              permissions: [
                ...(u.canViewEvents ? ['view_events'] : []),
                ...(u.canEditEvents ? ['edit_events'] : []),
                ...(u.canManualCheckIn ? ['manual_checkin'] : [])
              ],
            }))
          : [];
        const sorted = mapped.sort((a, b) => {
          const aIsAdmin = a.perspective === UserRole.ADMIN;
          const bIsAdmin = b.perspective === UserRole.ADMIN;
          if (aIsAdmin === bIsAdmin) return a.name.localeCompare(b.name);
          return aIsAdmin ? -1 : 1;
        });
        setTeamMembers(sorted);
      });
  }, []);

  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'STAFF',
    perspective: UserRole.STAFF,
    permissions: ['view_events'] as PermissionCategory[]
  });

  const toggleMemberPermission = async (memberId: string, perm: PermissionCategory) => {
    const target = teamMembers.find(m => m.id === memberId && m.perspective === UserRole.STAFF);
    if (!target) return;
    const hasPerm = target.permissions.includes(perm);
    const nextPerms = hasPerm
      ? target.permissions.filter(p => p !== perm)
      : [...target.permissions, perm];

    // Optimistic update
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, permissions: nextPerms } : m));

    const payload = {
      canViewEvents: nextPerms.includes('view_events'),
      canEditEvents: nextPerms.includes('edit_events'),
      canManualCheckIn: nextPerms.includes('manual_checkin'),
    };

    try {
      await apiService.updateUserPermissions(memberId, payload);
    } catch (err) {
      // rollback on failure
      setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, permissions: target.permissions } : m));
      console.error('Failed to update permissions', err);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = inviteData.email.split('@')[0] || inviteData.email;
    const res = await fetch(`${API_BASE}/api/invite/create-and-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: inviteData.email,
        role: UserRole.STAFF,
      })
    });
    if (!res.ok) {
      return;
    }
    const newMember: TeamMember = {
      id: Math.random().toString(36).substr(2, 9),
      name: displayName,
      email: inviteData.email,
      role: 'STAFF',
      perspective: UserRole.STAFF,
      status: 'Pending',
      permissions: inviteData.permissions
    };
    setTeamMembers(prev => [...prev, newMember]);
    setInviteData({ email: '', role: 'STAFF', perspective: UserRole.STAFF, permissions: ['view_events'] });
    setIsInviteModalOpen(false);
    setNotification({ message: 'Invitation sent successfully.', type: 'success' });
  };

  const PermissionShield: React.FC<{ active?: boolean, onClick?: () => void, disabled?: boolean }> = ({ active = false, onClick, disabled = false }) => (
    <button 
      type="button"
      onClick={disabled ? undefined : onClick}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
        disabled 
          ? 'text-[#2E2E2F]/40 bg-[#F2F2F2] cursor-not-allowed opacity-60' 
          : active 
            ? 'text-[#F2F2F2] bg-[#003E86]' 
            : 'text-[#2E2E2F]/40 bg-[#F2F2F2] hover:bg-[#38BDF2]/10 hover:text-[#003E86]'
      }`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </button>
  );

  return (
    <div className="space-y-10 pb-20">
      {notification && (
        <div className="fixed top-24 right-8 z-[120]">
          <Card className={`flex items-center gap-4 px-6 py-4 rounded-2xl border ${
            notification.type === 'success' ? 'bg-[#38BDF2]/20 border-[#38BDF2]/40 text-[#003E86]' : 'bg-[#2E2E2F]/10 border-[#2E2E2F]/30 text-[#2E2E2F]'
          }`}>
            <div className={`p-2 rounded-xl ${notification.type === 'success' ? 'bg-[#38BDF2]/10 text-[#003E86]' : 'bg-[#2E2E2F]/20 text-[#2E2E2F]'}`}>
              {notification.type === 'success' ? <ICONS.CheckCircle className="w-5 h-5" /> : <ICONS.Layout className="w-5 h-5" />}
            </div>
            <p className="font-bold text-sm tracking-tight">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="ml-4 text-[#2E2E2F]/60 hover:text-[#003E86] text-lg font-black">&times;</button>
          </Card>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#003E86] tracking-tighter">Organizational Settings</h1>
          <p className="text-[#2E2E2F]/70 font-medium text-sm mt-1 text-balance">Configure organizational parameters and visualize system architecture.</p>
        </div>
        <div className="flex bg-[#F2F2F2] p-1 rounded-2xl border border-[#3768A2]/20 self-start md:self-auto shrink-0">
          {[
            { id: 'team', label: 'Team' },
            { id: 'permission', label: 'Access Control' },
            { id: 'payment', label: 'HitPay Engine' },
            { id: 'workflow', label: 'System Workflow' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === tab.id ? 'bg-[#003E86] text-[#F2F2F2]' : 'text-[#2E2E2F]/60 hover:text-[#003E86]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-[11px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.3em]">Executive Directory</h3>
               <Button size="md" className="rounded-xl px-4 py-2" onClick={() => setIsInviteModalOpen(true)}>
                 <span className="text-[13px] font-black uppercase tracking-widest flex items-center gap-2">
                   <ICONS.Users className="w-3.5 h-3.5" />
                   Invite Associate
                 </span>
               </Button>
            </div>
            <Card className="overflow-hidden border-[#3768A2]/20 rounded-[2.5rem] bg-[#F2F2F2]">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#F2F2F2] border-b border-[#3768A2]/20">
                    <tr>
                      <th className="px-10 py-6 text-[9px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em]">Full Name / Identity</th>
                      <th className="px-10 py-6 text-[9px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em]">Position</th>
                                          </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3768A2]/10">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-[#38BDF2]/10 transition-colors group">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[#F2F2F2] text-lg ${member.isOwner ? 'bg-[#003E86]' : 'bg-[#3768A2]'}`}>
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <div className="font-black text-[#003E86] text-[15px] tracking-tight">{member.name}</div>
                                {member.isOwner && (
                                  <div className="bg-[#003E86] text-[#F2F2F2] text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">owner</div>
                                )}
                              </div>
                              <div className="text-[12px] text-[#2E2E2F]/60 font-bold tracking-tight">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="text-[13px] font-black text-[#003E86] uppercase tracking-widest">{member.role}</div>
                           <div className="text-[10px] font-bold text-[#2E2E2F]/60 uppercase tracking-[0.2em] mt-1">{member.perspective} HUB</div>
                        </td>
                                              </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'permission' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-[11px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.3em]">Personnel Access Matrix</h3>
               <Badge type="info" className="font-black text-[9px] tracking-widest uppercase bg-[#38BDF2]/20 text-[#003E86]">LIMIT STAFF CAPABILITIES</Badge>
            </div>
            <Card className="overflow-hidden border-[#3768A2]/20 rounded-[2.5rem] bg-[#F2F2F2]">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#F2F2F2] border-b border-[#3768A2]/20">
                    <tr>
                      <th className="px-10 py-6 text-[9px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em]">Personnel Name</th>
                      <th className="px-6 py-6 text-[9px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em] text-center">View Events</th>
                      <th className="px-6 py-6 text-[9px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em] text-center">Edit Events</th>
                      <th className="px-6 py-6 text-[9px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em] text-center">Manual Check-in</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3768A2]/10">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-[#38BDF2]/10 transition-colors group">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[#F2F2F2] text-sm ${member.isOwner ? 'bg-[#003E86]' : 'bg-[#3768A2]'}`}>
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className="font-black text-[#003E86] text-[14px] tracking-tight">{member.name}</div>
                              </div>
                              <div className="text-[10px] text-[#2E2E2F]/60 font-black uppercase tracking-widest">{member.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex justify-center">
                            <PermissionShield active={member.permissions.includes('view_events')} disabled={member.perspective === UserRole.ADMIN} onClick={() => toggleMemberPermission(member.id, 'view_events')} />
                          </div>
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex justify-center">
                            <PermissionShield active={member.permissions.includes('edit_events')} disabled={member.perspective === UserRole.ADMIN} onClick={() => toggleMemberPermission(member.id, 'edit_events')} />
                          </div>
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex justify-center">
                            <PermissionShield active={member.permissions.includes('manual_checkin')} disabled={member.perspective === UserRole.ADMIN} onClick={() => toggleMemberPermission(member.id, 'manual_checkin')} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.3em]">HitPay Infrastructure</h3>
                <Badge type="info" className="font-black text-[9px] tracking-widest px-3 py-1 bg-[#38BDF2]/20 text-[#003E86]">LIVE PRODUCTION</Badge>
              </div>
              <Card className="p-10 border border-[#3768A2]/20 rounded-[3rem] bg-[#F2F2F2]">
                <div className="flex items-center gap-6 mb-12">
                   <div className="w-24 h-12 bg-[#F2F2F2] border border-[#3768A2]/20 rounded-xl flex items-center justify-center p-4">
                      <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/images/hitpay.png" alt="" className="h-4 object-contain" />
                   </div>
                   <div>
                     <h4 className="text-2xl font-black text-[#003E86] tracking-tighter">Secure Checkout</h4>
                     <p className="text-[10px] text-[#2E2E2F]/60 font-black uppercase tracking-[0.2em] mt-1">Global Payment Processing Engine</p>
                </div>
              </div>
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em] ml-1">Business API Key</label>
                    <div className="relative">
                      <input type="password" value="••••••••••••••••••••••••••••••••" readOnly className="w-full px-8 py-5 bg-[#F2F2F2] border border-[#3768A2]/30 rounded-[1.5rem] text-sm font-bold text-[#2E2E2F]/60" />
                      <button className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#003E86] uppercase tracking-widest hover:text-[#2E2E2F]">Rotate</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em] ml-1">Salt Checksum</label>
                      <input type="password" value="••••••••••••" readOnly className="w-full px-8 py-5 bg-[#F2F2F2] border border-[#3768A2]/30 rounded-[1.5rem] text-sm font-bold text-[#2E2E2F]/60" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em] ml-1">Market Currency</label>
                      <select className="w-full px-8 py-5 bg-[#F2F2F2] border border-[#3768A2]/30 rounded-[1.5rem] text-sm font-bold text-[#003E86] outline-none">
                        <option>PHP (Philippine Peso)</option>
                        <option>SGD (Singapore Dollar)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <div className="space-y-8">
               <h3 className="text-[11px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.3em]">Secure Webhook</h3>
               <Card className="p-8 border-[#3768A2]/20 rounded-[2.5rem] bg-[#F2F2F2]">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-widest mb-4">Callback URL</p>
                      <div className="bg-[#F2F2F2] px-5 py-4 rounded-xl border border-[#3768A2]/30 text-[11px] font-mono text-[#2E2E2F]/70 break-all leading-relaxed">
                        {import.meta.env.VITE_HITPAY_CALLBACK_URL}
                      </div>
                    </div>
                  </div>
               </Card>
            </div>
          </div>
        )}

        {/* HIGH-FIDELITY SYSTEM FLOWCHART VISUALIZATION */}
        {activeTab === 'workflow' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
               <h3 className="text-[11px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.3em]">End-to-End Architecture Flow</h3>
               <Badge type="info" className="font-black text-[9px] tracking-widest px-3 py-1 bg-[#38BDF2]/20 text-[#003E86]">REAL-TIME SYSTEM MAP</Badge>
            </div>

            <div className="relative bg-[#F2F2F2] rounded-[3rem] p-10 lg:p-16 border border-[#3768A2]/20 overflow-hidden">
               <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-20">
                  
                  {/* TRACK 1: ADMIN ENGINE */}
                  <div className="space-y-12">
                    <div className="text-center pb-4 border-b border-[#3768A2]/20">
                       <span className="text-[10px] font-black text-[#003E86] uppercase tracking-[0.4em]">Admin Engine</span>
                     </div>
                     <div className="space-y-12 relative">
                        {/* Node: Event Creation */}
                        <div className="bg-[#F2F2F2] p-6 rounded-[2rem] border border-[#3768A2]/20 relative z-10">
                           <div className="w-10 h-10 bg-[#003E86] text-[#F2F2F2] rounded-xl flex items-center justify-center mb-4">
                              <ICONS.Calendar className="w-5 h-5" />
                           </div>
                           <h4 className="font-black text-[#003E86] text-sm tracking-tight mb-2 uppercase">WYSIWYG Setup</h4>
                           <p className="text-[11px] text-[#2E2E2F]/70 font-medium leading-relaxed">Admin launches event via Live Preview portal. Metadata stored in Secure Storage.</p>
                        </div>

                        {/* Node: Inventory Control */}
                        <div className="bg-[#F2F2F2] p-6 rounded-[2rem] border border-[#3768A2]/20 relative z-10">
                           <div className="w-10 h-10 bg-[#3768A2] text-[#F2F2F2] rounded-xl flex items-center justify-center mb-4">
                              <ICONS.Settings className="w-5 h-5" />
                           </div>
                           <h4 className="font-black text-[#003E86] text-sm tracking-tight mb-2 uppercase">Ticket Inventory</h4>
                           <p className="text-[11px] text-[#2E2E2F]/70 font-medium leading-relaxed">Pricing, capacity, and sales end-dates configured per tier (Free vs Paid).</p>
                        </div>

                        {/* Connector Line to Track 2 */}
                        <div className="hidden lg:block absolute -right-12 top-1/2 w-24 h-px bg-[#3768A2]/30"></div>
                     </div>
                  </div>

                  {/* TRACK 2: PUBLIC JOURNEY & GATEWAY */}
                  <div className="space-y-12">
                    <div className="text-center pb-4 border-b border-[#3768A2]/20">
                       <span className="text-[10px] font-black text-[#38BDF2] uppercase tracking-[0.4em]">Public Journey</span>
                     </div>
                     <div className="space-y-12 relative">
                        {/* Node: Registration */}
                        <div className="bg-[#F2F2F2] p-6 rounded-[2rem] border border-[#3768A2]/20 relative z-10">
                           <div className="w-10 h-10 bg-[#38BDF2] text-[#F2F2F2] rounded-xl flex items-center justify-center mb-4">
                              <ICONS.Users className="w-5 h-5" />
                           </div>
                           <h4 className="font-black text-[#003E86] text-sm tracking-tight mb-2 uppercase">Registration Form</h4>
                           <p className="text-[11px] text-[#2E2E2F]/70 font-medium leading-relaxed">Attendee selects tickets and enters identification details.</p>
                        </div>

                        {/* Node: HitPay Gateway */}
                        <div className="bg-[#003E86] p-8 rounded-[2rem] border border-[#3768A2]/30 relative z-10">
                           <div className="flex items-center gap-4 mb-4">
                              <div className="w-10 h-10 bg-[#F2F2F2] border border-[#3768A2]/20 rounded-xl flex items-center justify-center p-2">
                                 <img src="https://xmjdcbzgdfylbqkjoyyb.supabase.co/storage/v1/object/public/startuplab-business-ticketing/images/hitpay.png" alt="" className="h-2" />
                              </div>
                              <h4 className="font-black text-[#F2F2F2] text-[12px] uppercase tracking-widest">HitPay Tunnel</h4>
                           </div>
                           <p className="text-[11px] text-[#38BDF2]/80 font-bold leading-relaxed mb-4">External secure session initialization for real-time fund capture.</p>
                           <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-[#38BDF2] rounded-full"></span>
                              <span className="text-[9px] font-black text-[#38BDF2] uppercase tracking-widest">Active Verification</span>
                           </div>
                        </div>

                        {/* Connector Line to Track 3 */}
                        <div className="hidden lg:block absolute -right-12 top-1/2 w-24 h-px bg-[#3768A2]/30"></div>
                     </div>
                  </div>

                  {/* TRACK 3: OPERATIONAL CORE */}
                  <div className="space-y-12">
                     <div className="text-center pb-4 border-b border-[#3768A2]/20">
                        <span className="text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.4em]">Operational Core</span>
                     </div>
                     <div className="space-y-12 relative">
                        {/* Node: Digital Delivery */}
                        <div className="bg-[#F2F2F2] p-6 rounded-[2rem] border border-[#3768A2]/20 relative z-10">
                           <div className="w-10 h-10 bg-[#3768A2] text-[#F2F2F2] rounded-xl flex items-center justify-center mb-4">
                              <ICONS.CreditCard className="w-5 h-5" />
                           </div>
                           <h4 className="font-black text-[#003E86] text-sm tracking-tight mb-2 uppercase">Digital Ticket</h4>
                           <p className="text-[11px] text-[#2E2E2F]/70 font-medium leading-relaxed">System generates unique UUID + QR code hash for the confirmed guest.</p>
                        </div>

                        {/* Node: Entry Control */}
                        <div className="bg-[#F2F2F2] p-6 rounded-[2rem] border border-[#3768A2]/20 relative z-10">
                           <div className="w-10 h-10 bg-[#003E86] text-[#F2F2F2] rounded-xl flex items-center justify-center mb-4">
                              <ICONS.CheckCircle className="w-5 h-5" />
                           </div>
                           <h4 className="font-black text-[#003E86] text-sm tracking-tight mb-2 uppercase">QR Check-In</h4>
                           <p className="text-[11px] text-[#2E2E2F]/70 font-medium leading-relaxed">On-site Staff Hub scans QR or manually verifies identity to grant entry.</p>
                        </div>
                     </div>
                  </div>

               </div>

               {/* Central Database Icon positioned at bottom */}
               <div className="mt-20 flex justify-center relative">
                  <div className="absolute top-[-40px] w-px h-10 bg-[#3768A2]/20"></div>
                  <div className="bg-[#F2F2F2] px-8 py-4 rounded-2xl border border-[#3768A2]/20 flex items-center gap-4">
                     <div className="w-8 h-8 bg-[#F2F2F2] border border-[#3768A2]/20 rounded-lg flex items-center justify-center text-[#2E2E2F]/60">
                        <ICONS.Layout className="w-4 h-4" />
                     </div>
                     <span className="text-[10px] font-black text-[#003E86] uppercase tracking-[0.3em]">Central Registry / Storage</span>
                  </div>
               </div>
            </div>

            <div className="bg-[#F2F2F2] border border-[#3768A2]/30 rounded-[2rem] p-8 flex gap-6">
               <div className="w-12 h-12 bg-[#F2F2F2] text-[#003E86] rounded-2xl flex items-center justify-center shrink-0 border border-[#3768A2]/30">
                  <ICONS.TrendingUp className="w-6 h-6" />
               </div>
               <div className="space-y-1">
                  <h5 className="text-[13px] font-black text-[#003E86] uppercase tracking-tight">System Integrity Report</h5>
                  <p className="text-[12px] text-[#2E2E2F]/70 font-medium leading-relaxed">
                     Every node in the journey is connected via the **apiService** abstraction, ensuring that data consistency is maintained between the Public Front, the HitPay Secure Tunnel, and the Admin Operation Hub.
                  </p>
               </div>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite Staff Personnel" size="lg">
        <form onSubmit={handleInviteSubmit} className="space-y-10 px-2">
  <div className="space-y-6">
    <Input label="Work Email" type="email" placeholder="j.miller@startuplab.co" required className="w-full py-5 px-6 rounded-2xl bg-[#F2F2F2] border-[#3768A2]/30 text-base" value={inviteData.email} onChange={(e: any) => setInviteData({...inviteData, email: e.target.value})} />
    <Input label="Assigned Position" value="STAFF" disabled className="w-full py-5 px-6 rounded-2xl bg-[#F2F2F2] border-[#3768A2]/30 text-[#2E2E2F]/60 text-base" />
  </div>
  <div className="pt-8 flex flex-col sm:flex-row gap-4">
    <Button variant="outline" className="flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-[#3768A2]/40 text-[#003E86] hover:bg-[#38BDF2]/10" onClick={() => setIsInviteModalOpen(false)}>Discard</Button>
    <Button type="submit" className="flex-[2] py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-[#003E86] text-[#F2F2F2] hover:bg-[#3768A2] transition-colors">Generate Invite</Button>
  </div>
</form>
      </Modal>
    </div>
  );
};
