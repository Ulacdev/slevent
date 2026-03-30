import db from '../database/db.js';

export const getCategories = async (req, res) => {
  try {
    const { data, error } = await db
      .from('event_categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { key, label, icon_name, keywords } = req.body;
    const { data, error } = await db
      .from('event_categories')
      .insert([{ key, label, icon_name, keywords }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.key) {
        updates.key = updates.key.toUpperCase().replace(/\s+/g, '_');
    }

    const { data, error } = await db
      .from('event_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await db
      .from('event_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Category deleted permanently' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
