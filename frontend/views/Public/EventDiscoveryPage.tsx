import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Event, UserRole } from '../../types';
import { Button, PageLoader } from '../../components/Shared';
import { Skeleton, EventCardSkeleton } from '../../components/Shared/Skeleton';
import { ICONS } from '../../constants';
import { EVENT_CATEGORIES } from '../../utils/eventCategories';
// Removed static category helpers to use dynamic DB-driven ones
import { useUser } from '../../context/UserContext';


import { useEngagement } from '../../context/EngagementContext';
import { EventCard } from './EventList';
import { DestinationSlider } from '../../components/DestinationSlider';

export const EventDiscoveryPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { role } = useUser();
    const { likedEventIds } = useEngagement();

    // State for search and filters
    const [searchTerm, setSearchTerm] = useState('');
    const [locationTerm, setLocationTerm] = useState('');

    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('all');
    const [selectedPrice, setSelectedPrice] = useState<string>('all');
    const [selectedFormat, setSelectedFormat] = useState<string>('all');
    const [showFollowedOnly, setShowFollowedOnly] = useState(false);
    const [sortBy, setSortBy] = useState<string>('relevance');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const [sectionsOpen, setSectionsOpen] = useState({
        categories: true,
        date: true,
        price: true,
        format: true,
        advanced: true
    });

    const toggleSection = (section: keyof typeof sectionsOpen) => {
        setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Data state
    const [categories, setCategories] = useState<any[]>([]);
    const [events, setEvents] = useState<Event[]>([]);


    const [loading, setLoading] = useState(true);
    const [interactionNotice, setInteractionNotice] = useState('');
    const [promotedEvents, setPromotedEvents] = useState<Event[]>([]);
    const [loadingPromoted, setLoadingPromoted] = useState(true);

    // Fetch dynamic categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/categories`);
                const data = await response.json();
                console.log("Discovery Categories from API:", data);
                if (Array.isArray(data) && data.length > 0) {
                    const active = data.filter(c => c.is_active);
                    if (active.length > 0) {
                        setCategories(active.map(c => ({
                            ...c,
                            Icon: (ICONS as any)[c.icon_name] || ICONS.Layout
                        })));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch discovery categories:", err);
            }
        };
        fetchCategories();
    }, []);

    // Sync state with URL params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const search = params.get('search') || '';
        const loc = params.get('location') || '';

        setSearchTerm(search);
        setLocationTerm(loc);

        // When URL params change, we fetch new data
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch events from backend with search and location filters
                const data = await apiService.getEvents(1, 100, search, loc);
                setEvents(data.events || []);
            } catch (err) {
                console.error('Failed to fetch discovery events', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [location.search]);

    // Load promoted events on component mount
    useEffect(() => {
        const loadPromotedEvents = async () => {
            setLoadingPromoted(true);
            try {
                const result = await apiService.getPromotedEvents(6); // Get top 6 promoted events
                setPromotedEvents(result.events || []);
            } catch (err) {
                console.error('Failed to load promoted events', err);
            } finally {
                setLoadingPromoted(false);
            }
        };
        loadPromotedEvents();
    }, []);

    // Filtering logic (Frontend filters on top of backend results)
    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            if (selectedCategories.length > 0) {
                // Dynamic keyword matching for each selected category
                const sourceText = `${event.eventName || ''} ${event.description || ''} ${event.locationText || ''}`.toLowerCase();
                const matches = selectedCategories.some(catKey => {
                    const cat = categories.find(c => c.key === catKey);
                    if (!cat) return false;
                    const keywords = Array.isArray(cat.keywords) ? cat.keywords : [];
                    return keywords.some((keyword: string) => sourceText.includes(keyword.toLowerCase()));
                });
                if (!matches) return false;
            }

            if (selectedFormat === 'online' && event.locationType !== 'ONLINE') return false;
            if (selectedFormat === 'in-person' && event.locationType === 'ONLINE') return false;

            const minPrice = event.ticketTypes?.length
                ? Math.min(...event.ticketTypes.map(t => t.priceAmount))
                : 0;
            if (selectedPrice === 'free' && minPrice > 0) return false;
            if (selectedPrice === 'paid' && minPrice === 0) return false;

            const eventDate = new Date(event.startAt);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate === 'today') {
                const tonight = new Date(today);
                tonight.setHours(23, 59, 59, 999);
                if (!(eventDate >= today && eventDate <= tonight)) return false;
            } else if (selectedDate === 'tomorrow') {
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const tomorrowNight = new Date(tomorrow);
                tomorrowNight.setHours(23, 59, 59, 999);
                if (!(eventDate >= tomorrow && eventDate <= tomorrowNight)) return false;
            } else if (selectedDate === 'weekend') {
                const day = today.getDay();
                const diff = day === 0 ? 0 : 6 - day;
                const sat = new Date(today);
                sat.setDate(today.getDate() + diff);
                const sun = new Date(sat);
                sun.setDate(sat.getDate() + 1);
                sun.setHours(23, 59, 59, 999);
                if (!(eventDate >= sat && eventDate <= sun)) return false;
            }

            if (showFollowedOnly) {
                const organizerId = event.organizerId || event.organizer?.organizerId || '';
                if (!organizerId || !likedEventIds.includes(organizerId)) return false;
            }

            return true;
        }).sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
            }
            if (sortBy === 'price_low') {
                const aPrice = a.ticketTypes?.length ? Math.min(...a.ticketTypes.map(t => t.priceAmount)) : 0;
                const bPrice = b.ticketTypes?.length ? Math.min(...b.ticketTypes.map(t => t.priceAmount)) : 0;
                return aPrice - bPrice;
            }
            if (sortBy === 'date_soon') {
                return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
            }
            return 0; // Default relevance
        });
    }, [events, categories, selectedCategories, selectedDate, selectedPrice, selectedFormat, showFollowedOnly, likedEventIds, sortBy]);

    // Combine promoted and filtered events, with promoted first
    const combinedEvents = useMemo(() => {
        const promotedIds = new Set(promotedEvents.map(e => e.eventId));
        const nonPromotedFiltered = filteredEvents.filter(e => !promotedIds.has(e.eventId));

        // Add promoted flag to each promoted event
        const markedPromotedEvents = promotedEvents.map(e => ({ ...e, is_promoted: true }));

        return [...markedPromotedEvents, ...nonPromotedFiltered];
    }, [promotedEvents, filteredEvents]);

    const toggleCategory = (catKey: string) => {
        setSelectedCategories(prev =>
            prev.includes(catKey) ? prev.filter(k => k !== catKey) : [...prev, catKey]
        );
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-[#F2F2F2]">
                {/* Skeleton Sidebar */}
                <aside className="hidden md:block w-[200px] md:w-[260px] bg-[#F9FAFB] border-r border-[#E5E7EB] p-8 space-y-12 animate-in slide-in-from-left-4 duration-500">
                    <div className="space-y-4">
                        <Skeleton variant="text" width="70%" height={28} />
                        <Skeleton variant="text" width="40%" height={16} />
                    </div>
                    <div className="space-y-8 pt-8">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton variant="rect" width={32} height={32} className="rounded-xl" />
                                <Skeleton variant="text" width="60%" />
                            </div>
                        ))}
                    </div>
                </aside>
                {/* Skeleton Main Content */}
                <main className="flex-1 p-8 md:p-12 overflow-y-auto">
                    <div className="max-w-7xl mx-auto space-y-12">
                        {/* Header Skeleton */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="space-y-4">
                                <Skeleton variant="text" width={300} height={40} />
                                <Skeleton variant="text" width={120} height={16} />
                            </div>
                            <Skeleton variant="rect" width={160} height={48} className="rounded-xl shadow-sm" />
                        </div>
                        {/* Grid Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                            {[...Array(6)].map((_, i) => (
                                <EventCardSkeleton key={i} />
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#F2F2F2]">
            {/* Edge Left Filter Sidebar */}
            <aside
                className={`hidden md:block bg-[#F9FAFB] border-r border-[#E5E7EB] sticky top-0 h-screen overflow-y-auto transition-all duration-500 ease-in-out z-20 ${isSidebarCollapsed ? 'w-16 md:w-20' : 'w-[200px] md:w-[260px]'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header for Filter */}
                    <div className="p-8 border-b border-black/5 flex items-center justify-between">
                        {!isSidebarCollapsed && (
                            <div>
                                <h1 className="text-[22px] font-black text-black tracking-tighter uppercase leading-none">Filters</h1>
                                <p className="text-[10px] font-black text-black uppercase tracking-[0.2em] mt-2">Personalize Feed</p>
                            </div>
                        )}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className={`w-10 h-10 rounded-xl bg-[#F2F2F2] border border-black/10 flex items-center justify-center text-black hover:bg-[#38BDF2] hover:text-white transition-all transform active:scale-90 ${isSidebarCollapsed ? 'mx-auto' : ''}`}
                        >
                            <svg className={`w-5 h-5 transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                        </button>
                    </div>

                    {!isSidebarCollapsed && (
                        <div className="flex-1 p-8 space-y-12 scrollbar-hide">
                            {/* Category Area */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-[0.1em] text-black">Category</h3>
                                    {selectedCategories.length > 0 && (
                                        <button
                                            onClick={() => setSelectedCategories([])}
                                            className="text-[10px] font-bold text-[#38BDF2] hover:text-black transition-colors"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {categories.map(cat => {
                                        const isChecked = selectedCategories.includes(cat.key);
                                        return (
                                            <button
                                                key={cat.key}
                                                onClick={() => toggleCategory(cat.key)}
                                                className={`flex items-center gap-4 w-full group transition-all ${isChecked ? 'text-[#38BDF2]' : 'text-black hover:text-[#38BDF2]'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isChecked ? 'bg-[#38BDF2]/10' : 'bg-[#F2F2F2] group-hover:bg-[#38BDF2]/5'
                                                    }`}>
                                                    <cat.Icon className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-sm tracking-tight">{cat.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Occurrence Area */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-[0.1em] text-black">Occurrence</h3>
                                <div className="space-y-3">
                                    {[
                                        { id: 'all', label: 'Any time' },
                                        { id: 'today', label: 'Today' },
                                        { id: 'tomorrow', label: 'Tomorrow' },
                                        { id: 'weekend', label: 'Weekend' },
                                    ].map(date => (
                                        <button
                                            key={date.id}
                                            onClick={() => setSelectedDate(date.id)}
                                            className={`flex items-center gap-3 w-full group transition-all ${selectedDate === date.id ? 'text-[#38BDF2]' : 'text-black hover:text-[#38BDF2]'
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full transition-all ${selectedDate === date.id ? 'bg-[#38BDF2] scale-125' : 'bg-[#E5E7EB]'}`} />
                                            <span className="font-bold text-sm tracking-tight">{date.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Area */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-[0.1em] text-black">Price Format</h3>
                                <div className="flex flex-col gap-3">
                                    {[
                                        { id: 'all', label: 'All', icon: ICONS.Layout },
                                        { id: 'free', label: 'Free', icon: ICONS.Check },
                                        { id: 'paid', label: 'Paid', icon: ICONS.CreditCard },
                                    ].map(price => (
                                        <button
                                            key={price.id}
                                            onClick={() => setSelectedPrice(price.id)}
                                            className={`flex items-center gap-4 w-full group transition-all ${selectedPrice === price.id ? 'text-[#38BDF2]' : 'text-black hover:text-[#38BDF2]'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${selectedPrice === price.id ? 'bg-[#38BDF2]/10' : 'bg-[#F2F2F2] group-hover:bg-[#38BDF2]/5'}`}>
                                                <price.icon className="w-4 h-4" />
                                            </div>
                                            <span className="font-bold text-sm tracking-tight">{price.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 h-screen overflow-y-auto scrollbar-hide">
                {/* Hero Section Removed per user request */}

                <div className="max-w-[88rem] mx-auto px-6 sm:px-10">
                    <DestinationSlider onSelect={(city) => {
                        navigate(`?location=${encodeURIComponent(city)}`);
                        setLocationTerm(city);
                        const target = document.getElementById('discovery-results');
                        if (target) target.scrollIntoView({ behavior: 'smooth' });
                    }} />
                </div>

                <div className="px-6 sm:px-10 py-12">
                    {/* Results Header - Aligned with search row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                        <div className="flex-1" id="discovery-results">
                            <h2 className="text-4xl font-black text-black tracking-tighter uppercase leading-none">
                                {locationTerm ? `Events in ${locationTerm}` : 'Browse All Sessions'}
                            </h2>
                            <p className="text-[11px] font-black text-black uppercase tracking-[0.2em] mt-3">
                                {combinedEvents.length} Sessions found
                            </p>
                        </div>

                        <div className="flex items-center bg-white px-5 py-3 rounded-xl border border-black/5 shadow-sm whitespace-nowrap">
                            <span className="text-[10px] font-black uppercase tracking-widest text-black mr-3">Sort By</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-transparent text-xs font-bold text-black outline-none cursor-pointer"
                            >
                                <option value="relevance">Relevance</option>
                                <option value="newest">Newest Arrivals</option>
                                <option value="date_soon">Soonest Date</option>
                                <option value="price_low">Price: Low to High</option>
                            </select>
                        </div>
                    </div>

                    {/* Event Grid - Combined promoted and filtered events */}
                    {combinedEvents.length > 0 ? (
                        <div className="mb-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                                {combinedEvents.map((event, idx) => (
                                    <div
                                        key={event.eventId}
                                        className="relative animate-in fade-in slide-in-from-bottom-4 duration-700"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        {/* Featured Badge - Show only for promoted events */}
                                        {(event.isPromoted || event.is_promoted) && (
                                            <div className="group/promoted relative absolute -top-4 left-4 z-10">
                                                <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#38BDF2]/10 text-[#38BDF2] text-[10px] font-black uppercase tracking-[0.15em] border border-[#38BDF2]/30 whitespace-nowrap cursor-help">
                                                    <ICONS.Info className="w-3.5 h-3.5" strokeWidth={3} />
                                                    PROMOTED
                                                </div>
                                                {/* Tooltip Overlay */}
                                                <div className="absolute bottom-full left-0 mb-3 opacity-0 group-hover/promoted:opacity-100 pointer-events-none transition-all duration-300 translate-y-1 group-hover/promoted:translate-y-0 z-50">
                                                    <div className="bg-black text-white text-[9px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl border border-white/10 uppercase tracking-widest text-center leading-tight">
                                                        Featured: Highlighted via<br />Organizer Subscription
                                                    </div>
                                                    <div className="w-2 h-2 bg-black rotate-45 absolute -bottom-1 left-4 border-r border-b border-white/10"></div>
                                                </div>
                                            </div>
                                        )}
                                        <EventCard event={event} onActionNotice={setInteractionNotice} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {/* No Events State */}
                    {combinedEvents.length === 0 && (
                        <div>
                            <div className="w-24 h-24 bg-[#F2F2F2] rounded-xl border-2 border-black/5 flex items-center justify-center mb-8">
                                <ICONS.Search className="w-10 h-10 text-black" />
                            </div>
                            <h3 className="text-2xl font-black text-black uppercase tracking-tighter mb-4">No Sessions Matching Selection</h3>
                            <p className="text-black text-sm font-medium max-w-[320px] mb-10 leading-relaxed">
                                We couldn't find any results specifically for these filters. Try broadening your date or category selection.
                            </p>
                            <Button
                                className="px-12 py-5 rounded-xl font-black uppercase tracking-widest bg-black text-white hover:bg-[#38BDF2] transition-colors"
                                onClick={() => {
                                    navigate('/browse-events');
                                    setSelectedCategories([]);
                                    setSelectedDate('all');
                                    setSelectedPrice('all');
                                    setSelectedFormat('all');
                                }}
                            >
                                Reset All Parameters
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            {/* Interaction Notification Toast */}
            {interactionNotice && (
                <div className="fixed bottom-12 right-12 z-[100] animate-in slide-in-from-bottom-6 duration-500">
                    <div className="bg-black text-white px-8 py-6 rounded-xl shadow-2xl flex items-center gap-5 border border-white/10 backdrop-blur-xl">
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

