import db from './database/db.js';

async function check() {
  const { data, error } = await db.from('reviews').select('*');
  if (error) {
    console.error('Error fetching reviews:', error);
    return;
  }
  console.log(`Found ${data.length} reviews.`);
  data.forEach(r => {
    console.log(`- Review ${r.reviewId}: ${r.userName} - ${r.rating} stars: "${r.comment}"`);
  });
}

check();
