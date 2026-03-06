import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';

if (!ENCRYPTION_KEY) {
    console.warn('⚠️ [Encryption] No ENCRYPTION_KEY found in process.env. Using a temporary random key. Data will not persist across restarts!');
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
