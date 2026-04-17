import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const verifyConfig = async () => {
    console.log('--- RECAPTCHA CONFIGURATION VERIFICATION ---');

    const siteKey = process.env.VITE_RECAPTCHA_SITE_KEY;
    const secretKey = process.env.RECAPTCHA_SECRET;

    console.log('1. Checking Environment Variables...');
    if (!siteKey) {
        console.error('❌ FAIL: VITE_RECAPTCHA_SITE_KEY is missing in .env');
    } else {
        console.log('✅ PASS: VITE_RECAPTCHA_SITE_KEY is present:', siteKey.substring(0, 10) + '...');
    }

    if (!secretKey || secretKey === 'your-recaptcha-secret-key') {
        console.error('❌ FAIL: RECAPTCHA_SECRET is missing or default in .env');
    } else {
        console.log('✅ PASS: RECAPTCHA_SECRET is present:', secretKey.substring(0, 10) + '...');
    }

    if (!siteKey || !secretKey) return;

    console.log('\n2. Verifying Secret Key with Google API...');
    try {
        // We send a request with no response token to see how Google reacts to our secret
        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=`
        );

        const data = response.data;
        console.log('Google API Response:', JSON.stringify(data));

        if (data['error-codes'] && data['error-codes'].includes('invalid-input-secret')) {
            console.error('❌ FAIL: The RECAPTCHA_SECRET in your .env is INVALID according to Google.');
        } else if (data['error-codes'] && data['error-codes'].includes('missing-input-response')) {
            console.log('✅ PASS: Secret key is VALID (Google recognized it and only complained about the missing response token).');
        } else {
            console.log('❓ UNKNOWN: Google returned an unexpected response.', data);
        }
    } catch (error) {
        console.error('❌ FAIL: Could not reach Google API:', error.message);
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
};

verifyConfig();
