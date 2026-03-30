import supabase from './database/db.js';
import fs from 'fs';

async function checkCategories() {
  const { data, error } = await supabase
    .from('event_categories')
    .select('*');

  if (error) {
    fs.writeFileSync('debug_categories_v3.json', JSON.stringify({ error }, null, 2));
  } else {
    fs.writeFileSync('debug_categories_v3.json', JSON.stringify(data, null, 2));
  }
}

checkCategories();
