
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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-transparent border-t border-sidebar-border z-[600] pb-[env(safe-area-inset-bottom)]">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-lg -z-10" />
            <div className="flex items-center h-20 relative px-2">
                {/* Dashboard & Events */}
                <div className="flex flex-1 justify-around items-center">
                    {navItems.slice(0, 2).map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link key={item.path} to={item.path} className="flex flex-col items-center gap-1 group">
                                <div className={`transition-all duration-300 ${active ? 'text-[#38BDF2]' : 'text-[#2E2E2F]/40 dark:text-white/30'}`}>
                                    {React.cloneElement(item.icon as React.ReactElement, { className: `w-6 h-6 ${active ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}` } as any)}
                                </div>
                                <span className={`text-[10px] font-black tracking-tight transition-all duration-300 ${active ? 'text-[#38BDF2]' : 'text-[#2E2E2F]/40 dark:text-white/30'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Floating Plus Button */}
                <div className="relative -top-6">
                    <button 
                        onClick={() => {
                            if (isAdmin) {
                                window.dispatchEvent(new CustomEvent('open-create-plan'));
                            } else {
                                navigate('/my-events/create');
                            }
                        }}
                        className="w-16 h-16 rounded-full bg-[#38BDF2] flex items-center justify-center text-white shadow-lg shadow-[#38BDF2]/40 active:scale-90 transition-transform border-[6px] border-[#F2F2F2] dark:border-background"
                    >
                        <ICONS.Plus className="w-8 h-8 stroke-[3.5px]" />
                    </button>
                </div>

                {/* Support & Profile */}
                <div className="flex flex-1 justify-around items-center">
                    {navItems.slice(2, 4).map((item, idx) => {
                        const active = isActive(item.path);
                        return (
                            <Link key={item.path} to={item.path} className="flex flex-col items-center gap-1 group">
                                <div className={`transition-all duration-300 ${active ? 'text-[#38BDF2]' : 'text-[#2E2E2F]/40 dark:text-white/30'}`}>
                                    {React.cloneElement(item.icon as React.ReactElement, { className: `w-6 h-6 ${active ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}` } as any)}
                                </div>
                                <span className={`text-[10px] font-black tracking-tight transition-all duration-300 ${active ? 'text-[#38BDF2]' : 'text-[#2E2E2F]/40 dark:text-white/30'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};
