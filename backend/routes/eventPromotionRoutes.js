import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  toggleEventPromotion,
  getEventPromotionStatus,
  getPromotedEvents,
  getPromotionQuota,
  getMyPromotedEvents
} from '../controller/eventPromotionController.js';

const router = express.Router();

// Get promoted events (public - for landing page)
router.get('/promoted-events', getPromotedEvents);

// Get promotion quota for organizer
router.get('/promotion-quota', authMiddleware, getPromotionQuota);

// Get organizer's own active promoted events with countdown data
router.get('/promotions/my-promoted-events', authMiddleware, getMyPromotedEvents);

// Get promotion status for an event
router.get('/events/:eventId/promotion-status', getEventPromotionStatus);

// Toggle event promotion on/off
router.post('/events/:eventId/toggle-promotion', authMiddleware, toggleEventPromotion);

// Admin: Bulk Promote
router.post('/events/bulk-promote', authMiddleware, toggleEventPromotion); // We will handle bulk in the same controller

export default router;
