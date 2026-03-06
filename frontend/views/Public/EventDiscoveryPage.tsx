import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Event, UserRole } from '../../types';
import { Button, PageLoader } from '../../components/Shared';
import { ICONS } from '../../constants';
import { EVENT_CATEGORIES, getEventCategoryKeys } from '../../utils/eventCategories';
import { useUser } from '../../context/UserContext';
import { useEngagement } from '../../context/EngagementContext';
import { EventCard } from './EventList';

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
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [interactionNotice, setInteractionNotice] = useState('');

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

    // Filtering logic (Frontend filters on top of backend results)
    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            if (selectedCategories.length > 0) {
                const eventCats = getEventCategoryKeys(event);
                if (!selectedCategories.some(cat => eventCats.includes(cat as any))) return false;
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
    }, [events, selectedCategories, selectedDate, selectedPrice, selectedFormat, showFollowedOnly, likedEventIds, sortBy]);

    const toggleCategory = (catKey: string) => {
        setSelectedCategories(prev =>
            prev.includes(catKey) ? prev.filter(k => k !== catKey) : [...prev, catKey]
        );
    };

    if (loading) return <PageLoader label="Discovering events..." variant="page" />;

    return (
        <div className="min-h-screen bg-[#F2F2F2]">
            {/* Branded Banner Section */}
            <section className="relative w-full h-[260px] sm:h-[320px] overflow-hidden mb-8">
                <div className="absolute inset-0 bg-[linear-gradient(116deg,#38BDF2_0%,#38BDF2_44%,#F2F2F2_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,62,134,0.45)_0%,rgba(0,62,134,0.2)_34%,rgba(0,62,134,0)_72%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_32%,rgba(255,255,255,0.34),transparent_46%),linear-gradient(90deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_26%,rgba(255,255,255,0)_52%)]" />
                <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl items-center px-6 sm:px-8">
                    <div className="max-w-[720px]">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 mb-3">Discovery Mode</p>
                        <h1 className="text-[2.5rem] font-black leading-none tracking-tight text-white sm:text-6xl">Find Your <span className="text-white/80">Vibe</span></h1>
                        <p className="mt-6 max-w-[640px] text-base leading-relaxed text-white/95 sm:text-[1.1rem]">
                            {searchTerm ? <>Showing results for <span className="font-black">"{searchTerm}"</span></> : "Browse hundreds of professional events and narrow down your search using our advanced filtering system."}
                        </p>
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
                {/* Filter Sidebar */}
                <aside className={`${isSidebarCollapsed ? 'w-full lg:w-14' : 'w-full lg:w-72'} shrink-0`}>
                    <div className={`${isSidebarCollapsed ? '' : 'border-b border-[#2E2E2F]/5 pb-6'} mb-6`}>
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                            className={`inline-flex items-center gap-2 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#2E2E2F]/55 hover:text-[#2E2E2F] hover:border-[#38BDF2]/40 transition-colors ${isSidebarCollapsed ? 'w-full lg:w-auto lg:px-2.5 justify-center' : ''}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" d={isSidebarCollapsed ? "M4 6h16M4 12h16M4 18h16" : "M4 6h16M4 12h10M4 18h16"} />
                            </svg>
                            <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>{isSidebarCollapsed ? 'Show Filters' : 'Hide Filters'}</span>
                        </button>
                    </div>

                    {!isSidebarCollapsed && (
                        <div className="space-y-12">
                    {/* Category Filter */}
                    <div className="border-b border-[#2E2E2F]/5 pb-8">
                        <button
                            onClick={() => toggleSection('categories')}
                            className="w-full flex items-center justify-between group mb-2"
                        >
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]/40 group-hover:text-[#2E2E2F] transition-colors">Category</h3>
                            <svg className={`w-3.5 h-3.5 text-[#2E2E2F]/30 transition-transform duration-300 ${sectionsOpen.categories ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {sectionsOpen.categories && (
                            <div className="flex flex-col gap-3.5 mt-6 animate-in slide-in-from-top-2 duration-300">
                                {EVENT_CATEGORIES.map(cat => {
                                    const isChecked = selectedCategories.includes(cat.key);
                                    return (
                                        <label key={cat.key} className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="peer sr-only"
                                                    checked={isChecked}
                                                    onChange={() => toggleCategory(cat.key)}
                                                />
                                                <div className="w-5 h-5 rounded-lg border-2 border-[#2E2E2F]/10 bg-[#F2F2F2] peer-checked:bg-[#38BDF2] peer-checked:border-[#38BDF2] transition-all duration-200" />
                                                <ICONS.Check className="absolute inset-0 m-auto w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
                                            </div>
                                            <div className={`w-6 h-6 rounded-lg border transition-colors flex items-center justify-center ${isChecked
                                                ? 'border-[#38BDF2]/45 bg-[#38BDF2]/10 text-[#38BDF2]'
                                                : 'border-[#2E2E2F]/10 bg-[#F2F2F2] text-[#2E2E2F]/55 group-hover:text-[#38BDF2] group-hover:border-[#38BDF2]/30'
                                                }`}>
                                                <cat.Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-sm font-bold text-[#2E2E2F]/70 group-hover:text-[#2E2E2F] transition-colors">{cat.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Date Filter */}
                    <div className="border-b border-[#2E2E2F]/5 pb-8">
                        <button
                            onClick={() => toggleSection('date')}
                            className="w-full flex items-center justify-between group mb-2"
                        >
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]/40 group-hover:text-[#2E2E2F] transition-colors">Date</h3>
                            <svg className={`w-3.5 h-3.5 text-[#2E2E2F]/30 transition-transform duration-300 ${sectionsOpen.date ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {sectionsOpen.date && (
                            <div className="flex flex-col gap-3.5 mt-6 animate-in slide-in-from-top-2 duration-300">
                                {[
                                    { id: 'all', label: 'Any time' },
                                    { id: 'today', label: 'Today' },
                                    { id: 'tomorrow', label: 'Tomorrow' },
                                    { id: 'weekend', label: 'This Weekend' },
                                ].map(date => (
                                    <label key={date.id} className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="date"
                                            className="peer sr-only"
                                            checked={selectedDate === date.id}
                                            onChange={() => setSelectedDate(date.id)}
                                        />
                                        <div className="w-5 h-5 rounded-full border-2 border-[#2E2E2F]/10 bg-[#F2F2F2] peer-checked:border-[#38BDF2] peer-checked:bg-[#38BDF2]/10 transition-all duration-200 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-[#38BDF2] opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-sm font-bold text-[#2E2E2F]/70 group-hover:text-[#2E2E2F] transition-colors">{date.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Price Filter */}
                    <div className="border-b border-[#2E2E2F]/5 pb-8">
                        <button
                            onClick={() => toggleSection('price')}
                            className="w-full flex items-center justify-between group mb-2"
                        >
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]/40 group-hover:text-[#2E2E2F] transition-colors">Price</h3>
                            <svg className={`w-3.5 h-3.5 text-[#2E2E2F]/30 transition-transform duration-300 ${sectionsOpen.price ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {sectionsOpen.price && (
                            <div className="flex flex-col gap-3 mt-6 animate-in slide-in-from-top-2 duration-300">
                                {[
                                    { id: 'all', label: 'All Prices' },
                                    { id: 'free', label: 'Free' },
                                    { id: 'paid', label: 'Paid' },
                                ].map(price => (
                                    <button
                                        key={price.id}
                                        onClick={() => setSelectedPrice(price.id)}
                                        className={`text-left px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedPrice === price.id
                                            ? 'bg-[#2E2E2F] text-white border-[#2E2E2F]'
                                            : 'bg-[#F2F2F2] text-[#2E2E2F]/40 border-[#2E2E2F]/10 hover:border-[#38BDF2]/40 hover:text-[#38BDF2]'
                                            }`}
                                    >
                                        {price.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Format Filter */}
                    <div className="border-b border-[#2E2E2F]/5 pb-8">
                        <button
                            onClick={() => toggleSection('format')}
                            className="w-full flex items-center justify-between group mb-2"
                        >
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]/40 group-hover:text-[#2E2E2F] transition-colors">Format</h3>
                            <svg className={`w-3.5 h-3.5 text-[#2E2E2F]/30 transition-transform duration-300 ${sectionsOpen.format ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {sectionsOpen.format && (
                            <div className="flex flex-col gap-3.5 mt-6 animate-in slide-in-from-top-2 duration-300">
                                {[
                                    { id: 'all', label: 'All Formats' },
                                    { id: 'online', label: 'Online' },
                                    { id: 'in-person', label: 'In-person' },
                                ].map(format => (
                                    <label key={format.id} className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="format"
                                            className="peer sr-only"
                                            checked={selectedFormat === format.id}
                                            onChange={() => setSelectedFormat(format.id)}
                                        />
                                        <div className="w-5 h-5 rounded-lg border-2 border-[#2E2E2F]/10 bg-[#F2F2F2] peer-checked:border-[#38BDF2] peer-checked:bg-[#38BDF2]/10 transition-all duration-200 flex items-center justify-center">
                                            <ICONS.Check className="w-3 h-3 text-[#38BDF2] opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
                                        </div>
                                        <span className="text-sm font-bold text-[#2E2E2F]/70 group-hover:text-[#2E2E2F] transition-colors">{format.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Language and Following */}
                    <div>
                        <button
                            onClick={() => toggleSection('advanced')}
                            className="w-full flex items-center justify-between group mb-2"
                        >
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]/40 group-hover:text-[#2E2E2F] transition-colors">Advanced</h3>
                            <svg className={`w-3.5 h-3.5 text-[#2E2E2F]/30 transition-transform duration-300 ${sectionsOpen.advanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {sectionsOpen.advanced && (
                            <div className="space-y-8 mt-8 animate-in slide-in-from-top-2 duration-300">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]/40 mb-5">Language</h3>
                                    <select
                                        className="w-full bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-[#2E2E2F] outline-none focus:border-[#38BDF2]/40 appearance-none"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%232E2E2F' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1rem' }}
                                    >
                                        <option>English</option>
                                        <option>Tagalog / Filipino</option>
                                        <option>Others</option>
                                    </select>
                                </div>

                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]/40 mb-5">By Following</h3>
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-xs font-bold text-[#2E2E2F]/70 group-hover:text-[#2E2E2F] transition-colors">Following Only</span>
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={showFollowedOnly}
                                                onChange={() => setShowFollowedOnly(!showFollowedOnly)}
                                            />
                                            <div className="w-10 h-6 bg-[#2E2E2F]/10 rounded-full peer peer-checked:bg-[#38BDF2] transition-all duration-300" />
                                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-4 shadow-sm" />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                        </div>
                    )}
                </aside>

                {/* Event Listings */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 pb-6 border-b border-[#2E2E2F]/5 gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-[#2E2E2F] tracking-tight">Events in <span className="text-[#38BDF2]">{locationTerm || 'Anywhere'}</span></h2>
                            <p className="text-[#2E2E2F]/40 text-[10px] font-black uppercase tracking-widest mt-2">{filteredEvents.length} results matching filters</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap justify-start sm:justify-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#2E2E2F]/40">Sort:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-xl px-4 py-2 text-xs font-bold text-[#2E2E2F] outline-none focus:border-[#38BDF2]/40 transition-colors"
                            >
                                <option value="relevance">Relevance</option>
                                <option value="newest">Newest</option>
                                <option value="date_soon">Soonest</option>
                                <option value="price_low">Price: Low to High</option>
                            </select>
                        </div>
                    </div>

                    {filteredEvents.length > 0 ? (
                        <div className={`grid gap-8 ${isSidebarCollapsed ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                            {filteredEvents.map(event => (
                                <EventCard key={event.eventId} event={event} onActionNotice={setInteractionNotice} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 text-center bg-[#F2F2F2] rounded-[3rem] border-2 border-dashed border-[#2E2E2F]/5">
                            <div className="w-20 h-20 bg-[#2E2E2F]/5 rounded-full flex items-center justify-center mx-auto mb-8">
                                <ICONS.Search className="w-10 h-10 text-[#2E2E2F]/15" />
                            </div>
                            <h3 className="text-2xl font-black text-[#2E2E2F] mb-3">No matching events</h3>
                            <p className="text-[#2E2E2F]/40 text-sm font-medium max-w-[300px] mx-auto mb-10">We couldn't find any events that match your current filter selection.</p>
                            <Button
                                variant="outline"
                                className="px-10 py-4 rounded-2xl border-[#2E2E2F]/10 hover:border-[#38BDF2] hover:text-[#38BDF2] transition-all"
                                onClick={() => {
                                    // Resetting means navigating back to a clean state
                                    navigate('/browse-events');
                                    setSelectedCategories([]);
                                    setSelectedDate('all');
                                    setSelectedPrice('all');
                                    setSelectedFormat('all');
                                    setShowFollowedOnly(false);
                                }}
                            >
                                Reset all filters
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {interactionNotice && (
                <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-[#2E2E2F] text-[#F2F2F2] px-8 py-5 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(46,46,47,0.5)] flex items-center gap-4 border border-white/5 backdrop-blur-md">
                        <div className="w-8 h-8 rounded-full bg-[#38BDF2] flex items-center justify-center shrink-0">
                            <ICONS.Check className="w-4 h-4 text-white" strokeWidth={4} />
                        </div>
                        <span className="text-sm font-bold tracking-tight">{interactionNotice}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
