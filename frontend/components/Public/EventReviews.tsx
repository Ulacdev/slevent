import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ICONS } from '../../constants';
import { Card, Button } from '../Shared';
import { useUser } from '../../context/UserContext';
import { apiService } from '../../services/apiService';

interface Review {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  isVerified?: boolean;
}

interface EventReviewsProps {
  eventSlug: string;
  brandColor: string;
  reviews?: any[];
  avgRating?: number;
  reviewCount?: number;
  isOrganizer?: boolean;
}

export const EventReviews: React.FC<EventReviewsProps> = ({ 
  eventSlug, 
  brandColor, 
  reviews = [], 
  avgRating = 0, 
  reviewCount = 0,
  isOrganizer = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, openAuthModal } = useUser();
  const [activeFilter, setActiveFilter] = useState('Top Reviews');
  const [helpfulReviews, setHelpfulReviews] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const renderStars = (rating: number, size: string = "w-4 h-4") => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <ICONS.Star
            key={star}
            className={`${size} ${star <= Math.floor(rating) ? 'fill-current text-yellow-400' : 'text-gray-300'}`}
            strokeWidth={star <= Math.floor(rating) ? 0 : 2}
          />
        ))}
      </div>
    );
  };

  const filters = ['Top Reviews', 'Most Recent', '5 Stars', '4 Stars', '3 Stars', 'With Photos'];

  // Sorting/Filtering logic
  const getFilteredReviews = () => {
    let filtered = [...reviews];
    if (activeFilter === '5 Stars') filtered = filtered.filter(r => r.rating === 5);
    else if (activeFilter === '4 Stars') filtered = filtered.filter(r => r.rating === 4);
    else if (activeFilter === '3 Stars') filtered = filtered.filter(r => r.rating === 3);
    
    if (activeFilter === 'Most Recent') {
        filtered.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
    } else {
        filtered.sort((a, b) => b.rating - a.rating);
    }
    
    return filtered;
  };

  const handleHelpful = async (reviewId: string) => {
    if (!isAuthenticated) {
      openAuthModal('signup', `${location.pathname}${location.search}`);
      return;
    }
    try {
      const { liked } = await apiService.toggleReviewHelpful(reviewId);
      setHelpfulReviews(prev => ({ ...prev, [reviewId]: liked }));
      // In a real app we'd refresh the parent's data
    } catch (err: any) {
      console.error('Failed to toggle helpful:', err);
    }
  };

  const handleReply = (reviewId: string) => {
    if (!isAuthenticated) {
      openAuthModal('signup', `${location.pathname}${location.search}`);
      return;
    }
    const comment = prompt('Enter your reply:');
    if (!comment) return;
    
    apiService.submitReviewReply(reviewId, comment).then(() => {
        alert('Reply submitted!');
    }).catch(err => {
        console.error('Failed to submit reply:', err);
    });
  };

  const displayReviews = getFilteredReviews().slice(0, 6);

  return (
    <div className="p-5 sm:p-8 bg-[#F2F2F2] rounded-2xl border border-[#2E2E2F]/10 mb-10 overflow-hidden relative">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
          <div className="space-y-1">
            <h3 className="text-[10px] font-black text-[#2E2E2F] uppercase tracking-[0.4em] mb-4">REVIEWS & FEEDBACK</h3>
            <div className="flex items-center gap-6">
              <div className="text-5xl sm:text-6xl font-black text-[#2E2E2F] tracking-tighter">
                {avgRating > 0 ? avgRating.toFixed(1) : '0.0'}
              </div>
              <div className="space-y-1">
                {renderStars(avgRating, "w-5 h-5 sm:w-6 sm:h-6")}
                <p className="text-[11px] sm:text-[13px] font-bold text-[#2E2E2F]/60 uppercase tracking-widest">
                  {reviewCount.toLocaleString()} Ratings
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bars for Mobile/Tablet */}
          <div className="flex-1 min-w-[200px] max-w-md">
              <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviews.filter(r => r.rating === rating).length;
                      const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                      return (
                          <div key={rating} className="flex items-center gap-3">
                              <span className="text-[9px] font-black text-[#2E2E2F] w-2">{rating}</span>
                              <div className="flex-1 h-1.5 bg-[#2E2E2F]/5 rounded-full overflow-hidden">
                                  <div 
                                      className="h-full rounded-full transition-all duration-1000" 
                                      style={{ 
                                          backgroundColor: brandColor, 
                                          width: `${percentage}%` 
                                      }} 
                                  />
                              </div>
                              <span className="text-[8px] font-bold text-[#2E2E2F]/30 w-8">{percentage.toFixed(0)}%</span>
                          </div>
                      );
                  })}
              </div>
          </div>
        </div>
        
        <div className="hidden lg:flex flex-col items-end">
            <div className="bg-white/40 border border-[#2E2E2F]/5 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-[#2E2E2F]/5 group-hover:scale-110 transition-transform shadow-inner">
                    <ICONS.ShieldCheck className="w-5 h-5" style={{ color: brandColor }} />
                </div>
                <div className="text-left">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#2E2E2F]">
                        Attendee Feedback
                    </div>
                    <p className="text-[9px] font-bold text-[#2E2E2F]/40 uppercase tracking-[0.2em] leading-tight mt-0.5">
                        Trusted reviews from<br />actual event attendees
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-6 border-b border-[#2E2E2F]/10 mb-10 overflow-x-auto pb-px custom-scrollbar">
          {filters.map((filter) => (
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

      {/* Review List */}
      <div className="space-y-10 sm:space-y-12">
        {displayReviews.length > 0 ? (
          displayReviews.map((review) => (
            <div key={review.id || review.reviewId} className="group relative">
              <div className="flex gap-4 sm:gap-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#2E2E2F]/5 flex items-center justify-center shrink-0 border border-[#2E2E2F]/10">
                  <ICONS.User className="w-5 h-5 sm:w-6 sm:h-6 text-[#2E2E2F]/40" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#2E2E2F] text-[15px] sm:text-base tracking-tight">{review.userName || review.name}</span>
                      {(review.isVerified || review.is_verified) && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#38BDF2]/10 border border-[#38BDF2]/20">
                          <ICONS.CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-[#38BDF2]" strokeWidth={3} />
                          <span className="text-[7px] sm:text-[8px] font-black text-[#38BDF2] uppercase tracking-widest">Attendee</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-[#2E2E2F]/30 uppercase tracking-widest whitespace-nowrap">
                      {new Date(review.created_at || review.date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    {renderStars(review.rating, "w-3 sm:w-3.5 h-3 sm:h-3.5")}
                  </div>

                  <p className="text-[13px] sm:text-sm text-[#2E2E2F] leading-relaxed font-medium">
                    {review.comment}
                  </p>

                  {review.images && review.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {review.images.map((url: string, idx: number) => (
                        <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden border border-[#2E2E2F]/5 shadow-sm">
                          <img src={url} alt={`Review photo ${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                   <div className="mt-4 flex items-center gap-6">
                       <button 
                         onClick={() => handleHelpful(review.id || review.reviewId)}
                         className={`flex items-center gap-1.5 text-[10px] font-black transition-colors uppercase tracking-widest ${helpfulReviews[review.id || review.reviewId] ? 'text-[#38BDF2]' : 'text-[#2E2E2F]/40 hover:text-[#2E2E2F]'}`}
                       >
                           <ICONS.Heart className={`w-3.5 h-3.5 ${helpfulReviews[review.id || review.reviewId] ? 'fill-current' : ''}`} />
                           {review.helpful_count || 0} Helpful
                       </button>
                       {isOrganizer && (
                           <button 
                             onClick={() => handleReply(review.id || review.reviewId)}
                             className="flex items-center gap-1.5 text-[10px] font-black text-[#2E2E2F]/40 hover:text-[#2E2E2F] transition-colors uppercase tracking-widest"
                           >
                               <ICONS.MessageSquare className="w-3.5 h-3.5" />
                               Reply
                           </button>
                       )}
                   </div>

                   {/* Replies - Click to View (Facebook Style) */}
                    {isAuthenticated && review.review_replies && review.review_replies.length > 0 && (
                         <div className="mt-4">
                             {!expandedReplies[review.id || review.reviewId] ? (
                                 <button 
                                     onClick={() => setExpandedReplies(prev => ({ ...prev, [review.id || review.reviewId]: true }))}
                                     className="flex items-center gap-2 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#2E2E2F]/40 hover:text-[#2E2E2F] transition-colors"
                                 >
                                     <div className="w-4 h-px bg-[#2E2E2F]/10" />
                                     View {review.review_replies.length} {review.review_replies.length === 1 ? 'Reply' : 'Replies'}
                                 </button>
                             ) : (
                                 <div className="space-y-3">
                                     <button 
                                         onClick={() => setExpandedReplies(prev => ({ ...prev, [review.id || review.reviewId]: false }))}
                                         className="flex items-center gap-2 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#2E2E2F]/40 hover:text-[#2E2E2F] transition-colors mb-2"
                                     >
                                         <div className="w-4 h-px bg-[#2E2E2F]/10" />
                                         Hide Replies
                                     </button>
                                     
                                     <div className="space-y-3 pl-3 sm:pl-4 border-l border-[#2E2E2F]/10">
                                        {review.review_replies.map((reply: any) => (
                                            <div key={reply.replyId} className="bg-white/40 rounded-xl p-4 border border-[#2E2E2F]/5">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-[#2E2E2F]/5 flex items-center justify-center border border-[#2E2E2F]/5">
                                                        <ICONS.User className="w-2.5 h-2.5 text-[#2E2E2F]/40" />
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#2E2E2F]">Organizer</span>
                                                </div>
                                                <p className="text-[12px] text-[#2E2E2F] leading-relaxed font-medium">
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
              <div className="absolute -bottom-4 left-16 right-0 h-px bg-[#2E2E2F]/5 group-last:hidden" />
            </div>
          ))
        ) : (
          <div className="py-20 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#2E2E2F]/20">No reviews found for this filter</p>
          </div>
        )}
      </div>

      {/* View All Button */}
      {reviewCount > 6 && (
        <div className="mt-12 flex justify-center">
          <button 
              onClick={() => navigate(`/events/${eventSlug}/reviews`)}
              className="text-[11px] font-black uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
              style={{ color: brandColor }}
          >
            See all {reviewCount} reviews
          </button>
        </div>
      )}
    </div>
  );
};
