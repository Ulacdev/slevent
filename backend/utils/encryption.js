import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';

if (!ENCRYPTION_KEY) {
    console.warn('\n⚠️ [ENCRYPTION ERROR] NO ENCRYPTION_KEY found in process.env!');
    console.warn('⚠️ A temporary random key is being used. DATA WILL NOT PERSIST ACROSS RESTARTS.');
    console.warn('⚠️ If you are on hosting (Vercel, Railway, etc.), you MUST set an ENCRYPTION_KEY in your hosting dashboard.\n');
} else {
    const keyInfo = ENCRYPTION_KEY.startsWith('dead') ? 'Identified stable key' : 'Custom key';
    console.log(`🛡️ [Encryption] Using ENCRYPTION_KEY from environment (${keyInfo}).`);
}

const USE_KEY_SOURCE = ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Helper to ensure key is exactly 32 bytes
const hashKey = (key) => crypto.createHash('sha256').update(String(key)).digest('base64').substr(0, 32);
const USE_KEY = USE_KEY_SOURCE.length === 32 ? USE_KEY_SOURCE : hashKey(USE_KEY_SOURCE);

export function encryptString(text) {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(USE_KEY), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('[Encryption] Encryption failed', error);
        return null;
    }
}

export function decryptString(encryptedText) {
    if (!encryptedText) return encryptedText;
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) return encryptedText; // Might be unencrypted old stuff

        const iv = Buffer.from(parts[0], 'hex');
        const encryptedData = Buffer.from(parts[1], 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(USE_KEY), iv);

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('[Encryption] Decryption failed', error);
        return null;
    }
}

export function maskString(text) {
    if (!text) return null;
    const str = String(text).trim();
    if (str.length <= 6) return '*'.repeat(str.length);
    return '*'.repeat(Math.max(0, str.length - 4)) + str.slice(-4);
}

/**
 * Decodes the password if it's prefixed with B64: (Base64 encoded from frontend)
 * This is used to mask the password in the network request payload.
 */
export function decodeAuthPassword(password) {
    if (typeof password !== 'string') return password;
    if (password.startsWith('B64:')) {
        try {
            return Buffer.from(password.substring(4), 'base64').toString('utf-8');
        } catch (e) {
            console.error('[Encryption] Failed to decode B64 password', e);
            return password;
        }
    }
    return password;
}
