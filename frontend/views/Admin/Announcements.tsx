import React, { useState, useEffect } from 'react';
import { ICONS } from '../../constants';
import { Button, Input, Modal, PageLoader } from '../../components/Shared';
import { apiService } from '../../services/apiService';
import { useToast } from '../../context/ToastContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  target_audience: 'ALL' | 'ORGANIZERS' | 'ATTENDEES';
  is_published: boolean;
  scheduled_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}
export const Announcements: React.FC = () => {
  const toLocalISOString = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'INFO' as 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL',
    target_audience: 'ALL' as 'ALL' | 'ORGANIZERS' | 'ATTENDEES',
    is_published: true,
    scheduled_at: '',
    expires_at: ''
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await apiService._fetch(`${import.meta.env.VITE_API_BASE}/api/announcements/admin`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (err) {
      showToast('error', 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenModal = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        target_audience: announcement.target_audience,
        is_published: announcement.is_published,
        scheduled_at: toLocalISOString(announcement.scheduled_at),
        expires_at: toLocalISOString(announcement.expires_at)
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        content: '',
        type: 'INFO',
        target_audience: 'ALL',
        is_published: true,
        scheduled_at: '',
        expires_at: ''
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingAnnouncement 
        ? `${import.meta.env.VITE_API_BASE}/api/announcements/admin/${editingAnnouncement.id}`
        : `${import.meta.env.VITE_API_BASE}/api/announcements/admin`;
      
      const method = editingAnnouncement ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
      };

      const res = await apiService._fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (res.ok) {
        showToast('success', editingAnnouncement ? 'Announcement updated' : 'Announcement created');
        setModalOpen(false);
        fetchAnnouncements();
      } else {
        const error = await res.json();
        showToast('error', error.error || 'Failed to save announcement');
      }
    } catch (err) {
      showToast('error', 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement permanently?')) return;
    try {
      const res = await apiService._fetch(`${import.meta.env.VITE_API_BASE}/api/announcements/admin/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        showToast('success', 'Announcement deleted');
        fetchAnnouncements();
      }
    } catch (err) {
      showToast('error', 'Failed to delete announcement');
    }
  };

  if (loading) return <PageLoader variant="page" label="Loading Announcements..." />;

  return (
    <div className="space-y-8" style={{ zoom: 0.85 }}>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-text dark:text-white tracking-tight">Platform Announcements</h1>
          <p className="text-text dark:text-white/60 font-medium text-sm mt-1">Broadcast updates, maintenance alerts, and news to the community.</p>
        </div>
        <Button 
          onClick={() => handleOpenModal()}
          className="bg-[#38BDF2] text-white px-8 py-3.5 rounded-xl font-black shadow-lg shadow-[#38BDF2]/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-[11px] uppercase tracking-widest"
        >
          <ICONS.Plus className="w-5 h-5" />
          Create Announcement
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {announcements.length > 0 ? (
          announcements.map((ann) => (
            <div key={ann.id} className="bg-surface rounded-2xl p-6 border border-sidebar-border shadow-sm transition-all hover:shadow-md flex flex-col md:flex-row gap-6 items-start">
              <div className={`p-4 rounded-xl shrink-0 ${
                ann.type === 'INFO' ? 'bg-blue-500' : 
                ann.type === 'SUCCESS' ? 'bg-emerald-500' : 
                ann.type === 'WARNING' ? 'bg-amber-500' : 'bg-rose-500'
              } text-white shadow-sm`}>
                <ICONS.Bell className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-bold text-text dark:text-white truncate">{ann.title}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                    ann.type === 'INFO' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                    ann.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                    ann.type === 'WARNING' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                    'bg-rose-50 text-rose-600 border-rose-200'
                  }`}>
                    {ann.type}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-background text-text/60 dark:text-white/60 border border-sidebar-border">
                    Target: {ann.target_audience}
                  </span>
                  {!ann.is_published && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-background text-text/40 dark:text-white/40 border border-sidebar-border">
                      Draft
                    </span>
                  )}
                </div>
                <p className="text-text/80 dark:text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                <div className="flex items-center gap-4 text-[10px] text-text/40 dark:text-white/40 font-bold uppercase tracking-widest pt-2">
                  <span>Created {new Date(ann.created_at).toLocaleDateString()}</span>
                  {ann.scheduled_at && (
                    <span className="text-[#38BDF2]">Scheduled for {new Date(ann.scheduled_at).toLocaleString()}</span>
                  )}
                  {ann.expires_at && (
                    <span className="text-rose-500 font-black">Expires {new Date(ann.expires_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 self-start md:self-center">
                <button 
                  onClick={() => handleOpenModal(ann)}
                  className="p-3 rounded-xl bg-background text-text dark:text-white hover:bg-[#38BDF2] hover:text-white transition-all shadow-sm border border-sidebar-border"
                  title="Edit"
                >
                  <ICONS.Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(ann.id)}
                  className="p-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-200"
                  title="Delete Permanently"
                >
                  <ICONS.Trash className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-surface rounded-2xl p-12 border border-dashed border-sidebar-border flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mb-6">
              <ICONS.Megaphone className="w-10 h-10 text-text/20 dark:text-white/20" />
            </div>
            <h3 className="text-xl font-bold text-text dark:text-white mb-2">No Announcements Yet</h3>
            <p className="text-text/50 dark:text-white/50 text-sm max-w-sm">Broadcast your first update to the StartupLab community.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input 
              label="Announcement Title"
              placeholder="e.g. System Maintenance Scheduled"
              value={formData.title}
              onChange={(e: any) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-text dark:text-white uppercase tracking-[0.15em]">Reason / Content</label>
              <textarea 
                className="w-full px-5 py-4 bg-background border border-sidebar-border rounded-xl text-sm min-h-[200px] outline-none focus:ring-2 focus:ring-[#38BDF2]/30 focus:border-[#38BDF2] transition-all text-text dark:text-white"
                placeholder="Details of the announcement..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-text dark:text-white uppercase tracking-[0.15em]">Alert Level</label>
                <select 
                  className="w-full px-5 py-4 bg-background border border-sidebar-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#38BDF2]/30 text-text dark:text-white"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="INFO">Info (Blue)</option>
                  <option value="SUCCESS">Success (Green)</option>
                  <option value="WARNING">Warning (Amber)</option>
                  <option value="CRITICAL">Critical (Rose)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-text dark:text-white uppercase tracking-[0.15em]">Target Audience</label>
                <select 
                  className="w-full px-5 py-4 bg-background border border-sidebar-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#38BDF2]/30 text-text dark:text-white"
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as any })}
                >
                  <option value="ALL">Everyone</option>
                  <option value="ORGANIZERS">Organizers Only</option>
                  <option value="ATTENDEES">Attendees Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Scheduled For (Start Date)"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e: any) => setFormData({ ...formData, scheduled_at: e.target.value })}
                required
              />
              <Input 
                label="Expires At (End Date)"
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e: any) => setFormData({ ...formData, expires_at: e.target.value })}
                required
              />
            </div>

            {/* Removed Publish Immediately checkbox */}
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="button"
              className="flex-1 py-4 !bg-background !text-text dark:!text-white border border-sidebar-border rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-text hover:text-background dark:hover:bg-white dark:hover:text-[#2E2E2F] transition-all"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-[2] py-4 bg-[#38BDF2] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#38BDF2]/20 hover:scale-[1.02]"
              disabled={submitting}
            >
              {submitting ? 'Processing...' : editingAnnouncement ? 'Update Announcement' : 'Launch Announcement'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Announcements;
