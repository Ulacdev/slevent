import React, { useState, useEffect } from 'react';
import { Button, Input, PageLoader } from '../../components/Shared.tsx';
import { ICONS } from '../../constants';
import { apiService } from '../../services/apiService';
import { useToast } from '../../context/ToastContext';

interface EventCategory {
  id: string;
  key: string;
  label: string;
  icon_name: string;
  keywords: string[];
  is_active: boolean;
}

export const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const { showToast } = useToast();

  // Form State
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [iconName, setIconName] = useState('Layout');
  const [keywords, setKeywords] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiService._fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      showToast('error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (cat?: EventCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setLabel(cat.label);
      setKey(cat.key);
      setIconName(cat.icon_name);
      setKeywords(cat.keywords.join(', '));
    } else {
      setEditingCategory(null);
      setLabel('');
      setKey('');
      setIconName('Layout');
      setKeywords('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      label,
      key: key.toUpperCase().replace(/\s+/g, '_'),
      icon_name: iconName,
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean)
    };

    try {
      const url = editingCategory 
        ? `${import.meta.env.VITE_API_BASE}/api/admin/categories/${editingCategory.id}`
        : `${import.meta.env.VITE_API_BASE}/api/admin/categories`;
      
      const res = await apiService._fetch(url, {
        method: editingCategory ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (res.ok) {
        showToast('success', `Category ${editingCategory ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        fetchCategories();
      } else {
        const error = await res.json();
        showToast('error', error.message || 'Operation failed');
      }
    } catch (err) {
      showToast('error', 'Something went wrong');
    }
  };

  const handleDelete = async (cat: EventCategory) => {
    if (!window.confirm(`Are you sure you want to permanently delete the "${cat.label}" category? This action cannot be undone.`)) return;

    try {
      const res = await apiService._fetch(`${import.meta.env.VITE_API_BASE}/api/admin/categories/${cat.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        showToast('success', 'Category deleted permanently');
        fetchCategories();
      } else {
        const error = await res.json();
        showToast('error', error.message || 'Failed to delete category');
      }
    } catch (err) {
      showToast('error', 'Failed to delete category');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-8" style={{ zoom: 0.85 }}>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-[#2E2E2F] tracking-tight">Smart Categories</h1>
          <p className="text-[#2E2E2F] font-medium text-sm mt-1">Manage how events are automatically tagged and browsed.</p>
        </div>
        <Button 
          onClick={() => handleOpenModal()}
          className="bg-[#38BDF2] text-white px-8 py-3.5 rounded-xl font-black shadow-lg shadow-[#38BDF2]/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-[11px] uppercase tracking-widest"
        >
          <ICONS.Plus className="w-5 h-5" />
          Add New Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const IconComp = (ICONS as any)[cat.icon_name] || ICONS.Layout;
          return (
            <div key={cat.id} className="bg-[#F2F2F2] rounded-2xl p-6 border border-black/10 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between mb-6">
                <div className="p-4 rounded-xl bg-[#38BDF2] text-white shadow-sm">
                  <IconComp className="w-8 h-8" strokeWidth={2.5} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(cat)}
                    className="p-2.5 rounded-lg bg-black/5 text-black hover:bg-[#38BDF2]/10 hover:text-[#38BDF2] transition-all"
                    title="Edit"
                  >
                    <ICONS.Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(cat)}
                    className="p-2.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                    title="Delete Permanently"
                  >
                    <ICONS.Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
                
              <div className="mb-4">
                <h3 className="text-xl font-black text-black mb-1">{cat.label}</h3>
                <code className="text-[11px] font-bold uppercase tracking-wider text-[#38BDF2] bg-[#38BDF2]/5 px-2 py-0.5 rounded-md">
                  {cat.key}
                </code>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {cat.keywords.slice(0, 5).map(k => (
                  <span key={k} className="text-[10px] font-bold text-black/40 bg-black/5 px-2 py-1 rounded-lg">
                    {k}
                  </span>
                ))}
                {cat.keywords.length > 5 && (
                  <span className="text-[10px] font-bold text-black/40 px-1 py-1">+{cat.keywords.length - 5} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-[#F2F2F2] rounded-3xl w-full max-w-lg shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 overflow-hidden transform scale-100 origin-center border border-white/20">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-black">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <ICONS.X className="w-6 h-6 text-black" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-black uppercase tracking-wider">Label</label>
                    <Input 
                      placeholder="e.g. Business" 
                      value={label} 
                      onChange={(e) => {
                        setLabel(e.target.value);
                        if (!editingCategory) setKey(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                      }}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-black uppercase tracking-wider">Storage Key</label>
                    <Input 
                      placeholder="e.g. BUSINESS" 
                      value={key} 
                      onChange={(e) => setKey(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-black uppercase tracking-wider">Select Icon</label>
                  <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 p-4 bg-black/5 rounded-2xl max-h-48 overflow-y-auto">
                    {Object.keys(ICONS).map(name => {
                      const Icon = (ICONS as any)[name];
                      if (typeof Icon !== 'function') return null;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setIconName(name)}
                          className={`p-3 rounded-xl transition-all ${iconName === name ? 'bg-[#38BDF2] text-white' : 'bg-white text-black hover:bg-black/10'}`}
                          title={name}
                        >
                          <Icon className="w-5 h-5 shadow-sm" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-black uppercase tracking-wider">Keywords (comma separated)</label>
                  <textarea
                    className="w-full h-24 p-4 rounded-xl border-2 border-black/5 focus:border-[#38BDF2] transition-colors outline-none font-medium placeholder:text-black/30 bg-black/5"
                    placeholder="e.g. startup, business, networking..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 !bg-[#E8E8E8] !text-black font-black rounded-xl hover:!bg-black hover:!text-white transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 py-4 bg-[#38BDF2] text-white font-black rounded-xl shadow-lg shadow-[#38BDF2]/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {editingCategory ? 'Save Changes' : 'Create Category'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
