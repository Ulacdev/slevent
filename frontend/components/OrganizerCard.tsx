import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OrganizerProfile } from '../../types';
import { ICONS } from '../../constants';
import { useUser } from '../../context/UserContext';
import { useEngagement } from '../../context/EngagementContext';

const getImageUrl = (img: any): string => {
    if (!img) return '';
    if (typeof img === 'string') return img;
    return img.url || img.path || img.publicUrl || '';
};

const formatCompactCount = (value: number) => (
    new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
        Math.max(0, Number(value || 0))
    )
);

interface OrganizerCardProps {
    organizer: OrganizerProfile;
    variant?: 'default' | 'compact' | 'horizontal';
    showBio?: boolean;
    showSocial?: boolean;
    onFollowToggle?: (following: boolean) => void;
}

export const OrganizerCard: React.FC<OrganizerCardProps> = ({
    organizer,
    variant = 'default',
    showBio = false,
    showSocial = false,
    onFollowToggle
}) => {
    const navigate = useNavigate();
    const { isAuthenticated } = useUser();
    const { isFollowing, toggleFollowing, canLikeFollow } = useEngagement();

    const following = isFollowing(organizer.organizerId);
    const organizerImage = getImageUrl(organizer.profileImageUrl);
    const organizerInitial = (organizer.organizerName || 'O').charAt(0).toUpperCase();

    const handleFollow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            navigate('/signup');
            return;
        }
        if (!canLikeFollow) {
            return;
        }
        try {
            const { following: nextFollowing } = await toggleFollowing(organizer.organizerId);
            onFollowToggle?.(nextFollowing);
        } catch (err) {
            console.error('Failed to toggle follow:', err);
        }
    };

    const handleClick = () => {
        navigate(`/organizers/${organizer.organizerId}`);
    };

    // Horizontal variant - for dropdown selector
    if (variant === 'horizontal') {
        return (
            <button
                type="button"
                onClick={handleClick}
                className="group text-left rounded-2xl border border-[#2E2E2F]/10 bg-[#F2F2F2] overflow-hidden hover:border-[#38BDF2]/45 transition-all min-w-[200px]"
            >
                <div className="aspect-[4/3] bg-[#2E2E2F]/5">
                    {organizerImage ? (
                        <img
                            src={organizerImage}
                            alt={organizer.organizerName}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#2E2E2F] text-[#F2F2F2] text-3xl font-black">
                            {organizerInitial}
                        </div>
                    )}
                </div>
                <div className="px-4 py-3">
                    <p className="text-sm font-bold text-[#2E2E2F] truncate">{organizer.organizerName}</p>
                    <p className="text-[10px] text-[#2E2E2F]/50 font-medium mt-1">
                        {formatCompactCount(organizer.followersCount || 0)} followers
                    </p>
                </div>
            </button>
        );
    }

    // Compact variant - for small cards in grid
    if (variant === 'compact') {
        return (
            <div
                onClick={handleClick}
                className="group cursor-pointer rounded-2xl border border-[#2E2E2F]/10 bg-[#F2F2F2] overflow-hidden hover:border-[#38BDF2]/45 transition-all"
            >
                <div className="aspect-[4/3] bg-[#2E2E2F]/5">
                    {organizerImage ? (
                        <img
                            src={organizerImage}
                            alt={organizer.organizerName}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#2E2E2F] text-[#F2F2F2] text-3xl font-black">
                            {organizerInitial}
                        </div>
                    )}
                </div>
                <div className="px-4 py-3">
                    <p className="text-sm font-bold text-[#2E2E2F] truncate">{organizer.organizerName}</p>
                    <p className="text-[10px] text-[#2E2E2F]/50 font-medium mt-1">
                        {formatCompactCount(organizer.followersCount || 0)} followers
                    </p>
                </div>
            </div>
        );
    }

    // Default variant - full card with details
    return (
        <div className="bg-[#F2F2F2] rounded-[2rem] border border-[#2E2E2F]/10 p-6 hover:border-[#38BDF2]/40 transition-all">
            <div className="flex items-start gap-4 mb-4">
                <div 
                    onClick={handleClick}
                    className="w-20 h-20 rounded-full overflow-hidden bg-[#2E2E2F] text-[#F2F2F2] flex items-center justify-center text-2xl font-bold shrink-0 border-4 border-white shadow-md cursor-pointer"
                >
                    {organizerImage ? (
                        <img src={organizerImage} alt={organizer.organizerName} className="w-full h-full object-cover" />
                    ) : (
                        organizerInitial
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 
                        onClick={handleClick}
                        className="text-lg font-bold text-[#2E2E2F] truncate cursor-pointer hover:text-[#38BDF2] transition-colors"
                    >
                        {organizer.organizerName}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-[#2E2E2F]/50 uppercase">
                            {formatCompactCount(organizer.followersCount || 0)} followers
                        </span>
                        <span className="text-[10px] font-black text-[#2E2E2F]/30">•</span>
                        <span className="text-[10px] font-black text-[#2E2E2F]/50 uppercase">
                            {organizer.eventsHostedCount || 0} events
                        </span>
                    </div>
                </div>
            </div>

            {showBio && organizer.bio && (
                <p className="text-[#2E2E2F]/70 text-sm font-medium leading-relaxed mb-4 line-clamp-2">
                    {organizer.bio}
                </p>
            )}

            <div className="flex items-center justify-between gap-3">
                <button
                    onClick={handleFollow}
                    className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all hover:scale-[1.02] active:scale-[0.98] ${following
                        ? 'bg-[#00E6FF] text-white'
                        : 'bg-[#00D4FF] text-white hover:bg-[#00E6FF]'
                    }`}
                >
                    {following ? 'Following' : 'Follow'}
                </button>

                {showSocial && (
                    <div className="flex items-center gap-2">
                        {organizer.websiteUrl && (
                            <a
                                href={organizer.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-lg border border-[#2E2E2F]/10 bg-white text-[#2E2E2F]/60 hover:text-[#38BDF2] transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </a>
                        )}
                        {organizer.facebookId && (
                            <a
                                href={`https://facebook.com/${organizer.facebookId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-lg border border-[#2E2E2F]/10 bg-white text-[#2E2E2F]/60 hover:text-[#1877F2] transition-colors"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>
                        )}
                        {organizer.twitterHandle && (
                            <a
                                href={`https://twitter.com/${organizer.twitterHandle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-lg border border-[#2E2E2F]/10 bg-white text-[#2E2E2F]/60 hover:text-[#1DA1F2] transition-colors"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                </svg>
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
