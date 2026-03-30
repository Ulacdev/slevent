import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { OrganizerProfile } from '../../types';
import { ICONS } from '../../constants';
import { useEngagement } from '../../context/EngagementContext';
import { useUser } from '../../context/UserContext';
import { PageLoader } from '../../components/Shared';
import { OrganizerCardSkeleton } from '../../components/Shared/Skeleton';
import { OrganizerCard } from '../../components/OrganizerCard';

export const OrganizerDiscoveryPage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useUser();
    const { isFollowing, toggleFollowing, canLikeFollow } = useEngagement();

    // State
    const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [interactionNotice, setInteractionNotice] = useState('');
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);

    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState<'discover' | 'following'>('discover');
    const [sortBy, setSortBy] = useState<'name' | 'followers' | 'followed_first'>('followers');

    useEffect(() => {
        const fetchOrganizers = async () => {
            try {
                const data = await apiService.getOrganizers();
                setOrganizers(data || []);
            } catch (error) {
                console.error('Failed to fetch organizers:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrganizers();
    }, []);

    const handleFollow = async (orgId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (!isAuthenticated) {
            navigate('/signup');
            return;
        }
        if (!canLikeFollow) {
            setInteractionNotice('Switch to Attending mode to follow organizations.');
            return;
        }
        try {
            await toggleFollowing(orgId);
        } catch (error: any) {
            setInteractionNotice(error.message || 'Failed to update follow status.');
        }
    };

    // Filtering & Sorting Logic
    const filteredOrganizers = useMemo(() => {
        let result = organizers.filter(org => {
            // Search filter
            if (searchTerm && !org.organizerName.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }

            // Following mode filter
            if (filterMode === 'following') {
                if (!isFollowing(org.organizerId)) return false;
            }

            return true;
        });

        // Sorting
        return result.sort((a, b) => {
            // Sort by Follower Count as requested
            const scoreA = (a.followersCount || 0);
            const scoreB = (b.followersCount || 0);

            if (sortBy === 'followed_first') {
                const aFollowed = isFollowing(a.organizerId);
                const bFollowed = isFollowing(b.organizerId);
                
                // 1. Followed ones always first
                if (aFollowed && !bFollowed) return -1;
                if (!aFollowed && bFollowed) return 1;
                
                // 2. Then Popularity (just like homepage trending)
                if (scoreB !== scoreA) return scoreB - scoreA;
                
                // 3. Alphabetical fallback
                return a.organizerName.localeCompare(b.organizerName);
            }
            
            if (sortBy === 'followers') {
                return scoreB - scoreA;
            }
            if (sortBy === 'name') {
                return a.organizerName.localeCompare(b.organizerName);
            }
            return 0;
        });
    }, [organizers, searchTerm, filterMode, isFollowing, sortBy]);

    // Calculate Trending/Popular ranks for the first few items
    const popularRanks = useMemo(() => {
        const ranks = new Map<string, number>();
        if (filterMode === 'discover') {
            // Rank top 5 as "Most Popular" based on engagement score
            filteredOrganizers
                .slice(0, 5)
                .forEach((org, idx) => {
                    const score = (org.followersCount || 0);
                    // Only show rank tag if they have at least some engagement (follower, host an event, or have a like)
                    if (score > 0) {
                        ranks.set(org.organizerId, idx + 1);
                    }
                });
        }
        return ranks;
    }, [filteredOrganizers, filterMode]);

    if (loading) {
        return (
            <div className="bg-[#F2F2F2] min-h-screen">
                <div className="max-w-[88rem] mx-auto px-4 sm:px-10 py-24">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <OrganizerCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#F2F2F2] min-h-screen">
            {/* Hero Section - Full Width at Top */}
            <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 h-[260px] sm:h-[300px] lg:h-[350px] overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(116deg,#38BDF2_0%,#38BDF2_44%,#F2F2F2_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,62,134,0.45)_0%,rgba(0,62,134,0.2)_34%,rgba(0,62,134,0)_72%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_32%,rgba(255,255,255,0.34),transparent_46%),linear-gradient(90deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_26%,rgba(255,255,255,0)_52%)]" />
                <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center px-5 sm:px-8">
                    <div className="max-w-[720px]">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 mb-4">Community Marketplace</p>
                        <h1 className="text-[2.1rem] font-black leading-none tracking-tight text-white sm:text-5xl">Discover Organizers</h1>
                        <p className="mt-4 max-w-[680px] text-base leading-relaxed text-white/95 sm:text-[1.05rem]">
                            Explore top-tier organizations, follow your favorites, and stay updated with their latest event sessions and updates.
                        </p>
                    </div>
                </div>
            </section>

            {/* Main Layout - Content with Sidebar BELOW Hero */}
            <div className="max-w-[88rem] mx-auto px-4 sm:px-10 py-12">

                {/* Controls Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button
                            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                            className="flex items-center gap-2 bg-[#F2F2F2] px-5 py-3 rounded-xl border border-[#2E2E2F]/10 shadow-sm text-[11px] font-black uppercase tracking-widest text-[#2E2E2F] hover:bg-[#38BDF2]/10 hover:border-[#38BDF2]/30 transition-all"
                        >
                            <ICONS.Filter className="w-4 h-4" />
                            {isSidebarVisible ? 'Hide Filters' : 'Show Filters'}
                        </button>

                        <div className="flex items-center gap-3 bg-[#F2F2F2] px-5 py-3 rounded-xl border border-[#2E2E2F]/10 shadow-sm text-[11px] font-black uppercase tracking-widest text-[#2E2E2F]">
                            <span className="opacity-40 uppercase tracking-[0.15em] text-[10px]">Sort By</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-transparent font-black tracking-tight outline-none cursor-pointer text-[#2E2E2F]"
                            >
                                <option value="followed_first">Followed First</option>
                                <option value="name">Alphabetical (A-Z)</option>
                                <option value="followers">Most Followed</option>
                            </select>
                        </div>
                    </div>

                    <div className="w-full sm:w-[320px]">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#2E2E2F] group-focus-within:text-[#38BDF2] transition-colors">
                                <ICONS.Search className="h-4 w-4" strokeWidth={3} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search communities..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-9 py-3.5 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-xl text-[13px] font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#38BDF2]/20 focus:border-[#38BDF2] placeholder:text-[#2E2E2F]"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Sidebar Filter - Matching All Events style */}
                    {isSidebarVisible && (
                        <aside className="w-full lg:w-72 shrink-0 space-y-10 lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:pr-4">
                            <div className="flex items-center justify-between pb-6 border-b border-[#2E2E2F]/5">
                                <h3 className="text-xl font-black text-[#2E2E2F] tracking-tight">Refine Hub</h3>
                                {(searchTerm || filterMode !== 'discover') && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterMode('discover');
                                        }}
                                        className="text-[10px] font-black uppercase tracking-widest text-[#38BDF2] hover:text-[#2E2E2F] transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Following Filter */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]">Explore Options</h4>
                                <div className="space-y-4">
                                    {[
                                        { id: 'discover', label: 'Discover Organizers', icon: ICONS.Compass },
                                        { id: 'following', label: 'Organizers You Follow', icon: ICONS.Heart },
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setFilterMode(opt.id as any)}
                                            className={`flex items-center gap-4 w-full group transition-all text-left ${filterMode === opt.id ? 'text-[#38BDF2]' : 'text-[#65676B] hover:text-[#050505]'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${filterMode === opt.id ? 'bg-[#38BDF2] text-white' : 'bg-[#F2F2F2] border border-[#2E2E2F]/5 group-hover:bg-[#38BDF2]/10 group-hover:text-[#38BDF2]'}`}>
                                                <opt.icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-black tracking-tight">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-[#2E2E2F]/5">
                                <p className="text-[10px] font-bold text-[#2E2E2F] leading-relaxed italic">
                                    Browse all verified organizations or filter to see only your favorite communities.
                                </p>
                            </div>
                        </aside>
                    )}

                    {/* Content Area */}
                        <div className="flex-1">
                            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-3xl font-black text-[#2E2E2F] tracking-tight">
                                        {filterMode === 'following' ? 'Communities You Follow' : 'Suggested Communities'}
                                    </h2>
                                    <p className="text-[#2E2E2F] text-sm font-medium mt-1">
                                        {filteredOrganizers.length} results found for your search.
                                    </p>
                                </div>
                            </div>

                            {interactionNotice && (
                                <div className="mb-10 p-5 rounded-2xl bg-[#F2F2F2] border-2 border-[#38BDF2]/30 text-[#38BDF2] text-xs font-black uppercase tracking-widest shadow-lg shadow-[#38BDF2]/5 animate-in fade-in slide-in-from-top-4 flex items-center gap-3">
                                    <ICONS.Info className="w-5 h-5 shrink-0" />
                                    <span>{interactionNotice}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                                {filteredOrganizers.map((org) => (
                                    <OrganizerCard
                                        key={org.organizerId}
                                        organizer={org}
                                        rank={popularRanks.get(org.organizerId)}
                                        isFollowing={isFollowing(org.organizerId)}
                                        onFollow={(e) => handleFollow(org.organizerId, e)}
                                        onClick={() => navigate(`/organizer/${org.organizerId}`)}
                                    />
                                ))}
                            </div>

                            {filteredOrganizers.length === 0 && (
                                <div className="text-center py-24 bg-[#E8E8E8]/50 rounded-3xl border-4 border-dashed border-[#2E2E2F]/5">
                                    <div className="w-20 h-20 bg-[#F2F2F2] rounded-full flex items-center justify-center mx-auto mb-6">
                                        <ICONS.Users className="w-10 h-10 text-[#2E2E2F]" />
                                    </div>
                                    <h2 className="text-xl font-black text-[#2E2E2F] tracking-tighter uppercase mb-2">No results found</h2>
                                    <p className="text-[#2E2E2F] font-bold text-sm max-w-[300px] mx-auto leading-relaxed">
                                        {filterMode === 'following'
                                            ? "You aren't following any organizations that match this search."
                                            : "No organizers match your current search terms."}
                                    </p>
                                </div>
                            )}
                        </div>
                </div>
            </div>

            {/* Interaction Notification Toast */}
            {interactionNotice && (
                <div className="fixed bottom-12 right-12 z-[100] animate-in slide-in-from-bottom-6 duration-500">
                    <div className="bg-[#2E2E2F] text-white px-8 py-6 rounded-xl shadow-2xl flex items-center gap-5 border border-white/10 backdrop-blur-xl">
                        <div className="w-10 h-10 rounded-xl bg-[#38BDF2] flex items-center justify-center">
                            <ICONS.Check className="w-5 h-5 text-white" strokeWidth={4} />
                        </div>
                        <div className="pr-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#38BDF2] mb-1">System Update</p>
                            <p className="text-sm font-bold tracking-tight">{interactionNotice}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
