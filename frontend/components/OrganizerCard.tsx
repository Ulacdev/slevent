import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import { OrganizerProfile } from '../types';
import { useUser } from '../context/UserContext';

// Helper to handle JSONB image format
const getImageUrl = (img: any): string => {
    if (!img) return '';
    if (typeof img === 'string') return img;
    return img.url || img.path || img.publicUrl || img;
};

interface OrganizerCardProps {
    organizer: OrganizerProfile;
    isFollowing: boolean;
    onFollow: (e: React.MouseEvent) => void;
    onClick: () => void;
    className?: string;
    rank?: number;
}

export const OrganizerCard: React.FC<OrganizerCardProps> = ({ organizer, isFollowing, onFollow, onClick, className = "", rank }) => {
    const { name: currentUserName } = useUser();
    const coverImage = getImageUrl(organizer.coverImageUrl);
    const profileImage = getImageUrl(organizer.profileImageUrl);
    const initials = (organizer.organizerName || 'O').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
    
    // Social proof logic
    const followers = organizer.recentFollowers || [];
    const firstFollowerName = followers[0]?.name || (isFollowing ? currentUserName : '');
    const otherFollowersCount = Math.max(0, (organizer.followersCount || 0) - (firstFollowerName ? 1 : 0));

    return (
        <div
            onClick={onClick}
            className={`group relative bg-[#F2F2F2] rounded-2xl sm:rounded-xl overflow-hidden shadow-sm border border-black/5 cursor-pointer transition-all duration-400 hover:shadow-xl ${className}`}
            style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
        >
            {/* Banner/Cover Image - Hidden on Mobile as per request */}
            <div className="hidden sm:block relative h-44 w-full bg-[#E5E5E5] overflow-hidden">
                {coverImage ? (
                    <img src={coverImage} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                         <div className="opacity-10 grayscale scale-150 transform">
                             <ICONS.Layout className="w-16 h-16" />
                         </div>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500" />
            </div>

            {/* Content Area */}
            <div className="p-4 sm:p-5 flex flex-col items-stretch gap-4">
                {/* Profile row */}
                <div className="flex items-start gap-4 min-w-0 w-full">
                    {/* Responsive Profile Image Sizing */}
                    <div className="shrink-0 w-20 h-20 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-black/5 bg-white shadow-sm">
                        {profileImage ? (
                            <img src={profileImage} alt={organizer.organizerName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-[#38BDF2] flex items-center justify-center text-white text-2xl sm:text-xl font-black">
                                {initials}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-1 sm:pt-0">
                        <h3 className="text-xl sm:text-lg font-black sm:font-bold text-black leading-tight truncate tracking-tight mb-0.5">
                            {organizer.organizerName}
                        </h3>
                        <p className="text-[13px] font-bold text-[#65676B] tracking-wide mb-2 opacity-60">
                            Digital Event Organizer
                        </p>
                        
                        {/* Social Proof Row */}
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                                {followers.length > 0 ? (
                                    followers.slice(0, 2).map((f, idx) => (
                                        <div key={f.userId} className="w-4 h-4 rounded-full border-2 border-white bg-gray-200 overflow-hidden flex-shrink-0" style={{ zIndex: 10 - idx }}>
                                            {f.imageUrl ? (
                                                <img src={f.imageUrl} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[5px] font-bold">{f.name?.[0]}</div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="w-4 h-4 rounded-full border border-white bg-[#38BDF2]/10 flex items-center justify-center">
                                        <ICONS.Star className="w-2.5 h-2.5 text-[#38BDF2]" />
                                    </div>
                                )}
                            </div>
                            <p className="text-[12px] sm:text-[12.5px] text-[#65676B] font-medium leading-tight">
                                {(() => {
                                    if (followers.length === 0) return "New growing community";
                                    const names = followers.slice(0, 2).map(f => f.name?.split(' ')[0]);
                                    const count = Math.max(0, (organizer.followersCount || 0) - names.length);
                                    
                                    if (names.length === 1) return <><span className="font-bold">{names[0]}</span> follows this</>;
                                    if (count > 0) return <><span className="font-bold">{names.join(', ')}</span> and <span className="font-bold">{count.toLocaleString()} others</span></>;
                                    return <><span className="font-bold">{names.join(' and ')}</span> follow this</>;
                                })()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Mobile-Optimized Action Section */}
                <div className="sm:mt-0">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onFollow(e);
                        }}
                        className={`w-full py-2.5 sm:py-3.5 rounded-xl text-[15px] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm transform hover:brightness-105 active:brightness-95 ${
                            isFollowing 
                            ? 'bg-[#38BDF2]/10 text-[#38BDF2] border border-[#38BDF2]/20' 
                            : 'bg-[#38BDF2] text-white shadow-[#38BDF2]/20'
                        }`}
                    >
                        {isFollowing ? (
                            <>
                                <ICONS.Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3.5px]" />
                                <span>Following</span>
                            </>
                        ) : (
                            <>
                                <ICONS.Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3.5px]" />
                                <span>Follow</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
