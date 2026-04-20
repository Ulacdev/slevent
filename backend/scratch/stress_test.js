
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const DURATION_MS = 30000; // 30 seconds
const CONCURRENCY = 3;

async function stressTest() {
  console.log(`🔥 Starting Stress Test for ${DURATION_MS/1000}s (Concurrency: ${CONCURRENCY})...`);
  
  const endpoints = ['/api/events/live', '/api/events/feed', '/api/discovery/impact-stats'];
  let count = 0;
  let errors = 0;
  const start = Date.now();

  const task = async () => {
    while (Date.now() - start < DURATION_MS) {
      const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
      try {
        await axios.get(`${BASE_URL}${ep}`);
        count++;
      } catch (err) {
        errors++;
        console.error(`[ERR] ${ep}: ${err.message}`);
      }
    }
  };

  await Promise.all(Array(CONCURRENCY).fill(0).map(task));
  
  console.log(`\n🔥 Stress Test Complete.`);
  console.log(`Total Requests: ${count}`);
  console.log(`Total Errors: ${errors}`);
  
  if (errors === 0) {
    console.log('✅ SERVER STABLE UNDER LOAD.');
  } else {
    console.warn('⚠️ SERVER HAD ERRORS UNDER LOAD.');
  }
}

stressTest();
