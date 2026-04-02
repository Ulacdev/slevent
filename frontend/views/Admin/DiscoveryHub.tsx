import React, { useState, useEffect } from 'react';
import { Button, Input, PageLoader } from '../../components/Shared.tsx';
import { ICONS } from '../../constants';
import { apiService } from '../../services/apiService';
import { useToast } from '../../context/ToastContext';

interface PopularPlace {
  id: string;
  city: string;
  country: string;
  image_url: string;
  priority: number;
  is_active: boolean;
}

export const DiscoveryHub: React.FC = () => {
  const [destinations, setDestinations] = useState<PopularPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<PopularPlace | null>(null);
  const { showToast } = useToast();

  // Form State
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Philippines');
  const [imageUrl, setImageUrl] = useState('');
  const [priority, setPriority] = useState(0);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [featuredRegions, setFeaturedRegions] = useState<Record<string, string[]>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const res = await apiService._fetch(`${import.meta.env.VITE_API_BASE}/api/discovery/admin`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDestinations(data);
      }
    } catch (err) {
      console.error('Failed to fetch destinations:', err);
      showToast('error', 'Failed to load destinations');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await apiService._fetch(`${import.meta.env.VITE_API_BASE}/api/discovery/locations`);
      if (res.ok) {
        const data = await res.json();
        setAvailableCountries(data.countries || []);
        setFeaturedRegions(data.countryToCities || {});
      }
    } catch (err) {
      console.error('Failed to fetch available locations:', err);
    }
  };

  useEffect(() => {
    fetchDestinations();
    fetchLocations();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await apiService._fetch(`${import.meta.env.VITE_API_BASE}/api/discovery/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.publicUrl);
        showToast('success', 'High-res image uploaded');
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Upload failed');
      }
    } catch (err) {
      showToast('error', 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenModal = (dest?: PopularPlace) => {
    if (dest) {
      setEditingDest(dest);
      setCity(dest.city);
      setCountry(dest.country);
      setImageUrl(dest.image_url);
      setPriority(dest.priority);
    } else {
      setEditingDest(null);
      setCity('');
      setCountry('');
      setImageUrl('');
      setPriority(0);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Smart Duplicate Prevention
    const isDuplicate = destinations.some(d => 
      d.city.toLowerCase() === city.trim().toLowerCase() && 
      (!editingDest || d.id !== editingDest.id)
    );

    if (isDuplicate) {
        showToast('error', `"${city.trim()}" is already featured in the Discovery Hub!`);
        return;
    }

    const payload = {
      city: city.trim(),
      country: country.trim(),
      image_url: imageUrl,
      priority: parseInt(priority.toString()),
      is_active: editingDest ? editingDest.is_active : true
    };

    try {
      const url = editingDest 
        ? `${import.meta.env.VITE_API_BASE}/api/discovery/admin/${editingDest.id}`
        : `${import.meta.env.VITE_API_BASE}/api/discovery/admin`;
      
      const res = await apiService._fetch(url, {
        method: editingDest ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (res.ok) {
        showToast('success', `Destination ${editingDest ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        fetchDestinations();
      } else {
        const error = await res.json();
        showToast('error', error.message || 'Operation failed');
      }
    } catch (err) {
      showToast('error', 'Something went wrong');
    }
  };

  const currentCountryCities = featuredRegions[country] || [];
  
  const filteredCities = currentCountryCities.filter(cityName => 
    !destinations.some(d => d.city.toLowerCase() === cityName.toLowerCase() && (!editingDest || d.id !== editingDest.id))
  );

  const toggleStatus = async (dest: PopularPlace) => {
    try {
      const res = await apiService._fetch(`${import.meta.env.VITE_API_BASE}/api/discovery/admin/${dest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !dest.is_active }),
        credentials: 'include'
      });
      if (res.ok) {
        showToast('success', `Destination ${!dest.is_active ? 'activated' : 'deactivated'}`);
        fetchDestinations();
      }
    } catch (err) {
        showToast('error', 'Failed to update status');
    }
  };

  const handleDelete = async (dest: PopularPlace) => {
    if (!window.confirm(`Are you sure you want to remove "${dest.city}" from featured destinations?`)) return;

    try {
      const res = await apiService._fetch(`${import.meta.env.VITE_API_BASE}/api/discovery/admin/${dest.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        showToast('success', 'Destination removed');
        fetchDestinations();
      }
    } catch (err) {
      showToast('error', 'Failed to remove destination');
    }
  };

  if (loading) return <PageLoader variant="page" label="Loading Discovery Hub..." />;

  return (
    <div className="space-y-10" style={{ zoom: 0.85 }}>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-bold text-[#2E2E2F] tracking-tight">Discovery Hub</h1>
             <span className="px-3 py-1 bg-[#38BDF2] rounded-lg text-[10px] font-black text-white uppercase tracking-widest">Premium</span>
          </div>
          <p className="text-[#2E2E2F] font-medium text-sm mt-1">Curate top-tier destinations for the marketplace discovery slider.</p>
        </div>
        <Button 
          onClick={() => handleOpenModal()}
          className="bg-[#38BDF2] text-white px-10 py-5 rounded-2xl font-black shadow-2xl shadow-[#38BDF2]/30 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all text-[12px] uppercase tracking-[0.2em]"
        >
          <ICONS.Plus className="w-6 h-6" strokeWidth={3} />
          Feature New City
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {destinations.map((dest) => (
          <div key={dest.id} className={`group relative bg-white rounded-3xl overflow-hidden border border-black/5 shadow-2xl shadow-black/5 transition-all hover:-translate-y-2 ${!dest.is_active ? 'opacity-50 grayscale' : ''}`}>
            <div className="aspect-[4/5] relative overflow-hidden bg-black/5">
                <img 
                    src={dest.image_url} 
                    alt={dest.city} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                
                {/* Overlay Controls */}
                <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <button 
                        onClick={() => handleOpenModal(dest)}
                        className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md text-black flex items-center justify-center hover:bg-[#38BDF2] hover:text-white transition-all shadow-xl"
                    >
                        <ICONS.Edit className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => toggleStatus(dest)}
                        className={`w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md flex items-center justify-center transition-all shadow-xl ${dest.is_active ? 'text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'text-rose-500 hover:bg-rose-500 hover:text-white'}`}
                    >
                        {dest.is_active ? <ICONS.Eye className="w-5 h-5" /> : <ICONS.EyeOff className="w-5 h-5" />}
                    </button>
                    <button 
                        onClick={() => handleDelete(dest)}
                        className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-xl"
                    >
                        <ICONS.Trash className="w-5 h-5" />
                    </button>
                </div>

                <div className="absolute bottom-8 left-8 text-left">
                    <p className="text-[9px] font-black text-[#38BDF2] uppercase tracking-[0.4em] mb-1">{dest.country}</p>
                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-2">{dest.city}</h3>
                </div>
            </div>
          </div>
        ))}
        
        {/* Placeholder for empty state */}
        {destinations.length === 0 && !loading && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center border-4 border-dashed border-black/5 rounded-[3rem]">
                <ICONS.MapPin className="w-16 h-16 text-black/10 mb-4" />
                <p className="text-black/30 font-black uppercase tracking-widest">No featured destinations found.</p>
                <button onClick={() => handleOpenModal()} className="mt-4 text-[#38BDF2] font-black uppercase tracking-widest text-xs hover:underline">Start Curating Hubs</button>
            </div>
        )}
      </div>

      {/* Modern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-[#F2F2F2] rounded-[2.5rem] w-full max-w-xl shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 overflow-hidden border border-white/20">
            <div className="p-10 sm:p-14">
              <div className="flex items-center justify-between mb-10">
                <div className="space-y-1">
                   <h2 className="text-3xl font-black text-black uppercase tracking-tighter leading-none">
                     {editingDest ? 'Manage Destination' : 'Feature New City'}
                   </h2>
                   <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">Populate the discovery hub with verified photography.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center bg-black/5 hover:bg-black hover:text-white rounded-full transition-all">
                  <ICONS.X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-black/40 uppercase tracking-[0.2em] ml-1">City / Town Name</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-[#F2F2F2] rounded-2xl h-14 border-none shadow-inner px-4 text-sm outline-none focus:ring-2 focus:ring-[#38BDF2]/40 text-[#2E2E2F]"
                      required
                    >
                      <option value="" disabled>Select a city from events</option>
                      {editingDest && !filteredCities.includes(editingDest.city) && (
                        <option value={editingDest.city}>{editingDest.city}</option>
                      )}
                      {filteredCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-black/40 uppercase tracking-[0.2em] ml-1">Country</label>
                    <select
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        setCity('');
                      }}
                      className="w-full bg-[#F2F2F2] rounded-2xl h-14 border-none shadow-inner px-4 text-sm outline-none focus:ring-2 focus:ring-[#38BDF2]/40 text-[#2E2E2F]"
                      required
                    >
                      <option value="" disabled>Select a country from events</option>
                      {editingDest && !availableCountries.includes(editingDest.country) && (
                        <option value={editingDest.country}>{editingDest.country}</option>
                      )}
                      {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[11px] font-black text-black/40 uppercase tracking-[0.2em] ml-1">Photography (High-Res)</label>
                    <div className="flex gap-4">
                      {imageUrl && (
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/5 border border-black/5">
                          <img src={imageUrl} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 !h-14 !rounded-2xl !bg-[#F2F2F2] !text-black !font-black !uppercase !text-[10px] !tracking-widest border-2 border-dashed border-black/10 hover:border-[#38BDF2] hover:text-[#38BDF2] transition-all flex items-center justify-center gap-3 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <div className="flex items-center gap-2">
                             <div className="w-4 h-4 border-2 border-[#38BDF2] border-t-transparent rounded-full animate-spin" />
                             Processing...
                          </div>
                        ) : (
                          <>
                            <ICONS.Camera className="w-5 h-5" />
                            {imageUrl ? 'Change Photo' : 'Upload Destination Shot'}
                          </>
                        )}
                      </Button>
                    </div>
                </div>

                {/* Ranking priority removed per user request */}

                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 py-5 bg-[#38BDF2] text-white font-black rounded-2xl shadow-2xl shadow-[#38BDF2]/30 hover:scale-[1.02] active:scale-95 transition-all text-[12px] uppercase tracking-[0.2em]"
                  >
                    {editingDest ? 'Update Hub Details' : 'Deploy Featured Hub'}
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
