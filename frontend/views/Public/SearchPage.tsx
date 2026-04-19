import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ICONS } from '../../constants';
import { apiService } from '../../services/apiService';
import { Event } from '../../types';
import { EventCard } from '../../components/EventCard';
import { useUser } from '../../context/UserContext';
import { EventCardSkeleton } from '../../components/Shared/Skeleton';

const SEARCH_HISTORY_KEY = 'startuplab_search_history';

export const SearchPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useUser();
    
    // States
    const [searchTerm, setSearchTerm] = useState('');
    const [locationTerm, setLocationTerm] = useState('Metro Manila, PH');
    const [results, setResults] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const [searching, setSearching] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const searchTimeout = useRef<any>(null);

    // Helper to map API Event to EventCardData
    const mapToCardData = (ev: Event) => ({
        eventId: ev.eventId,
        eventName: ev.eventName,
        image_url: typeof ev.imageUrl === 'string' ? ev.imageUrl : (ev.imageUrl as any)?.url,
        startAt: ev.startAt,
        locationText: ev.locationText,
        organizerName: ev.organizer?.organizerName || 'StartupLab Organizer',
        price_min: ev.ticketTypes && ev.ticketTypes.length > 0 ? Math.min(...ev.ticketTypes.map(t => t.priceAmount)) : 0,
        is_promoted: ev.is_promoted || ev.isPromoted,
        likesCount: ev.likesCount || 0,
        ticketsAvailable: ev.ticketTypes ? ev.ticketTypes.reduce((acc, t) => acc + (t.quantityTotal - (t.quantitySold || 0)), 0) : 0,
        totalTickets: ev.ticketTypes ? ev.ticketTypes.reduce((acc, t) => acc + t.quantityTotal, 0) : 0
    });

    // Initial Load - History & Autofocus
    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
        
        const loadHistory = async () => {
            if (isAuthenticated) {
                try {
                    const dbHistory = await apiService.getSearchHistory();
                    setHistory(dbHistory);
                } catch (err) {
                    console.error('Failed to load search history:', err);
                }
            } else {
                const localHistory = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
                setHistory(localHistory);
            }
        };
        loadHistory();

        // Initialize from query param if any
        const params = new URLSearchParams(location.search);
        const q = params.get('q');
        const loc = params.get('loc');
        if (loc) setLocationTerm(loc);
        if (q) {
            setSearchTerm(q);
            performSearch(q, loc || locationTerm);
        }
    }, [isAuthenticated, location.search]);

    const performSearch = async (query: string, loc?: string) => {
        const activeLoc = loc || locationTerm;
        if (!query.trim() && !activeLoc.trim()) {
            setResults([]);
            setSearching(false);
            return;
        }

        setLoading(true);
        setSearching(true);
        try {
            // We pass location to the API service if supported, or just filter on client
            // For now, let's keep it simple and pass query
            const data = await apiService.getEvents(1, 20, query);
            
            // Client-side location filtering if needed
            let filteredResults = data.events || [];
            if (activeLoc && activeLoc !== 'Metro Manila, PH') {
                filteredResults = filteredResults.filter(e => 
                    e.locationText.toLowerCase().includes(activeLoc.toLowerCase())
                );
            }

            setResults(filteredResults);
        } catch (err) {
            console.error("Search failed:", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        
        searchTimeout.current = setTimeout(() => {
            performSearch(val, locationTerm);
        }, 400);
    };

    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocationTerm(val);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        
        searchTimeout.current = setTimeout(() => {
            performSearch(searchTerm, val);
        }, 400);
    };

    const handleSearchSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = searchTerm.trim();
        if (trimmed) {
            addToHistory(trimmed);
            performSearch(trimmed, locationTerm);
        }
    };

    const handleGPS = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    // Use a public reverse geocoding API (Nominatim) to get the actual place name
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`);
                    const data = await response.json();
                    
                    // Extract city, town, or village name
                    const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county || 'Current Location';
                    
                    setLocationTerm(city);
                    await performSearch(searchTerm, city);
                } catch (err) {
                    console.error("Reverse Geocoding failed:", err);
                    setLocationTerm('Current Location');
                    await performSearch(searchTerm, 'Current Location');
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                console.error("GPS Error:", error);
                alert("Unable to retrieve your location.");
                setLoading(false);
            }
        );
    };

    const addToHistory = async (term: string) => {
        if (!term.trim()) return;
        const trimmed = term.trim();
        
        if (isAuthenticated) {
            try {
                await apiService.saveSearchHistory(trimmed);
                const updated = await apiService.getSearchHistory();
                setHistory(updated);
            } catch (err) {
                console.error('Failed to save search history:', err);
            }
        } else {
            const updated = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, 10);
            setHistory(updated);
            localStorage.setItem('search_history', JSON.stringify(updated));
        }
    };

    const removeFromHistory = async (e: React.MouseEvent, term: string) => {
        e.stopPropagation();
        if (isAuthenticated) {
            try {
                await apiService.deleteSearchHistoryEntry(term);
                const updated = await apiService.getSearchHistory();
                setHistory(updated);
            } catch (err) {
                console.error('Failed to remove history entry:', err);
            }
        } else {
            const updated = history.filter(h => h !== term);
            setHistory(updated);
            localStorage.setItem('search_history', JSON.stringify(updated));
        }
    };

    const clearHistory = async () => {
        if (isAuthenticated) {
            try {
                await apiService.clearSearchHistory();
                setHistory([]);
            } catch (err) {
                console.error('Failed to clear history:', err);
            }
        } else {
            setHistory([]);
            localStorage.removeItem('search_history');
        }
    };

    return (
        <div className="min-h-screen bg-[#F2F2F2] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-[100] bg-[#F2F2F2]/90 backdrop-blur-xl border-b border-[#2E2E2F]/10 px-4 py-3 flex items-center gap-2">
                <button 
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#2E2E2F]/5 transition-colors shrink-0"
                >
                    <ICONS.ArrowLeft className="w-5 h-5 text-[#2E2E2F]" />
                </button>
                
                <div className="flex-1 flex items-center gap-1 bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl p-1 shadow-sm focus-within:border-[#38BDF2] focus-within:ring-4 focus-within:ring-[#38BDF2]/10 transition-all">
                    <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <ICONS.Search className="w-4 h-4 text-[#2E2E2F]/30" />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Find events, people, places..."
                            value={searchTerm}
                            onChange={handleInputChange}
                            className="w-full bg-transparent py-2 pl-9 pr-2 text-[14px] font-medium text-[#2E2E2F] placeholder:text-[#2E2E2F]/30 outline-none"
                        />
                        
                        {locationTerm && locationTerm !== 'Metro Manila, PH' && (
                            <div className="shrink-0 flex items-center gap-1 pr-1 border-l border-[#2E2E2F]/5 pl-2">
                                <ICONS.MapPin className="w-3 h-3 text-[#38BDF2]" />
                                <span className="text-[11px] font-bold text-[#38BDF2] whitespace-nowrap">
                                    {locationTerm}
                                </span>
                            </div>
                        )}
                    </form>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={handleGPS}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${loading ? 'bg-black/5 text-black/20' : 'bg-[#38BDF2]/10 text-[#38BDF2] hover:bg-[#38BDF2] hover:text-white active:scale-95 shadow-sm'}`}
                      disabled={loading}
                      title="Current Location"
                    >
                        <ICONS.Compass className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {(searchTerm || searching) && (
                      <button 
                        onClick={() => {
                          setSearchTerm('');
                          setLocationTerm('Metro Manila, PH');
                          setResults([]);
                          setSearching(false);
                          inputRef.current?.focus();
                        }}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white active:scale-95 transition-all shadow-sm"
                        title="Clear Filters"
                      >
                          <ICONS.X className="w-5 h-5" />
                      </button>
                    )}
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6">
                {!searching ? (
                    /* History View */
                    <div>
                        {isAuthenticated && history.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-[#2E2E2F]/50">Recent Searches</h3>
                                    <button 
                                        onClick={clearHistory}
                                        className="text-[10px] font-bold text-[#38BDF2] uppercase tracking-wider hover:underline"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {history.map((term, index) => (
                                        <div 
                                            key={index}
                                            onClick={() => { setSearchTerm(term); performSearch(term, locationTerm); }}
                                            className="flex items-center justify-between py-2.5 px-4 rounded-xl hover:bg-[#2E2E2F]/5 border border-transparent hover:border-[#2E2E2F]/5 cursor-pointer transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <ICONS.History className="w-4 h-4 text-[#2E2E2F]/20 group-hover:text-[#38BDF2] transition-colors" />
                                                <span className="text-[14px] font-semibold text-[#2E2E2F]">{term}</span>
                                            </div>
                                            <button 
                                                onClick={(e) => removeFromHistory(e, term)}
                                                className="w-8 h-8 flex items-center justify-center text-[#2E2E2F]/30 hover:text-red-500 rounded-lg hover:bg-[#2E2E2F]/5"
                                            >
                                                <ICONS.X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isAuthenticated && (
                             <div className="py-20 text-center">
                                <div className="w-16 h-16 bg-[#F2F2F2] rounded-full border border-[#2E2E2F]/5 flex items-center justify-center mx-auto mb-4">
                                    <ICONS.Search className="w-8 h-8 text-[#2E2E2F]/10" />
                                </div>
                                <h3 className="text-lg font-bold text-[#2E2E2F]">Discover and Book Events</h3>
                                <p className="text-sm text-[#2E2E2F]/60 mt-1">Start typing to find amazing experiences near you.</p>
                             </div>
                        )}

                        {isAuthenticated && history.length === 0 && (
                             <div className="py-20 text-center">
                                <div className="w-16 h-16 bg-[#F2F2F2] rounded-full border border-[#2E2E2F]/5 flex items-center justify-center mx-auto mb-4">
                                    <ICONS.Plus className="w-8 h-8 text-[#2E2E2F]/10" />
                                </div>
                                <h3 className="text-lg font-bold text-[#2E2E2F]">No Recent Searches</h3>
                                <p className="text-sm text-[#2E2E2F]/60 mt-1">Discover new experiences by typing in the search bar.</p>
                             </div>
                        )}
                    </div>
                ) : (
                    /* Results View */
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#2E2E2F]/50">
                                {loading ? 'Searching Events...' : `Found ${results.length} results`}
                            </h3>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 gap-6">
                                {[...Array(3)].map((_, i) => <EventCardSkeleton key={i} />)}
                            </div>
                        ) : results.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6">
                                {results.map(event => (
                                    <div key={event.eventId} onClick={() => { if (searchTerm.trim()) addToHistory(searchTerm.trim()); }}>
                                         <EventCard event={mapToCardData(event)} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <div className="w-16 h-16 bg-[#F2F2F2] rounded-full border border-[#2E2E2F]/5 flex items-center justify-center mx-auto mb-4">
                                    <ICONS.AlertCircle className="w-8 h-8 text-orange-400/40" />
                                </div>
                                <h3 className="text-lg font-bold text-[#2E2E2F]">No matching events</h3>
                                <p className="text-sm text-[#2E2E2F]/60 mt-1">Try different keywords or check out trending events.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
