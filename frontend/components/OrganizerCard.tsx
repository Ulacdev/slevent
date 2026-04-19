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
            className={`group relative bg-[#F2F2F2] rounded-xl overflow-hidden shadow-sm border border-black/5 cursor-pointer transition-all duration-400 hover:shadow-xl ${className}`}
            style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
        >
            {/* Banner/Cover Image */}
            <div className="relative h-44 w-full bg-[#E5E5E5] overflow-hidden">
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
            <div className="p-4 sm:p-5 flex flex-col items-start gap-4">
                {/* Profile row */}
                <div className="flex items-start gap-4 min-w-0 w-full">
                    <div className="shrink-0 w-16 h-16 rounded-full overflow-hidden border border-black/5 bg-white shadow-sm">
                        {profileImage ? (
                            <img src={profileImage} alt={organizer.organizerName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-[#38BDF2] flex items-center justify-center text-white text-xl font-black">
                                {initials}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-black leading-[1.1] truncate tracking-tight mb-0.5">
                            {organizer.organizerName}
                        </h3>
                        <p className="text-[13px] font-bold text-[#65676B] tracking-wide">
                            Startup Organizer
                        </p>
                        
                        {/* Social Proof with Facepile */}
                        <div className="flex flex-col gap-2 mt-2">
                             <div className="flex items-center gap-2">
                                <div className="flex -space-x-1.5">
                                    {(() => {
                                        const avatars = followers.slice(0, 3).map(f => ({
                                            id: f.userId,
                                            img: f.imageUrl,
                                            initials: (f.name || 'U').charAt(0).toUpperCase()
                                        }));

                                        return avatars.map((av, idx) => (
                                            <div key={av.id} className="w-5 h-5 rounded-full border border-white bg-[#D1D5DB] overflow-hidden flex items-center justify-center shadow-sm" style={{ zIndex: 10 - idx }}>
                                                {av.img ? (
                                                    <img src={av.img} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <span className="text-[7px] font-black">{av.initials}</span>
                                                )}
                                            </div>
                                        ));
                                    })()}
                                </div>
                                <p className="text-[12.5px] text-[#65676B] leading-tight font-medium">
                                    {otherFollowersCount > 0 
                                      ? `${otherFollowersCount.toLocaleString()} others follow this Page`
                                      : followers.length > 0 ? "Followed by our community" : "Be the first to follow"}
                                </p>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Follow Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onFollow(e);
                    }}
                    className={`w-full py-3.5 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md transform hover:brightness-105 active:brightness-95 ${
                        isFollowing 
                        ? 'bg-[#E5E7EB] text-[#050505] border border-black/5' 
                        : 'bg-[#38BDF2] text-white shadow-[#38BDF2]/20'
                    }`}
                >
                    {isFollowing ? (
                        <>
                            <ICONS.Check className="w-5 h-5 stroke-[3px]" />
                            <span>Following</span>
                        </>
                    ) : (
                        <>
                            <ICONS.Plus className="w-5 h-5 stroke-[3px]" />
                            <span>Follow</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
