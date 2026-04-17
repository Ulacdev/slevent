import axios from 'axios';

const testRecaptcha = async () => {
    const API = 'http://localhost:5000'; // Assuming backend runs here
    console.log('--- STARTING RECAPTCHA BACKEND TEST ---');

    // TEST 1: No Captcha Token
    try {
        console.log('\n[TEST 1] Testing registration with NO captcha token...');
        const res = await axios.post(`${API}/api/auth/register`, {
            name: 'Test Bot',
            email: 'bot@test.com',
            password: 'Password123!'
        });
        console.log('FAIL: Request succeeded without captcha!');
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('PASS: Correctly blocked with 400 Bad Request');
            console.log('Message:', error.response.data.message);
        } else {
            console.log('FAIL: Unexpected status code:', error.response?.status || error.message);
        }
    }

    // TEST 2: Invalid Captcha Token
    try {
        console.log('\n[TEST 2] Testing registration with INVALID captcha token...');
        const res = await axios.post(`${API}/api/auth/register`, {
            name: 'Test Human',
            email: 'human@test.com',
            password: 'Password123!',
            captchaToken: 'invalid_token_here'
        });
        console.log('FAIL: Request succeeded with invalid captcha!');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('PASS: Correctly blocked with 401 Unauthorized');
            console.log('Message:', error.response.data.message);
        } else if (error.response?.status === 200 && error.response.data.message?.includes('Skipping verification')) {
            console.log('NOTE: Verification skipped (RECAPTCHA_SECRET might be unset in current env)');
        } else {
            console.log('FAIL: Unexpected status code:', error.response?.status || error.message);
            if (error.response?.data) console.log('Data:', error.response.data);
        }
    }

    console.log('\n--- TEST COMPLETE ---');
};

testRecaptcha();
