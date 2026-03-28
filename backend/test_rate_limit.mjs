async function testRateLimit() {
  const API_URL = 'http://localhost:5000/api/auth/login';
  console.log('🚀 Starting Rate Limit Test (12 attempts)...');
  
  for (let i = 1; i <= 14; i++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong-password' })
      });

      const status = response.status;
      const data = await response.json().catch(() => ({}));

      if (status === 429) {
        process.stdout.write(`❌ Attempt ${i}: BLOCKED (Status 429) - ${JSON.stringify(data)}\n`);
      } else if (status === 401) {
        process.stdout.write(`✅ Attempt ${i}: Handled (Status 401)\n`);
      } else {
        process.stdout.write(`❓ Attempt ${i}: Status ${status} - ${JSON.stringify(data)}\n`);
      }
    } catch (err) {
      process.stdout.write(`💥 Attempt ${i}: Connection failed: ${err.message}\n`);
    }
  }
}

testRateLimit();
