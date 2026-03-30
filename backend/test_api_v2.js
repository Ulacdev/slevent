async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/categories');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data Length:', data.length);
    if (data.length > 0) {
      console.log('First Item Label:', data[0].label);
    }
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

test();
