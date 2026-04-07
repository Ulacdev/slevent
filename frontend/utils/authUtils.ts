/**
 * Masks a password string with a B64: prefix for payload obfuscation.
 * This matches the backend's decodeAuthPassword utility.
 */
export const maskPassword = (password: string): string => {
    if (!password) return '';
    try {
        // Base64 encode the password with a B64: prefix
        // We use unescape(encodeURIComponent()) to handle Unicode characters correctly
        return "B64:" + btoa(unescape(encodeURIComponent(password)));
    } catch (e) {
        console.error('[AuthUtils] Failed to mask password', e);
        return password;
    }
};
