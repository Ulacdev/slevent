import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { apiService } from '../../services/apiService';
import { ICONS } from '../../constants';
import { Button, PageLoader, Card, Modal, Input } from '../../components/Shared';
import { format } from 'date-fns';

const MyTicketsPage: React.FC = () => {
    const { name, email, imageUrl, isAuthenticated } = useUser();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const displayName = name?.trim() || email?.split('@')[0] || 'User';
    
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [ticketLoadingId, setTicketLoadingId] = useState<string | null>(null);

    // Stats counts
    const [ordersCount, setOrdersCount] = useState(0);
    const [likesCount, setLikesCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    // Profile Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState(name || '');
    const [previewUrl, setPreviewUrl] = useState(imageUrl || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isEditModalOpen) {
            setEditName(name || '');
            setPreviewUrl(imageUrl || '');
        }
    }, [isEditModalOpen, name, imageUrl]);

    const fetchStats = async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const [ordersRes, likedIds, followingIds] = await Promise.all([
                apiService.getMyOrders().catch(() => ({ orders: [], count: 0 })),
                apiService.getMyLikedEventIds().catch(() => []),
                apiService.getMyFollowingOrganizerIds().catch(() => []),
            ]);

            const sortedOrders = (ordersRes.orders || []).sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setOrders(sortedOrders);
            setOrdersCount(ordersRes.count);
            setLikesCount(likedIds.length);
            setFollowingCount(followingIds.length);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [isAuthenticated]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const response = await apiService.uploadUserAvatar(file);
            setPreviewUrl(response.imageUrl);
        } catch (err) {
            console.error('File upload failed:', err);
            window.alert('Upload failed. Please try a smaller image.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!editName.trim()) return;
        setIsSaving(true);
        try {
            await apiService.updateProfile({
                name: editName.trim(),
                imageUrl: previewUrl
            });
            showToast('success', 'Profile updated successfully!');
            setTimeout(() => window.location.reload(), 1500);
            setIsEditModalOpen(false);
        } catch (err) {
            console.error('Failed to update profile:', err);
            window.alert('Failed to update profile. It might be a network error.');
        } finally {
            setIsSaving(false);
        }
    };

    const formatDateText = (dateStr?: string) => {
        if (!dateStr) return 'Date TBA';
        try {
            return format(new Date(dateStr), 'MMM d, yyyy · h:mm aa');
        } catch {
            return 'Invalid Date';
        }
    };

    const handleViewTicket = async (order: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const directTicketId = order.firstTicketId || order.ticketIds?.[0] || order.tickets?.[0]?.ticketId;
        if (directTicketId) {
            navigate(`/tickets/${directTicketId}`);
            return;
        }

        try {
            setTicketLoadingId(order.orderId);
            const tickets = await apiService.getTicketsByOrder(order.orderId);
            const firstTicketId = tickets?.[0]?.ticketId;
            if (firstTicketId) {
                navigate(`/tickets/${firstTicketId}`);
            } else {
                window.alert('No ticket is available for this order yet.');
            }
        } catch (err) {
            console.error('Failed to fetch tickets for order', order.orderId, err);
            window.alert('Could not open your ticket. Please try again.');
        } finally {
            setTicketLoadingId(null);
        }
    };

    const filteredOrders = orders.filter(order => {
        const eventDate = order.eventStartAt ? new Date(order.eventStartAt) : new Date();
        const now = new Date();
        return activeTab === 'upcoming' ? eventDate >= now : eventDate < now;
    });

    return (
        <div className="min-h-screen bg-[#EAEAEA]">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
                <div className="flex items-center gap-5 mb-10">
                    <div className="w-20 h-20 rounded-full bg-[#EAEAEA] border-2 border-[#2E2E2F]/10 flex items-center justify-center overflow-hidden shrink-0">
                        {imageUrl ? (
                            <img src={imageUrl} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <ICONS.Users className="w-10 h-10 text-[#2E2E2F]" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-[#2E2E2F] tracking-tight">{displayName}</h1>
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="w-7 h-7 rounded-xl border border-[#2E2E2F]/10 flex items-center justify-center hover:bg-[#38BDF2]/10 transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm text-[#2E2E2F] font-medium mt-1">
                            {ordersCount} orders · {likesCount} likes · {followingCount} following
                        </p>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black text-[#2E2E2F] tracking-tight">Orders</h2>
                        <div className="flex gap-2 p-1.5 bg-[#EAEAEA] rounded-xl border border-[#2E2E2F]/5">
                            <button
                                onClick={() => setActiveTab('upcoming')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'upcoming' ? 'bg-[#EAEAEA] text-[#38BDF2] shadow-sm' : 'text-[#2E2E2F]'}`}
                            >UPCOMING</button>
                            <button
                                onClick={() => setActiveTab('past')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'past' ? 'bg-[#EAEAEA] text-[#38BDF2] shadow-sm' : 'text-[#2E2E2F]'}`}
                            >PAST</button>
                        </div>
                    </div>

                    {loading && orders.length === 0 ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => <div key={i} className="h-32 rounded-xl bg-[#EAEAEA] animate-pulse" />)}
                        </div>
                    ) : filteredOrders.length > 0 ? (
                        <div className="flex flex-col gap-5">
                            {filteredOrders.map(order => (
                                <div key={order.orderId} onClick={() => navigate(`/payment-status?sessionId=${order.orderId}`)} className="cursor-pointer p-8 rounded-xl bg-[#EAEAEA] border border-[#2E2E2F]/5 hover:border-[#38BDF2]/30 transition-all hover:shadow-xl">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="mb-2">
                                                <span className="text-[9px] font-black text-[#38BDF2] uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-[#2E2E2F]/5">{order.status === 'PAID' ? 'Confirmed' : order.status}</span>
                                            </div>
                                            <h3 className="text-2xl font-black text-[#2E2E2F] mb-1">{order.eventName}</h3>
                                            <p className="text-sm font-bold text-[#2E2E2F]/60">{formatDateText(order.eventStartAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={(e) => handleViewTicket(order, e)} className="px-6 py-3 rounded-xl bg-[#38BDF2] text-white font-black text-[10px] tracking-widest uppercase shadow-md active:scale-95">VIEW ACCESS</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center border-2 border-dashed border-[#2E2E2F]/10 rounded-xl">
                            <p className="font-bold text-[#2E2E2F]/40">No {activeTab} events found</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Account Settings"
                subtitle="Personalize your attendee profile"
                footer={(
                    <div className="flex gap-4">
                        <Button variant="ghost" className="flex-1" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button className="flex-1" onClick={handleUpdateProfile} disabled={isSaving || isUploading}>
                            {isSaving ? 'Saving...' : 'Update Profile'}
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-8">
                    <div className="flex flex-col items-center">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-28 h-28 rounded-full border-4 border-[#38BDF2]/20 overflow-hidden bg-[#EAEAEA] flex items-center justify-center">
                                {isUploading ? (
                                    <PageLoader variant="section" size="sm" label="" />
                                ) : previewUrl ? (
                                    <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <ICONS.Users className="w-12 h-12 text-[#2E2E2F]/20" />
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#38BDF2] text-white flex items-center justify-center shadow-lg border-2 border-white">
                                <ICONS.Camera className="w-4 h-4" />
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        </div>
                        <p className="mt-3 text-[10px] font-black text-[#38BDF2] uppercase tracking-[0.2em]">Click to upload photo</p>
                    </div>

                    <Input label="Full Name" value={editName} onChange={(e: any) => setEditName(e.target.value)} placeholder="How you appear to organizers" />
                </div>
            </Modal>
        </div>
    );
};

export default MyTicketsPage;
