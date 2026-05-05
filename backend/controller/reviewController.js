import db from "../database/db.js";
import crypto from 'crypto';
import path from 'path';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'startuplab-business-ticketing';

/**
 * POST /api/reviews/upload - Upload an image for a review
 */
export const uploadReviewImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Image file is required' });
    
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed' });
    }

    const ext = path.extname(file.originalname || '') || '.png';
    const fileName = `reviews/${crypto.randomUUID()}${ext}`;

    const { error: uploadError } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: publicData } = db.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    const imageUrl = publicData?.publicUrl;

    return res.json({ imageUrl, path: fileName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/events/:id/reviews - Submit a review (Updated with images support)
 */
export const submitEventReview = async (req, res) => {
    try {
      const eventId = req.params.id;
      const { rating, comment, images } = req.body;
      
      const userId = req.user.id;
      const email = req.user.email;
  
      if (!eventId || !rating) {
        return res.status(400).json({ error: 'Event ID and rating are required' });
      }
  
      // 1. Resolve Attendee & Verification
      // We look up by email since guest attendees might have been added by email during checkout
      const { data: attendee } = await db
        .from('attendees')
        .select('attendeeId, name')
        .eq('eventId', eventId)
        .eq('email', email)
        .maybeSingle();
  
      if (!attendee) {
        console.warn(`[Reviews] Verification FAILED for User: ${email}, Event: ${eventId}`);
        return res.status(403).json({ error: 'Only verified attendees can submit reviews for this event.' });
      }

      const reviewerName = req.user.name || attendee.name || email.split('@')[0];
  
      // 2. Check for existing review (Use attendeeId as the primary check)
      const { data: existingReview } = await db
        .from('reviews')
        .select('reviewId')
        .eq('eventId', eventId)
        .eq('attendeeId', attendee.attendeeId)
        .maybeSingle();
  
      if (existingReview) {
        return res.status(400).json({ error: 'You have already submitted a review for this event.' });
      }
  
      // 3. Insert review
      const { data: newReview, error: insertErr } = await db
        .from('reviews')
        .insert({
          eventId,
          userId: userId,
          attendeeId: attendee.attendeeId,
          userName: reviewerName,
          rating,
          comment,
          images: images || [],
          isVerified: true,
          status: 'APPROVED'
        })
        .select('*')
        .single();
  
      if (insertErr) throw insertErr;
  
      // 4. Calculate new average
      const { data: allReviews } = await db
        .from('reviews')
        .select('rating')
        .eq('eventId', eventId);
  
      const count = allReviews?.length || 0;
      const avg = count > 0 
        ? allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / count
        : 0;
  
      return res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        review: newReview,
        average: parseFloat(avg.toFixed(1)),
        count
      });
  
    } catch (err) {
      console.error('[Reviews] Submission failed:', err);
      return res.status(500).json({ error: err?.message || 'Failed to submit review' });
    }
  };
  
  // Toggle Helpful (Upvote)
  export const toggleReviewHelpful = async (req, res) => {
    try {
      const reviewId = req.params.id;
      const userId = req.user.id;
  
      if (!reviewId) return res.status(400).json({ error: 'Review ID required' });
  
      // Check if already liked
      const { data: existingLike } = await db
        .from('review_likes')
        .select('likeId')
        .eq('reviewId', reviewId)
        .eq('userId', userId)
        .maybeSingle();
  
      if (existingLike) {
        // Unlike
        const { error: deleteErr } = await db
          .from('review_likes')
          .delete()
          .eq('likeId', existingLike.likeId);
        
        if (deleteErr) throw deleteErr;
  
        // Decrement count
        await db.rpc('decrement_helpful_count', { row_id: reviewId });
  
        return res.json({ success: true, liked: false });
      } else {
        // Like
        const { error: insertErr } = await db
          .from('review_likes')
          .insert({ reviewId, userId });
  
        if (insertErr) throw insertErr;
  
        // Increment count
        await db.rpc('increment_helpful_count', { row_id: reviewId });
  
        return res.json({ success: true, liked: true });
      }
    } catch (err) {
      console.error('[Reviews] Toggle helpful failed:', err);
      return res.status(500).json({ error: err?.message || 'Action failed' });
    }
  };
  
  // Submit Reply
  export const submitReviewReply = async (req, res) => {
    try {
      const reviewId = req.params.id;
      const userId = req.user.id;
      const { comment } = req.body;
  
      if (!reviewId || !comment) {
        return res.status(400).json({ error: 'Review ID and comment required' });
      }

      // 1. Get the review and its event
      const { data: review } = await db
        .from('reviews')
        .select('eventId')
        .eq('reviewId', reviewId)
        .single();
      
      if (!review) return res.status(404).json({ error: 'Review not found' });

      // 2. Get the event's organizer
      const { data: event } = await db
        .from('events')
        .select('organizerId')
        .eq('eventId', review.eventId)
        .single();
      
      if (!event) return res.status(404).json({ error: 'Event not found' });

      // 3. Get the current user's organizer profile
      const { data: organizer } = await db
        .from('organizers')
        .select('organizerId')
        .eq('userId', userId)
        .single();
      
      // 4. Verify if this user is the organizer of the event
      if (!organizer || organizer.organizerId !== event.organizerId) {
        return res.status(403).json({ error: 'Only the event organizer can reply to reviews.' });
      }
  
      const { data: reply, error } = await db
        .from('review_replies')
        .insert({
          reviewId,
          userId,
          comment
        })
        .select('*')
        .single();
  
      if (error) throw error;
  
      return res.status(201).json({ success: true, reply });
    } catch (err) {
      console.error('[Reviews] Reply submission failed:', err);
      return res.status(500).json({ error: err?.message || 'Failed to submit reply' });
    }
  };
