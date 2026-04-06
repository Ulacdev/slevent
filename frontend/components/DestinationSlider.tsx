import React, { useRef, useEffect, useState } from 'react';
import { ICONS } from '../constants';
import { apiService } from '../services/apiService';
import { DestinationSliderSkeleton } from './Shared/Skeleton';

const API_BASE = import.meta.env.VITE_API_BASE;

interface Destination {
    id: string;
    city: string;
    country: string;
    imageUrl: string;
    count?: number;
    isLive?: boolean;
}

// Curated pool of high-quality cityscapes specifically for Southeast Asia / PH contexts
const LOCAL_CITY_PH_VIBE = [
    'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?q=80&w=800&auto=format&fit=crop', // Manila High Rise
    'https://images.unsplash.com/photo-1582236378415-38fc7a871790?q=80&w=800&auto=format&fit=crop', // Cebu / Coastal
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=800&auto=format&fit=crop', // Tokyo-vibe
    'https://images.unsplash.com/photo-1525625239513-94e94faa53f0?q=80&w=800&auto=format&fit=crop', // Metro Hub
    'https://images.unsplash.com/photo-1544013919-4bb4bcbaaa63?q=80&w=800&auto=format&fit=crop', // Waterfront
];

const GLOBAL_CITY_VIBE = [
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=800&auto=format&fit=crop',
];

// Helper to generate a consistent hash from a string (the City Name)
const getCityHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
};

interface DestinationSliderProps {
    onSelect: (city: string) => void;
}

export const DestinationSlider: React.FC<DestinationSliderProps> = ({ onSelect }) => {
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [featuredCountry, setFeaturedCountry] = useState<string>('Philippines');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const res = await apiService._fetch(`${API_BASE}/api/discovery/destinations`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data) && data.length > 0) {
                        const countryFrequencies: Record<string, number> = {};
                        data.forEach((item: any) => {
                            const weight = item.likes || item.count || 1;
                            countryFrequencies[item.country] = (countryFrequencies[item.country] || 0) + weight;
                        });

                        const topCountry = Object.entries(countryFrequencies)
                            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Philippines';
                        setFeaturedCountry(topCountry);

                        const dynamicDests = data.map((item: any) => {
                            // If it's already curated with a high-res image, prioritize it
                            if (item.imageUrl && item.isCurated) {
                                return {
                                    id: item.id,
                                    city: item.city,
                                    country: item.country,
                                    count: item.count,
                                    isLive: true,
                                    imageUrl: item.imageUrl
                                };
                            }

                            // Permanent Seeding logic for fallback images: 
                            const isPH = (item.country || '').toLowerCase().includes('philippines') || (item.country || '').toLowerCase().includes('ph');
                            const pool = isPH ? LOCAL_CITY_PH_VIBE : GLOBAL_CITY_VIBE;
                            
                            const seed = getCityHash(item.city);
                            const imageUrl = pool[seed % pool.length];

                            return {
                                id: item.id || `live-${item.city}`,
                                city: item.city,
                                country: item.country,
                                count: item.count,
                                isLive: true,
                                imageUrl
                            };
                        });
                        setDestinations(dynamicDests);
                    }
                }
            } catch (err) {
                console.error('Failed to load dynamic locations:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLocations();
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (loading) return <DestinationSliderSkeleton />;

    if (destinations.length === 0) return null;

    return (
        <section className="py-24 space-y-12 overflow-hidden mx-0 px-0 translate-y-4" style={{ zoom: 0.9 }}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-4">
                <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-4 mb-1">
                        <span className="px-3 py-1 bg-[#38BDF2] rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-[#38BDF2]/20">
                            Community Picks
                        </span>
                        <div className="h-px bg-black/10 flex-1" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h2 className="text-3xl md:text-3.5xl font-black text-black tracking-tighter leading-none">
                            Top destinations in
                        </h2>
                        <span className="text-3xl md:text-3.5xl font-black text-[#38BDF2] tracking-tighter leading-none">
                            {featuredCountry}
                        </span>
                    </div>
                    <p className="text-black text-[18px] font-normal tracking-tight leading-relaxed">
                        Trending city hubs ranked by community popularity and likes.
                    </p>
                </div>
            </div>

            <div 
                ref={scrollRef}
                className="flex gap-8 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory px-2"
            >
                {destinations.map((dest) => (
                    <button
                        key={dest.id}
                        onClick={() => onSelect(dest.city)}
                        className="relative flex-none w-[320px] sm:w-[380px] h-[440px] sm:h-[480px] rounded-2xl overflow-hidden group snap-start shadow-2xl shadow-black/5 hover:-translate-y-2 transition-all duration-700"
                    >
                        <img 
                            src={dest.imageUrl} 
                            alt={dest.city} 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-95 transition-opacity" />
                        
                        <div className="absolute bottom-12 left-12 text-left">
                            <p className="text-[10px] font-black text-[#38BDF2] uppercase tracking-[0.4em] mb-2">{dest.country}</p>
                            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase leading-tight">{dest.city}</h3>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
};
