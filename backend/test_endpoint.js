
async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/events/event-church');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body length:', text.length);
    try {
      const json = JSON.parse(text);
      console.log('Body JSON:', JSON.stringify(json, null, 2).slice(0, 1000));
    } catch (e) {
      console.log('Body text (first 1000 chars):', text.slice(0, 1000));
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
  process.exit(0);
}
test();
