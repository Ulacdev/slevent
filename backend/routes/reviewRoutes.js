import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { uploadReviewImage, submitEventReview, toggleReviewHelpful, submitReviewReply } from '../controller/reviewController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/reviews/upload - Upload an image for a review (Requires authentication)
router.post('/upload', authMiddleware, upload.single('image'), uploadReviewImage);

// Interaction Routes
router.post('/:id/helpful', authMiddleware, toggleReviewHelpful);
router.post('/:id/reply', authMiddleware, submitReviewReply);

// POST /api/events/:id/reviews - Submit a review (Handled in controller/reviewController.js)
// We already have this in eventRoutes, but let's keep it clean or just use one.
// I'll keep the submitEventReview in eventRoutes as it was before, 
// but update the import to point to reviewController.

export default router;
