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
            .order('priority', { ascending: false });

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

        const cities = new Set();
        const countries = new Set();

        (data || []).forEach(event => {
            if (event.locationType === 'ONLINE' || !event.locationText) return;
            const parts = event.locationText.split(',').map(p => p.trim()).filter(p => p.length > 0);
            if (parts.length >= 1) {
                countries.add(parts[parts.length - 1]);
                if (parts.length >= 3) {
                    cities.add(parts[parts.length - 3]);
                } else if (parts.length === 2) {
                    cities.add(parts[0]);
                }
            }
        });

        return res.json({
            cities: Array.from(cities).sort(),
            countries: Array.from(countries).sort()
        });
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
