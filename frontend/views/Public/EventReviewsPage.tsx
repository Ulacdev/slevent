import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ICONS } from '../../constants';
import { Button, PageLoader, Card } from '../../components/Shared';
import { apiService } from '../../services/apiService';
import { useUser } from '../../context/UserContext';

export const EventReviewsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Aggressive param parsing for HashRouter
  const getQueryParam = (name: string) => {
    const fromLocation = new URLSearchParams(location.search).get(name);
    if (fromLocation) return fromLocation;
    
    const fromHash = new URLSearchParams(window.location.hash.split('?')[1] || '').get(name);
    if (fromHash) return fromHash;
    
    const fromWindow = new URLSearchParams(window.location.search).get(name);
    if (fromWindow) return fromWindow;
    
    return null;
  };

  const showReviewForm = getQueryParam('attended') === 'true';
  const attendeeIdFromUrl = getQueryParam('attendeeId');


  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState('Top Reviews');
  
  // Review Form State
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [helpfulReviews, setHelpfulReviews] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const { userId, isAuthenticated, role, employerId, openAuthModal } = useUser();

  const isOrganizer = isAuthenticated && role === 'ORGANIZER' && event?.organizerId === employerId;

  const fetchEvent = async () => {
    try {
      const basicEvent = await apiService.getEventBySlug(slug!);
      if (basicEvent?.eventId) {
          const data = await apiService.getEventDetails(basicEvent.eventId);
          setEvent(data);

          // Check if user has already reviewed
          if (data.reviews && (userId || attendeeIdFromUrl)) {
              console.log('[Reviews] Loaded reviews:', data.reviews);
              const reviewed = data.reviews.some((r: any) => 
                  (userId && r.userId === userId) || 
                  (attendeeIdFromUrl && r.attendeeId === attendeeIdFromUrl)
              );
              setAlreadyReviewed(reviewed);
          }
      }
    } catch (err) {
      console.error('Failed to fetch event:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [slug, isAuthenticated, userId]);

  const handleSubmitReview = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    setError('');
    console.log('[Reviews] Submitting payload:', { 
      rating, 
      comment, 
      images: uploadedImages,
      attendeeId: attendeeIdFromUrl
    });
    try {
      await apiService.submitEventReview(event.eventId, { 
        rating, 
        comment, 
        images: uploadedImages,
        attendeeId: attendeeIdFromUrl || undefined
      });
      setIsSubmitted(true);
      // Refresh event data to show new review
      fetchEvent();
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setError(err.message || 'Failed to submit review. Are you sure you attended this event?');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError('');
    try {
      const uploadPromises = Array.from(files).map(file => apiService.uploadReviewImage(file));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.imageUrl);
      setUploadedImages(prev => [...prev, ...newUrls]);
    } catch (err: any) {
      console.error('Failed to upload images:', err);
      setError('Failed to upload some images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (url: string) => {
    setUploadedImages(prev => prev.filter(img => img !== url));
  };

  const handleHelpful = async (reviewId: string) => {
    if (!isAuthenticated) {
      openAuthModal('signup', `${location.pathname}${location.search}`);
      return;
    }
    try {
      const { liked } = await apiService.toggleReviewHelpful(reviewId);
      setHelpfulReviews(prev => ({ ...prev, [reviewId]: liked }));
      // Refresh to get updated count
      fetchEvent();
    } catch (err: any) {
      console.error('Failed to toggle helpful:', err);
    }
  };

  const handleReply = (reviewId: string) => {
    if (!isAuthenticated) {
      openAuthModal('signup', `${location.pathname}${location.search}`);
      return;
    }
    // For now, show a prompt or open a modal
    const comment = prompt('Enter your reply:');
    if (!comment) return;
    
    apiService.submitReviewReply(reviewId, comment).then(() => {
        alert('Reply submitted!');
        fetchEvent();
    }).catch(err => {
        console.error('Failed to submit reply:', err);
    });
  };

  if (loading) return <PageLoader variant="viewport" label="Loading Reviews..." />;

  const brandColor = event?.brandColor || '#38BDF2';
  const reviews = event?.reviews || [];
  const avgRating = event?.avgRating || 0;
  const reviewCount = event?.reviewCount || 0;

  const renderStars = (rating: number, size: string = "w-4 h-4", clickable = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <ICONS.Star
            key={star}
            onClick={() => clickable && setRating(star)}
            className={`${size} ${star <= Math.floor(rating) ? 'fill-current text-yellow-400' : 'text-gray-300'} ${clickable ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            strokeWidth={star <= Math.floor(rating) ? 0 : 2}
          />
        ))}
      </div>
    );
  };

  // Filtering logic
  const getFilteredReviews = () => {
    let filtered = [...reviews];
    if (activeFilter === '5 Stars') filtered = filtered.filter((r: any) => r.rating === 5);
    else if (activeFilter === '4 Stars') filtered = filtered.filter((r: any) => r.rating === 4);
    else if (activeFilter === '3 Stars') filtered = filtered.filter((r: any) => r.rating === 3);
    
    if (activeFilter === 'Most Recent') {
        filtered.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
        filtered.sort((a: any, b: any) => b.rating - a.rating);
    }
    
    return filtered;
  };

  const filteredReviews = getFilteredReviews();
  console.log('[Reviews] Filtered reviews to display:', filteredReviews.length);

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <div className="bg-[#F2F2F2] border-b border-[#2E2E2F]/5 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#2E2E2F]/5 transition-colors"
          >
            <ICONS.ArrowLeft className="w-5 h-5 text-[#2E2E2F]" />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-[#2E2E2F]">All Reviews</h1>
            <p className="text-[10px] font-bold text-[#2E2E2F]/40 truncate max-w-[200px] mx-auto">{event?.eventName}</p>
          </div>
          <div className="w-10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg bg-[#2E2E2F]/5 flex items-center justify-center border border-[#2E2E2F]/5" title="Verified Attendance Only">
              <ICONS.ShieldCheck className="w-4 h-4" style={{ color: brandColor }} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        {/* Feedback Form */}
        {showReviewForm && !isSubmitted && (
          <div className="mb-10 sm:mb-12 bg-[#F2F2F2] p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-2 border-[#38BDF2]/20 shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block">
                <ICONS.Star className="w-24 h-24 text-[#38BDF2] rotate-12" />
            </div>
            
            <div className="relative z-10">
                <h2 className="text-xl sm:text-2xl font-black text-[#2E2E2F] mb-1 sm:mb-2 tracking-tight">Share Your Experience</h2>
                <p className="text-[10px] font-bold text-[#2E2E2F]/40 uppercase tracking-widest mb-6 sm:mb-8">Verified Attendee Feedback</p>
 
                {!isAuthenticated ? (
                    <div className="py-8 sm:py-10 text-center space-y-5 sm:space-y-6">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#38BDF2]/10 rounded-full flex items-center justify-center mx-auto">
                            <ICONS.Lock className="w-7 h-7 sm:w-8 sm:h-8 text-[#38BDF2]" />
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                            <h3 className="text-base sm:text-lg font-black text-[#2E2E2F]">Sign In to Post</h3>
                            <p className="text-[13px] sm:text-sm font-medium text-[#2E2E2F]/60 max-w-xs mx-auto">To ensure verified feedback, please sign in to your account first.</p>
                        </div>
                        <Button 
                            onClick={() => openAuthModal('login', `${location.pathname}${location.search}`)}
                            className="w-full sm:w-auto px-10 py-4 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-2xl transition-all"
                            style={{ backgroundColor: brandColor }}
                        >
                            Log In / Sign Up
                        </Button>
                    </div>
                ) : alreadyReviewed ? (
                    <div className="py-8 sm:py-10 text-center space-y-5 sm:space-y-6 bg-[#38BDF2]/5 rounded-2xl sm:rounded-3xl border border-[#38BDF2]/10">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                            <ICONS.CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                            <h3 className="text-base sm:text-lg font-black text-[#2E2E2F]">Feedback Received</h3>
                            <p className="text-[13px] sm:text-sm font-medium text-[#2E2E2F]/60 max-w-xs mx-auto">You have already submitted a review for this event. Thank you for your feedback!</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[10px] font-bold uppercase tracking-wider">
                                {error}
                            </div>
                        )}
 
                        <div className="space-y-6 sm:space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em] mb-3 sm:mb-4">Your Rating</label>
                        <div className="flex justify-start">
                            {renderStars(rating, "w-8 h-8 sm:w-10 sm:h-10", true)}
                        </div>
                    </div>
 
                    <div>
                        <label className="block text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em] mb-3 sm:mb-4">Your Feedback</label>
                        <textarea 
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="What did you like most about the event?"
                            className="w-full h-32 px-4 py-4 rounded-xl sm:rounded-2xl bg-white border border-[#2E2E2F]/5 focus:border-[#38BDF2] focus:ring-1 focus:ring-[#38BDF2] outline-none transition-all text-[13px] sm:text-sm font-medium resize-none"
                        />
                    </div>
 
                    <div>
                        <label className="block text-[10px] font-black text-[#2E2E2F]/60 uppercase tracking-[0.2em] mb-3 sm:mb-4">Add Photos (Optional)</label>
                        <div className="flex flex-wrap gap-3 sm:gap-4">
                            {uploadedImages.map((url) => (
                                <div key={url} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden group/img shadow-md border-2 border-white">
                                    <img src={url} alt="Review" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => removeImage(url)}
                                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                    >
                                        <ICONS.X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {uploadedImages.length < 5 && (
                                <label className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-[#2E2E2F]/10 flex flex-col items-center justify-center cursor-pointer hover:border-[#38BDF2]/40 hover:bg-[#38BDF2]/5 transition-all bg-white/50">
                                    <ICONS.Camera className="w-5 h-5 sm:w-6 sm:h-6 text-[#2E2E2F]/20 mb-1" />
                                    <span className="text-[7px] sm:text-[8px] font-black text-[#2E2E2F]/40 uppercase tracking-widest text-center px-1">
                                        {isUploading ? '...' : 'Add Photo'}
                                    </span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        multiple 
                                        onChange={handleImageUpload} 
                                        className="hidden" 
                                        disabled={isUploading}
                                    />
                                </label>
                            )}
                        </div>
                    </div>
 
                    <Button
                        onClick={handleSubmitReview}
                        disabled={rating === 0 || isSubmitting}
                        className="w-full py-4 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-2xl transition-all disabled:opacity-50"
                        style={{ backgroundColor: brandColor }}
                    >
                        {isSubmitting ? 'Posting Review...' : 'Submit Review'}
                    </Button>
                </div>
              </>
            )}
          </div>
        </div>
        )}
 
        {isSubmitted && (
            <div className="mb-10 sm:mb-12 bg-[#F2F2F2] p-8 sm:p-12 rounded-2xl sm:rounded-3xl border-2 border-green-500/20 shadow-xl text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <ICONS.CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-[#2E2E2F] mb-1 sm:mb-2">Thank you!</h2>
                <p className="text-[13px] sm:text-sm font-medium text-[#2E2E2F]/60">Your review has been submitted and verified.</p>
            </div>
        )}
 
        {/* Stats Card */}
        <div className="bg-[#F2F2F2] p-6 sm:p-8 rounded-2xl border border-[#2E2E2F]/10 shadow-sm mb-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-10">
                <div className="text-center sm:text-left flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-0">
                    <div className="text-5xl sm:text-7xl font-black text-[#2E2E2F] tracking-tighter sm:mb-2">{avgRating.toFixed(1)}</div>
                    <div className="space-y-1">
                        <div className="flex justify-center sm:justify-start">
                            {renderStars(avgRating, "w-4 h-4 sm:w-6 sm:h-6")}
                        </div>
                        <p className="text-[9px] sm:text-[11px] font-black text-[#2E2E2F]/40 uppercase tracking-[0.2em]">Based on {reviewCount} Reviews</p>
                    </div>
                </div>
 
                <div className="flex-1 w-full max-w-sm space-y-1.5 sm:space-y-2">
                    {[5, 4, 3, 2, 1].map((starRating) => {
                        const count = reviews.filter((r: any) => r.rating === starRating).length;
                        const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                        return (
                            <div key={starRating} className="flex items-center gap-3 sm:gap-4">
                                <span className="text-[9px] sm:text-[10px] font-black text-[#2E2E2F] w-2.5 sm:w-3">{starRating}</span>
                                <div className="flex-1 h-1.5 sm:h-2 bg-[#2E2E2F]/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000" 
                                        style={{ 
                                            backgroundColor: brandColor, 
                                            width: `${percentage}%` 
                                        }} 
                                    />
                                </div>
                                <span className="text-[8px] font-bold text-[#2E2E2F]/20 w-6">{percentage.toFixed(0)}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
 
        {/* Filters */}
        <div className="flex items-center gap-4 mb-8 border-b border-[#2E2E2F]/10 overflow-x-auto pb-px custom-scrollbar">
            {['Top Reviews', 'Most Recent', '5 Stars', '4 Stars', '3 Stars', 'With Photos'].map((filter) => (
                <button 
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all relative ${activeFilter === filter ? 'text-[#38BDF2]' : 'text-[#2E2E2F]/40 hover:text-[#2E2E2F]'}`}
                >
                    {filter}
                    {activeFilter === filter && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full" style={{ backgroundColor: brandColor }} />
                    )}
                </button>
            ))}
        </div>
 
        {/* Reviews List */}
        <div className="space-y-5 sm:space-y-6">
            {filteredReviews.length > 0 ? (
                filteredReviews.map((review: any) => (
                    <div key={review.reviewId || review.id} className="bg-[#F2F2F2] p-5 sm:p-6 rounded-2xl border border-[#2E2E2F]/10 shadow-sm">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#2E2E2F]/5 flex items-center justify-center shrink-0 border border-[#2E2E2F]/10">
                                <ICONS.User className="w-5 h-5 sm:w-6 sm:h-6 text-[#2E2E2F]/40" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 mb-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-[#2E2E2F] text-[15px] sm:text-base tracking-tight">{review.userName || review.name}</span>
                                        {(review.is_verified || review.isVerified) && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#38BDF2]/10 border border-[#38BDF2]/20">
                                                <ICONS.CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-[#38BDF2]" strokeWidth={3} />
                                                <span className="text-[7px] sm:text-[8px] font-black text-[#38BDF2] uppercase tracking-widest">Attendee</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-[#2E2E2F]/30 uppercase tracking-widest whitespace-nowrap">
                                        {new Date(review.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="mb-3 sm:mb-4">
                                    {renderStars(review.rating, "w-3 sm:w-4 h-3 sm:h-4")}
                                </div>
                                <p className="text-[13px] sm:text-sm text-[#2E2E2F] leading-relaxed font-medium mb-4">
                                    {review.comment}
                                </p>
 
                                {review.images && review.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {review.images.map((url: string, idx: number) => (
                                            <div key={idx} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-[#2E2E2F]/5 shadow-sm hover:scale-105 transition-transform cursor-pointer">
                                                <img src={url} alt={`Review ${idx}`} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                 <div className="flex items-center gap-6 border-t border-[#2E2E2F]/5 pt-4">
                                     <button 
                                         onClick={() => handleHelpful(review.reviewId || review.id)}
                                         className={`flex items-center gap-2 text-[10px] font-black transition-colors uppercase tracking-widest ${helpfulReviews[review.reviewId || review.id] ? 'text-[#38BDF2]' : 'text-[#2E2E2F]/40 hover:text-[#2E2E2F]'}`}
                                     >
                                         <ICONS.Heart className={`w-4 h-4 ${helpfulReviews[review.reviewId || review.id] ? 'fill-current' : ''}`} />
                                         {review.helpful_count || 0} Helpful
                                     </button>
                                     {isOrganizer && (
                                         <button 
                                            onClick={() => handleReply(review.reviewId || review.id)}
                                            className="flex items-center gap-2 text-[10px] font-black text-[#2E2E2F]/40 hover:text-[#2E2E2F] transition-colors uppercase tracking-widest"
                                         >
                                             <ICONS.MessageSquare className="w-4 h-4" />
                                             Reply
                                         </button>
                                     )}
                                 </div>

                                 {/* Replies - Click to View (Facebook Style) */}
                                 {isAuthenticated && review.review_replies && review.review_replies.length > 0 && (
                                     <div className="mt-4">
                                         {!expandedReplies[review.reviewId || review.id] ? (
                                             <button 
                                                 onClick={() => setExpandedReplies(prev => ({ ...prev, [review.reviewId || review.id]: true }))}
                                                 className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]/30 hover:text-[#2E2E2F] transition-colors"
                                             >
                                                 <div className="w-4 h-px bg-[#2E2E2F]/10" />
                                                 View {review.review_replies.length} {review.review_replies.length === 1 ? 'Reply' : 'Replies'}
                                             </button>
                                         ) : (
                                             <div className="space-y-4">
                                                 <button 
                                                     onClick={() => setExpandedReplies(prev => ({ ...prev, [review.reviewId || review.id]: false }))}
                                                     className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]/30 hover:text-[#2E2E2F] transition-colors mb-4"
                                                 >
                                                     <div className="w-4 h-px bg-[#2E2E2F]/10" />
                                                     Hide Replies
                                                 </button>
                                                 
                                                 <div className="space-y-4 pl-6 border-l-2 border-[#2E2E2F]/5">
                                                     {review.review_replies.map((reply: any) => (
                                                         <div key={reply.replyId} className="bg-white/50 rounded-2xl p-5 border border-[#2E2E2F]/5 shadow-sm">
                                                             <div className="flex items-center gap-2 mb-2">
                                                                 <div className="w-6 h-6 rounded-full bg-[#2E2E2F]/5 flex items-center justify-center border border-[#2E2E2F]/5">
                                                                     <ICONS.User className="w-3 h-3 text-[#2E2E2F]/40" />
                                                                 </div>
                                                                 <span className="text-[10px] font-black uppercase tracking-widest text-[#2E2E2F]">Organizer</span>
                                                                 <div className="w-1 h-1 rounded-full bg-[#2E2E2F]/10" />
                                                                 <span className="text-[8px] font-bold text-[#2E2E2F]/40 uppercase tracking-widest">
                                                                     {new Date(reply.created_at).toLocaleDateString()}
                                                                 </span>
                                                             </div>
                                                             <p className="text-[13px] text-[#2E2E2F] leading-relaxed font-medium">
                                                                 {reply.comment}
                                                             </p>
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="py-20 text-center bg-[#F2F2F2] rounded-2xl border border-[#2E2E2F]/5">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#2E2E2F]/20">No attendee reviews found</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
