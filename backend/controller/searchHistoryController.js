import supabase from '../database/db.js';

/**
 * Save a search query to the database for the authenticated user
 */
export const saveSearchHistory = async (req, res) => {
    try {
        const { query } = req.body;
        const userId = req.user.id; // From authMiddleware

        if (!query || !query.trim()) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const trimmedQuery = query.trim();

        // 1. Delete existing same query to move it to top
        await supabase
            .from('search_history')
            .delete()
            .match({ user_id: userId, query: trimmedQuery });

        // 2. Insert new entry
        const { data, error } = await supabase
            .from('search_history')
            .insert({ 
                user_id: userId, 
                query: trimmedQuery,
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        // 3. Keep only last 10-20 entries (Optional but good practice)
        // This is usually done with a cleanup task or trigger, but for now we'll just insert

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error saving search history:', err);
        res.status(500).json({ error: 'Failed to save search history' });
    }
};

/**
 * Get the search history for the authenticated user
 */
export const getSearchHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('search_history')
            .select('query')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        // Return flat array of strings for frontend compatibility
        const history = data.map(item => item.query);
        res.status(200).json({ history });
    } catch (err) {
        console.error('Error fetching search history:', err);
        res.status(500).json({ error: 'Failed to fetch search history' });
    }
};

/**
 * Clear the entire search history for the authenticated user
 */
export const clearSearchHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const { error } = await supabase
            .from('search_history')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error clearing search history:', err);
        res.status(500).json({ error: 'Failed to clear search history' });
    }
};

/**
 * Delete a specific entry from the search history
 */
export const deleteSearchHistoryEntry = async (req, res) => {
    try {
        const userId = req.user.id;
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query to delete is required' });
        }

        const { error } = await supabase
            .from('search_history')
            .delete()
            .match({ user_id: userId, query: query });

        if (error) throw error;

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error deleting search history entry:', err);
        res.status(500).json({ error: 'Failed to delete search history entry' });
    }
};
