import React, { useState, useEffect } from 'react';
import { Button, Input, Modal } from '../../components/Shared';
import { ICONS } from '../../constants';
import { UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../../context/ToastContext';

const API_BASE = import.meta.env.VITE_API_BASE;

type PermissionCategory = 'view_events' | 'edit_events' | 'manual_checkin' | 'receive_notifications';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    imageUrl?: string | null;
    role: string;
    perspective: UserRole;
    status: 'Active' | 'Inactive' | 'Pending';
    isOwner?: boolean;
    permissions: PermissionCategory[];
}

const PermissionShield: React.FC<{ 
    active: boolean; 
    disabled?: boolean; 
    onClick: () => void;
    iconType?: 'shield' | 'bell' 
}> = ({ active, disabled, onClick, iconType = 'shield' }) => {
    const Icon = iconType === 'bell' ? ICONS.Bell : ICONS.Shield;
    return (
        <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); !disabled && onClick(); }}
            disabled={disabled}
            className={`
                w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300
                ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer hover:scale-105 active:scale-95'}
                ${active 
                    ? 'bg-[#38BDF2] text-white shadow-md shadow-[#38BDF2]/20' 
                    : 'bg-[#2E2E2F]/5 text-[#2E2E2F]/20'
                }
            `}
        >
            <Icon className={`w-4 h-4 ${active ? 'animate-pulse' : ''}`} />
        </button>
    );
};

export const TeamSettings: React.FC = () => {
    const { showToast } = useToast();
    const [activeSubTab, setActiveSubTab] = useState<'directory' | 'permissions'>('directory');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [staffLimit, setStaffLimit] = useState<{ allowed: boolean; message?: string; limit?: number; current?: number } | null>(null);
    const [loadingTeam, setLoadingTeam] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const [inviteData, setInviteData] = useState({
        email: '',
        role: 'STAFF',
        perspective: UserRole.STAFF,
        permissions: ['view_events'] as PermissionCategory[]
    });

    const handlePrintTeam = () => {
        const printData = teamMembers;
        const printContent = `
            <html>
            <head>
                <title>Team Report</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #2E2E2F; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                </style>
            </head>
            <body>
                <h1>Team Directory</h1>
                <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                    <tbody>
                        ${printData.map(m => `<tr><td>${m.name}</td><td>${m.email}</td><td>${m.role}</td><td>${m.status}</td></tr>`).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(printContent);
            win.document.close();
            win.print();
        }
    };

    const refreshTeamData = async () => {
        try {
            const limitRes = await fetch(`${API_BASE}/api/invite/check-limit`, { credentials: 'include' });
            if (limitRes.ok) {
                const limitData = await limitRes.json();
                setStaffLimit(limitData);
            }

            const res = await fetch(`${API_BASE}/api/users/all?teamOnly=true`, { credentials: 'include' });
            const data = await res.json();

            const inviteRes = await fetch(`${API_BASE}/api/invite/list-invites`, { credentials: 'include' });
            const pendingInvites = inviteRes.ok ? await inviteRes.json() : [];

            const mapped = Array.isArray(data)
                ? data
                    .map(u => {
                        const rawRole = String(u.role || '').toUpperCase();
                        const role = rawRole === 'USER' ? UserRole.ORGANIZER : rawRole;
                        if (role !== UserRole.ADMIN && role !== UserRole.STAFF && role !== UserRole.ORGANIZER) return null;
                        const isOwner = role === UserRole.ORGANIZER;
                        return {
                            id: u.userId,
                            name: u.name || '',
                            email: u.email,
                            imageUrl: u.imageUrl || null,
                            role,
                            perspective: role as UserRole,
                            status: 'Active',
                            isOwner,
                            permissions: isOwner
                                ? ['view_events', 'edit_events', 'manual_checkin', 'receive_notifications']
                                : [
                                    ...(u.canViewEvents ? ['view_events'] : []),
                                    ...(u.canEditEvents ? ['edit_events'] : []),
                                    ...(u.canManualCheckIn ? ['manual_checkin'] : []),
                                    ...(u.canReceiveNotifications ? ['receive_notifications'] : [])
                                ],
                        } as TeamMember;
                    })
                    .filter((member): member is TeamMember => member !== null)
                : [];

            if (Array.isArray(pendingInvites)) {
                pendingInvites.forEach(inv => {
                    if (!mapped.some(m => m.email.toLowerCase() === inv.email.toLowerCase())) {
                        const invPerms: PermissionCategory[] = [];
                        if (inv.canViewEvents || inv.canviewevents) invPerms.push('view_events');
                        if (inv.canEditEvents || inv.caneditevents) invPerms.push('edit_events');
                        if (inv.canManualCheckIn || inv.canmanualcheckin) invPerms.push('manual_checkin');
                        if (inv.canReceiveNotifications || inv.canreceivenotifications) invPerms.push('receive_notifications');
                        if (invPerms.length === 0) invPerms.push('view_events');

                        mapped.push({
                            id: inv.inviteId || `pending-${inv.email}`,
                            name: inv.email.split('@')[0],
                            email: inv.email,
                            role: inv.role || 'STAFF',
                            perspective: (inv.role || 'STAFF') as UserRole,
                            status: 'Pending',
                            permissions: invPerms
                        });
                    }
                });
            }

            const sorted = mapped.sort((a, b) => {
                const rank = { [UserRole.ORGANIZER]: 0, [UserRole.ADMIN]: 1, [UserRole.STAFF]: 2 } as const;
                const aRank = rank[a.perspective] ?? 99;
                const bRank = rank[b.perspective] ?? 99;
                if (aRank !== bRank) return aRank - bRank;
                return a.name.localeCompare(b.name);
            });
            setTeamMembers(sorted);
        } catch (err) {
            console.error("Failed to load team data", err)
        } finally {
            setLoadingTeam(false);
        }
    };

    useEffect(() => {
        refreshTeamData();
    }, []);

    const toggleMemberPermission = async (memberId: string, permission: PermissionCategory) => {
        try {
            const member = teamMembers.find(m => m.id === memberId);
            if (!member || member.isOwner) return;

            const nextPerms = member.permissions.includes(permission)
                ? member.permissions.filter(p => p !== permission)
                : [...member.permissions, permission];

            setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, permissions: nextPerms } : m));

            await apiService.updateUserPermissions(memberId, {
                canViewEvents: nextPerms.includes('view_events'),
                canEditEvents: nextPerms.includes('edit_events'),
                canManualCheckIn: nextPerms.includes('manual_checkin'),
                canReceiveNotifications: nextPerms.includes('receive_notifications')
            });

            showToast('success', 'Permissions updated successfully');
        } catch (err) {
            showToast('error', 'Failed to update permissions');
            refreshTeamData();
        }
    };

    const handleDeleteStaff = async (member: TeamMember) => {
        if (!window.confirm(`Are you sure you want to remove ${member.name}?`)) return;

        setIsDeleting(member.id);
        try {
            const endpoint = member.status === 'Pending' 
                ? `${API_BASE}/api/invite/${member.id}` 
                : `${API_BASE}/api/users/${member.id}`;

            const res = await fetch(endpoint, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to delete');

            showToast('success', 'Team member removed');
            refreshTeamData();
        } catch (err) {
            showToast('error', 'Failed to remove member');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleInviteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsInviting(true);
        try {
            const res = await fetch(`${API_BASE}/api/invite/create-and-send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: inviteData.email,
                    role: 'STAFF',
                    canViewEvents: inviteData.permissions.includes('view_events'),
                    canEditEvents: inviteData.permissions.includes('edit_events'),
                    canManualCheckIn: inviteData.permissions.includes('manual_checkin'),
                    canReceiveNotifications: inviteData.permissions.includes('receive_notifications')
                })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to send invite');
            }

            showToast('success', 'Invite sent successfully');
            setIsInviteModalOpen(false);
            setInviteData({ email: '', role: 'STAFF', perspective: UserRole.STAFF, permissions: ['view_events'] });
            refreshTeamData();
        } catch (err: any) {
            showToast('error', err.message || 'Failed to send invite');
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Staff Quota Bar - Top Aligned */}
            <div className="flex items-center gap-4">
                <div className="flex-1 flex gap-3">
                    <div className="px-5 py-3 bg-[#F2F2F2] border border-[#2E2E2F]/5 rounded-2xl shadow-sm flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-[#38BDF2]/10 flex items-center justify-center">
                            <ICONS.Users className="w-4 h-4 text-[#38BDF2]" />
                        </div>
                        <div>
                            <p className="text-[14px] font-black text-[#2E2E2F] leading-none mb-0.5">{staffLimit?.current || 0}</p>
                            <p className="text-[8px] font-bold text-[#2E2E2F]/40 uppercase tracking-widest leading-none">Active Staff</p>
                        </div>
                    </div>
                    <div className="px-5 py-3 bg-[#F2F2F2] border border-[#2E2E2F]/5 rounded-2xl shadow-sm flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-[#2E2E2F]/5 flex items-center justify-center">
                            <ICONS.Monitor className="w-4 h-4 text-[#2E2E2F]/40" />
                        </div>
                        <div>
                            <p className="text-[14px] font-black text-[#2E2E2F] leading-none mb-0.5">{staffLimit?.limit || 0}</p>
                            <p className="text-[8px] font-bold text-[#2E2E2F]/40 uppercase tracking-widest leading-none">Staff Limit</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        className="!h-8 !min-h-0 px-4 rounded-lg border-[#2E2E2F]/10 bg-[#F2F2F2] text-[#2E2E2F]/60 hover:bg-[#38BDF2] hover:text-white transition-all duration-300 font-bold uppercase tracking-widest text-[8px]" 
                        onClick={handlePrintTeam}
                    >
                        <ICONS.Download className="w-3 h-3 mr-1.5" /> Export
                    </Button>
                    <Button 
                        className="!h-8 !min-h-0 px-5 rounded-lg bg-[#38BDF2] text-white shadow-md shadow-[#38BDF2]/20 hover:scale-105 transition-all duration-300 font-black uppercase tracking-widest text-[8px]" 
                        onClick={() => setIsInviteModalOpen(true)}
                    >
                        <ICONS.Plus className="w-3 h-3 mr-1.5" /> Add Member
                    </Button>
                </div>
            </div>

            <div className="flex gap-1.5 p-1 bg-[#2E2E2F]/5 rounded-xl w-fit border border-[#2E2E2F]/5">
                <button 
                    onClick={() => setActiveSubTab('directory')} 
                    className={`h-8 px-5 rounded-lg font-black uppercase tracking-[0.1em] text-[10px] transition-all duration-300 ${activeSubTab === 'directory' ? 'bg-[#38BDF2] text-white shadow-md shadow-[#38BDF2]/20' : 'text-[#2E2E2F]/40 hover:text-[#2E2E2F]/60'}`}
                >
                    Directory
                </button>
                <button 
                    onClick={() => setActiveSubTab('permissions')} 
                    className={`h-8 px-5 rounded-lg font-black uppercase tracking-[0.1em] text-[10px] transition-all duration-300 ${activeSubTab === 'permissions' ? 'bg-[#38BDF2] text-white shadow-md shadow-[#38BDF2]/20' : 'text-[#2E2E2F]/40 hover:text-[#2E2E2F]/60'}`}
                >
                    Permissions
                </button>
            </div>

            <div className="space-y-6">
                <div className="bg-[#F2F2F2] border border-[#2E2E2F]/5 rounded-2xl overflow-hidden shadow-sm">
                    {loadingTeam ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#38BDF2]/20 border-t-[#38BDF2] rounded-full animate-spin" /></div>
                    ) : teamMembers.length === 0 ? (
                        <div className="p-10 text-center bg-transparent">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#38BDF2]/10 flex items-center justify-center">
                                    <ICONS.Users className="w-6 h-6 text-[#38BDF2]" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-black text-[#2E2E2F] uppercase text-[10px] tracking-widest">No members found</h3>
                                    <p className="text-[10px] text-[#2E2E2F]/50 font-medium tracking-tight">Invite your first team member.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-[#F2F2F2]/40 border-b border-[#2E2E2F]/5">
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]/40">Staff Name</th>
                                        {activeSubTab === 'directory' ? (
                                            <>
                                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]/40 text-center">Status</th>
                                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]/40 text-center">Hierarchy</th>
                                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]/40 text-center">Actions</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]/40 text-center">View</th>
                                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]/40 text-center">Edit</th>
                                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]/40 text-center">Check-In</th>
                                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]/40 text-center">Inbox</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamMembers.map(member => (
                                        <tr key={member.id} className="border-b border-[#2E2E2F]/5 hover:bg-[#38BDF2]/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-[#2E2E2F]">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${member.isOwner ? 'bg-[#38BDF2] text-white' : 'bg-[#F2F2F2]'}`}>
                                                        {member.imageUrl ? <img src={member.imageUrl} className="w-full h-full object-cover rounded-lg" /> : member.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-[12px] font-black leading-none mb-1">{member.name}</div>
                                                        <div className="text-[8px] opacity-40 font-bold uppercase tracking-widest">{member.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {activeSubTab === 'directory' ? (
                                                <>
                                                    <td className="px-4 py-4 text-center">
                                                        <div className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${member.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                            {member.status}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[9px] font-black uppercase text-[#2E2E2F]/60 tracking-wider">
                                                            {member.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        {!member.isOwner && (
                                                            <div className="flex justify-center">
                                                                <button 
                                                                    onClick={() => handleDeleteStaff(member)}
                                                                    disabled={!!isDeleting}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 border border-red-500/10"
                                                                >
                                                                    {isDeleting === member.id ? <div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" /> : <ICONS.Trash className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-4 text-center"><PermissionShield active={member.permissions.includes('view_events')} disabled={member.isOwner} onClick={() => toggleMemberPermission(member.id, 'view_events')} /></td>
                                                    <td className="px-4 py-4 text-center"><PermissionShield active={member.permissions.includes('edit_events')} disabled={member.isOwner} onClick={() => toggleMemberPermission(member.id, 'edit_events')} /></td>
                                                    <td className="px-4 py-4 text-center"><PermissionShield active={member.permissions.includes('manual_checkin')} disabled={member.isOwner} onClick={() => toggleMemberPermission(member.id, 'manual_checkin')} /></td>
                                                    <td className="px-4 py-4 text-center"><PermissionShield iconType="bell" active={member.permissions.includes('receive_notifications')} disabled={member.isOwner} onClick={() => toggleMemberPermission(member.id, 'receive_notifications')} /></td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite Staff">
                <form onSubmit={handleInviteSubmit} className="space-y-6">
                    <Input label="Email Address" type="email" value={inviteData.email} onChange={(e: any) => setInviteData({ ...inviteData, email: e.target.value })} required placeholder="staff@example.com" />
                    <div className="flex justify-end gap-4 pt-4">
                        <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isInviting}>{isInviting ? 'Inviting...' : 'Invite Staff'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
