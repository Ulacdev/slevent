import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/categories');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data Length:', data.length);
    console.log('First Item:', JSON.stringify(data[0], null, 2));
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

test();
