import crypto from 'crypto';
import path from 'path';
import supabase from '../database/db.js';

/**
 * GET /api/discovery/destinations
 * Fetches the curated list of popular places for the frontend slider.
 * First tries to load from the 'popular_places' table, falls back to local data.
 */
export const getDiscoveryDestinations = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tbl_popular_places')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        // Map database fields (image_url) to frontend fields (imageUrl) 
        // and mark it as 'isCurated' so the slider prioritizes it.
        const mappedData = (data || []).map(dest => ({
            id: dest.id,
            city: dest.city,
            country: dest.country,
            imageUrl: dest.image_url,
            priority: dest.priority || 0,
            isCurated: true
        }));

        return res.json(mappedData);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admin/discovery
 * Full list for Admin management (includes inactive ones).
 */
export const getAdminDiscoveryStats = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tbl_popular_places')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return res.json(data || []);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/admin/discovery
 * Create a new featured destination.
 */
export const createDiscoveryDestination = async (req, res) => {
    try {
        const { city, country, image_url, priority } = req.body;

        // --- BACKEND DUPLICATE GUARD ---
        const trimmedCity = String(city || '').trim();
        const { data: existing } = await supabase
            .from('tbl_popular_places')
            .select('id')
            .ilike('city', trimmedCity)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: `"${trimmedCity}" is already featured in the Discovery Hub!` });
        }

        const { data, error } = await supabase
            .from('tbl_popular_places')
            .insert([{ 
                city: trimmedCity, 
                country: String(country || '').trim(), 
                image_url, 
                priority: parseInt(priority) || 0 
            }])
            .select();

        if (error) throw error;
        return res.status(201).json(data[0]);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * PUT /api/admin/discovery/:id
 * Update an existing destination hub.
 */
export const updateDiscoveryDestination = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.city) {
            const trimmedCity = String(updates.city).trim();
            const { data: existing } = await supabase
                .from('tbl_popular_places')
                .select('id')
                .ilike('city', trimmedCity)
                .neq('id', id)
                .maybeSingle();

            if (existing) {
                return res.status(400).json({ error: `"${trimmedCity}" is already featured in the Discovery Hub!` });
            }
            updates.city = trimmedCity;
        }

        if (updates.country) updates.country = String(updates.country).trim();

        const { data, error } = await supabase
            .from('tbl_popular_places')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        return res.json(data[0]);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * DELETE /api/admin/discovery/:id
 */
export const deleteDiscoveryDestination = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('tbl_popular_places')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return res.json({ message: 'Destination removed successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/discovery/locations
 * Returns unique cities and countries from existing events for suggestions.
 */
export const getAvailableLocations = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('locationText, locationType')
            .eq('status', 'PUBLISHED')
            .eq('is_archived', false);

        if (error) return res.status(500).json({ error: error.message });

        const countryToCities = {};
        const countries = new Set();
        const KNOWN_COUNTRIES = ['Philippines', 'Singapore', 'United States', 'Malaysia', 'Indonesia', 'Japan', 'South Korea'];

        // Fetch already featured destinations to exclude them from suggestions
        const { data: featuredData } = await supabase
            .from('tbl_popular_places')
            .select('city');
        const featuredCities = new Set((featuredData || []).map(d => d.city.toLowerCase().trim()));

        (data || []).forEach(event => {
            if (event.locationType === 'ONLINE' || !event.locationText) return;
            
            const text = event.locationText;
            if (!text || text.toLowerCase() === 'undefined') return;
            const textLower = text.toLowerCase();
            
            // Identify Country
            const foundCountry = KNOWN_COUNTRIES.find(c => textLower.includes(c.toLowerCase())) || 'Philippines';
            countries.add(foundCountry);

            // Identify City / Municipality
            let parts = text.split(',').map(p => p.trim()).filter(p => p.length > 0 && p.toLowerCase() !== 'undefined');
            if (parts.length > 0 && parts[parts.length - 1].toLowerCase() === foundCountry.toLowerCase()) {
                parts.pop(); 
            }

            if (parts.length > 0) {
                const PH_REGIONS = [
                    'National Capital Region', 'NCR', 'Cordillera Administrative Region', 'CAR',
                    'Ilocos Region', 'Region I', 'Cagayan Valley', 'Region II', 'Central Luzon', 'Region III',
                    'CALABARZON', 'Region IV-A', 'MIMAROPA', 'Region IV-B', 'Bicol Region', 'Region V',
                    'Western Visayas', 'Region VI', 'Central Visayas', 'Region VII', 'Eastern Visayas', 'Region VIII',
                    'Zamboanga Peninsula', 'Region IX', 'Northern Mindanao', 'Region X', 'Davao Region', 'Region XI',
                    'SOCCSKSARGEN', 'Region XII', 'Caraga', 'Region XIII', 'BARMM', 'ARMM', 'Mimaropa'
                ];
                
                const PH_PROVINCES = [
                    'Abra', 'Agusan del Norte', 'Agusan del Sur', 'Aklan', 'Albay', 'Antique', 'Apayao', 'Aurora',
                    'Basilan', 'Bataan', 'Batanes', 'Batangas', 'Benguet', 'Biliran', 'Bohol', 'Bukidnon', 'Bulacan',
                    'Cagayan', 'Camarines Norte', 'Camarines Sur', 'Camiguin', 'Capiz', 'Catanduanes', 'Cavite', 'Cebu',
                    'Cotabato', 'Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental',
                    'Dinagat Islands', 'Eastern Samar', 'Guimaras', 'Ifugao', 'Ilocos Norte', 'Ilocos Sur', 'Iloilo',
                    'Isabela', 'Kalinga', 'La Union', 'Laguna', 'Lanao del Norte', 'Lanao del Sur', 'Leyte', 'Maguindanao',
                    'Marinduque', 'Masbate', 'Misamis Occidental', 'Misamis Oriental', 'Mountain Province', 'Negros Occidental',
                    'Negros Oriental', 'Northern Samar', 'Nueva Ecija', 'Nueva Vizcaya', 'Occidental Mindoro', 'Oriental Mindoro',
                    'Palawan', 'Pampanga', 'Pangasinan', 'Quezon', 'Quirino', 'Rizal', 'Romblon', 'Samar', 'Sarangani', 'Siquijor',
                    'Sorsogon', 'South Cotabato', 'Southern Leyte', 'Sultan Kudarat', 'Sulu', 'Surigao del Norte', 'Surigao del Sur',
                    'Tarlac', 'Tawi-Tawi', 'Zambales', 'Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay', 'Metro Manila'
                ];

                const ADDRESS_KEYWORDS = [
                    'Street', 'St', 'Ave', 'Avenue', 'Road', 'Rd', 'Blvd', 'Building', 'Bldg', 
                    'Unit', 'Floor', 'Barangay', 'Brgy', 'Zone', 'Poblacion', 'Subdivision', 'Subd',
                    'Km', 'Corner', 'Cor', 'Highway', 'Hway', 'Compound', 'Cmpd'
                ];

                const blacklist = new Set([
                    ...PH_REGIONS, ...PH_PROVINCES, ...ADDRESS_KEYWORDS
                ].map(s => s.toLowerCase()));

                let foundCity = null;
                for (let i = parts.length - 1; i >= 0; i--) {
                    const part = parts[i];
                    const partLower = part.toLowerCase();
                    
                    // 1. Skip if exactly matches or starts with anything in the blacklist
                    if (blacklist.has(partLower)) continue;
                    
                    // 2. Skip if part CONTAINS any known province or region name (e.g. "4107 Cavite")
                    const isRegionPart = [...PH_REGIONS, ...PH_PROVINCES].some(r => partLower.includes(r.toLowerCase()));
                    if (isRegionPart) continue;

                    // 3. Skip if contains ANY address/building keywords (e.g. "123 Street")
                    const isAddressPart = ADDRESS_KEYWORDS.some(k => partLower.includes(k.toLowerCase()));
                    if (isAddressPart) continue;

                    // 4. Skip if part is mostly numeric (Zip codes Like 4107, etc)
                    // Matches strings that are just numbers, or 4-5 digit numbers at the start
                    if (/^\d{4,10}(\s|$)/.test(part) || /^\d+$/.test(part.replace(/[-\s]/g, ''))) continue;

                    foundCity = part;
                    break;
                }

                // IMPORTANT: Only add if we actually found a valid municipality/city,
                // and avoid the "parts[0]" fallback which often yields streets/zipcodes.
                if (foundCity && foundCity.toLowerCase() !== 'undefined' && !featuredCities.has(foundCity.toLowerCase().trim())) {
                    if (!countryToCities[foundCountry]) countryToCities[foundCountry] = new Set();
                    countryToCities[foundCountry].add(foundCity);
                }
            }
        });

        const responseData = {
            countries: Array.from(countries).sort(),
            countryToCities: {}
        };

        for (const [country, citySet] of Object.entries(countryToCities)) {
            responseData.countryToCities[country] = Array.from(citySet).filter(c => c.length > 2 && c.length < 50).sort();
        }

        return res.json(responseData);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/discovery/upload
 * Handles regional destination image uploads.
 */
export const uploadDiscoveryImage = async (req, res) => {
    try {
        const file = req.file;
        const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'startuplab-business-ticketing';

        if (!file) return res.status(400).json({ error: 'Image file is required' });

        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        const fileName = `discovery/${crypto.randomUUID()}${ext}`;

        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });

        if (uploadError) return res.status(500).json({ error: uploadError.message });

        const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
        
        return res.json({
            publicUrl: publicData?.publicUrl,
            path: fileName
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
