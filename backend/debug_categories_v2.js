import supabase from './database/db.js';

async function checkCategories() {
  const { data, error } = await supabase
    .from('event_categories')
    .select('id, key, label, is_active');

  if (error) {
    console.error('Error fetching categories:', error);
  } else {
    console.log('Categories Summary:');
    data.forEach(c => {
      console.log(`[${c.is_active ? 'ACTIVE' : 'INACTIVE'}] ${c.label} (${c.key})`);
    });
  }
}

checkCategories();
