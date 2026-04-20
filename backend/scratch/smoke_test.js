
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function runTest() {
  console.log('🚀 Starting Backend Smoke Test...');
  
  const endpoints = [
    '/api/events/live',
    '/api/events/feed',
    '/api/discovery/impact-stats',
    '/api/plans'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`[TEST] GET ${endpoint}...`);
      const start = Date.now();
      const res = await axios.get(`${BASE_URL}${endpoint}`);
      const duration = Date.now() - start;
      console.log(`[PASS] ${endpoint} (${res.status}) - ${duration}ms`);
    } catch (err) {
      console.error(`[FAIL] ${endpoint}: ${err.message}`);
    }
  }

  console.log('\n[TEST] Stressing AI image proxy (this often causes timeouts)...');
  try {
    const start = Date.now();
    const res = await axios.get(`${BASE_URL}/api/ai/proxy-image?prompt=startup+event+manila&seed=123`, { timeout: 30000 });
    const duration = Date.now() - start;
    console.log(`[PASS] AI Proxy (${res.status}) - ${duration}ms`);
  } catch (err) {
    console.warn(`[WARN] AI Proxy: ${err.message} (This is common if Pollinations is slow)`);
  }

  console.log('\n🚀 Smoke Test Complete.');
}

runTest();
