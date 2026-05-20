
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import { useUser } from '../context/UserContext';
import { UserRole } from '../types';

export const MobileBottomNav: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { role, isAuthenticated, imageUrl, name, email } = useUser();

    if (!isAuthenticated) return null;
    
    const isCreateOrEditPage = location.pathname.includes('/my-events/create') || location.pathname.includes('/my-events/edit');
    if (isCreateOrEditPage) return null;

    const isAdmin = role === UserRole.ADMIN;
    
    // Items as per design
    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: <ICONS.Layout className="w-6 h-6" /> },
        { label: 'Attendees', path: isAdmin ? '/attendees' : '/user/attendees', icon: <ICONS.Users className="w-6 h-6" /> },
        { label: 'Support', path: isAdmin ? '/settings?tab=support' : '/organizer-support', icon: <ICONS.Headphones className="w-6 h-6" /> },
        { 
            label: isAdmin ? 'Announcements' : 'Scan', 
            path: isAdmin ? '/admin/announcements' : '/user/checkin', 
            icon: isAdmin ? <ICONS.Megaphone className="w-6 h-6" /> : <ICONS.CheckCircle className="w-6 h-6" /> 
        },
    ];

    const isActive = (path: string) => {
        if (path.includes('?')) {
            const [base, query] = path.split('?');
            if (location.pathname !== base) return false;
            const tab = new URLSearchParams(query).get('tab');
            const currentTab = new URLSearchParams(location.search).get('tab');
            return currentTab === tab;
        }
        // Handle subpaths for events management
        if (path === '/my-events' && location.pathname.startsWith('/my-events')) return true;
        return location.pathname === path;
    };

    const initials = (email?.split('@')[0] || name?.trim() || 'U')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <nav className="md:hidden fixed bottom-4 left-4 right-4 z-[600] pb-[env(safe-area-inset-bottom)] flex items-center gap-3">
            
            {/* Left Nav Capsule Card */}
            <div className="flex-1 bg-white/95 dark:bg-[#1A1A1E] border border-[#E8E8E8] dark:border-[#2E2E3F]/30 rounded-2xl h-14 flex items-center justify-around px-2 shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <Link key={item.path} to={item.path} className="flex flex-col items-center justify-center gap-0.5 group">
                            <div className={`px-4 py-1 rounded-full transition-all duration-300 ${
                                active 
                                    ? 'bg-[#38BDF2]/10 text-[#38BDF2]' 
                                    : 'text-[#2E2E2F]/40 dark:text-white/30 group-hover:text-[#38BDF2]/70'
                            }`}>
                                {React.cloneElement(item.icon as React.ReactElement, { className: `w-5 h-5 ${active ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}` } as any)}
                            </div>
                            <span className={`text-[9px] font-black tracking-tight transition-all duration-300 ${
                                active 
                                    ? 'text-[#38BDF2]' 
                                    : 'text-[#2E2E2F]/40 dark:text-white/30 group-hover:text-[#38BDF2]/70'
                            }`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {/* Right Action Button (Squircle Shape Plus Button) */}
            <button 
                onClick={() => {
                    if (isAdmin) {
                        window.dispatchEvent(new CustomEvent('open-create-plan'));
                    } else {
                        navigate('/my-events/create');
                    }
                }}
                className="w-14 h-14 shrink-0 rounded-2xl bg-[#38BDF2] flex items-center justify-center text-white shadow-lg shadow-[#38BDF2]/30 active:scale-95 transition-transform border border-[#38BDF2] dark:border-transparent"
            >
                <ICONS.Plus className="w-6 h-6 stroke-[3.5px]" />
            </button>

        </nav>
    );
};
