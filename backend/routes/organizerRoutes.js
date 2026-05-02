import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import {
  getMyOrganizer,
  getOrganizerById,
  upsertOrganizer,
  uploadOrganizerImage,
  uploadOrganizerCoverImage,
  followOrganizer,
  unfollowOrganizer,
  getMyFollowings,
  getAllOrganizers,
  getEmailQuotaStatus,
  rateOrganizer,
} from '../controller/organizerController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/organizer
router.post('/organizer', authMiddleware, upsertOrganizer);

// GET /api/organizer/me
router.get('/organizer/me', authMiddleware, getMyOrganizer);

// GET /api/organizer/email-quota
router.get('/organizer/email-quota', authMiddleware, getEmailQuotaStatus);

// GET /api/organizer/followings
router.get('/organizer/followings', authMiddleware, getMyFollowings);

// GET /api/organizer/all
router.get('/organizers/all', getAllOrganizers);

// GET /api/organizer/:id
router.get('/organizer/:id', getOrganizerById);

// POST /api/organizer/:id/follow
router.post('/organizer/:id/follow', authMiddleware, followOrganizer);

// DELETE /api/organizer/:id/follow
router.delete('/organizer/:id/follow', authMiddleware, unfollowOrganizer);

// POST /api/organizer/image
router.post('/organizer/image', authMiddleware, upload.single('image'), uploadOrganizerImage);

// POST /api/organizer/cover
router.post('/organizer/cover', authMiddleware, upload.single('image'), uploadOrganizerCoverImage);

// POST /api/organizer/:id/rate
router.post('/organizer/:id/rate', authMiddleware, rateOrganizer);

export default router;
