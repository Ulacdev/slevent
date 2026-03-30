import supabase from './database/db.js';

async function checkCategories() {
  const { data, count, error } = await supabase
    .from('event_categories')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error fetching categories:', error);
  } else {
    console.log('Categories Count:', count);
    console.log('Categories Data:', JSON.stringify(data, null, 2));
  }
}

checkCategories();
