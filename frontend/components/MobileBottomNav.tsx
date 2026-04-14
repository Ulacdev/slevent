
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ICONS } from '../constants';
import { useUser } from '../context/UserContext';
import { UserRole } from '../types';

export const MobileBottomNav: React.FC = () => {
    const location = useLocation();
    const { role, isAuthenticated, openAuthModal } = useUser();

    interface NavItem {
        label: string;
        path: string;
        icon: React.ReactNode;
        action?: () => void;
    }

    const navItems: NavItem[] = !isAuthenticated
        ? [
            { label: 'Explore', path: '/', icon: <ICONS.Home className="w-6 h-6" /> },
            { label: 'Browse', path: '/browse-events', icon: <ICONS.Search className="w-6 h-6" /> },
            { label: 'Tickets', path: '/my-tickets', icon: <ICONS.Ticket className="w-6 h-6" /> },
            { label: 'Login', path: '/login', icon: <ICONS.User className="w-6 h-6" /> },
        ]
        : role === UserRole.STAFF
        ? [
            { label: 'Events', path: '/events', icon: <ICONS.Calendar className="w-6 h-6" /> },
            { label: 'Attendees', path: '/attendees', icon: <ICONS.Users className="w-6 h-6" /> },
            { label: 'Scan', path: '/checkin', icon: <ICONS.CheckCircle className="w-6 h-6" /> },
            { label: 'Menu', path: '/settings', icon: <ICONS.Settings className="w-6 h-6" /> },
        ]
        : role === UserRole.ADMIN
            ? [
                { label: 'Home', path: '/dashboard', icon: <ICONS.Home className="w-6 h-6" /> },
                { label: 'Events', path: '/events', icon: <ICONS.Shield className="w-6 h-6" /> },
                { label: 'Users', path: '/settings?tab=team', icon: <ICONS.Users className="w-6 h-6" /> },
                { label: 'Menu', path: '/settings', icon: <ICONS.Settings className="w-6 h-6" /> },
            ]
            : [
                { label: 'Home', path: '/dashboard', icon: <ICONS.Home className="w-6 h-6" /> },
                { label: 'Events', path: '/events', icon: <ICONS.Calendar className="w-6 h-6" /> },
                { label: 'Attendees', path: '/attendees', icon: <ICONS.Users className="w-6 h-6" /> },
                { label: 'Menu', path: '/settings', icon: <ICONS.Settings className="w-6 h-6" /> },
            ];

    const isActive = (path: string) => {
        if (path === '#' || !path) return false;
        if (path.includes('?')) {
            const [base, query] = path.split('?');
            if (location.pathname !== base) return false;
            const tab = new URLSearchParams(query).get('tab');
            const currentTab = new URLSearchParams(location.search).get('tab');
            return currentTab === tab;
        }
        return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#F2F2F2]/95 backdrop-blur-xl border-t border-black/5 z-[600] pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-around h-16 relative">
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    const content = (
                        <>
                            <div className={`transition-all duration-300 ${active ? 'text-[#38BDF2] transform -translate-y-1' : 'text-[#2E2E2F] opacity-60'}`}>
                                {React.cloneElement(item.icon as React.ReactElement<any>, {
                                    className: `w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-[2px]'}`
                                })}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest mt-1 transition-all duration-300 ${active ? 'text-[#38BDF2] opacity-100' : 'text-[#2E2E2F] opacity-40'}`}>
                                {item.label}
                            </span>
                            {active && (
                                <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#38BDF2] rounded-full shadow-[0_0_10px_#38BDF2]" />
                            )}
                        </>
                    );

                    if ('action' in item && item.action) {
                        return (
                            <button
                                key={item.label}
                                onClick={item.action}
                                className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 relative group active:scale-90`}
                            >
                                {content}
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 relative group active:scale-90`}
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};
