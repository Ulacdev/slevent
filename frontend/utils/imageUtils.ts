import { API_BASE } from '../services/apiService';

/**
 * Standardized helper to resolve image URLs across the application.
 * Handles:
 * 1. Absolute URLs (http/https/data)
 * 2. API Proxy paths (starting with /api)
 * 3. Supabase object formats { url, path, publicUrl }
 * 4. Fallback placeholders
 */
export const getImageUrl = (img: any): string => {
    if (!img) return 'https://via.placeholder.com/800x400';
    
    let url = '';
    
    if (typeof img === 'string') {
        url = img;
    } else if (typeof img === 'object') {
        url = img.publicUrl || img.url || img.path || '';
    }
    
    if (!url || url.trim() === '') {
        return 'https://via.placeholder.com/800x400';
    }
    
    // If it's already an absolute URL (including relative to root like /assets), return as is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    
    // If it's a relative API path, prepend API_BASE
    // We check for /api/ to ensure we don't accidentally match other paths
    if (url.startsWith('/api')) {
        return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    
    return url;
};

/**
 * Helper to determine if an image needs cross-origin credentials.
 * Proxied AI images are now public, so they don't need credentials.
 * Only internal API routes that are gated still might.
 */
export const needsCredentials = (url: string): boolean => {
    if (!url) return false;
    // We recently made proxy-image public to allow landing page banners to load
    if (url.includes('/api/ai/proxy-image')) return false;
    // If it's hitting our API base and it's not a public route, it might need them
    if (API_BASE && url.startsWith(API_BASE)) return true;
    return false;
};
