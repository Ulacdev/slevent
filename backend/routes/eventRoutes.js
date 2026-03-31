import express from 'express';
import { listEvents, getEventBySlug, listLiveEvents, getEventsFeed, getEventDetails, getLocationSummary } from '../controller/eventController.js';
import { getMyLikedEvents, likeEvent, unlikeEvent } from '../controller/eventLikeController.js';
import { createEvent } from '../controller/adminEventController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET /api/events/locations/summary - Top physical cities with active events
router.get('/locations/summary', getLocationSummary);

// GET /api/events/live
router.get('/live', listLiveEvents);

// GET /api/events/feed - Mixed promoted + regular events
router.get('/feed', getEventsFeed);

// GET /api/events
router.get('/', listEvents);

// POST /api/events (auto-links organizer profile from logged-in user)
router.post('/', authMiddleware, createEvent);

// GET /api/events/likes/me
router.get('/likes/me', authMiddleware, getMyLikedEvents);

// GET /api/events/:id/details - Event details with promotion data
router.get('/:id/details', getEventDetails);

// POST /api/events/:id/like
router.post('/:id/like', authMiddleware, likeEvent);

// DELETE /api/events/:id/like
router.delete('/:id/like', authMiddleware, unlikeEvent);

// GET /api/events/:slugOrId
router.get('/:slug', getEventBySlug);

export default router;
