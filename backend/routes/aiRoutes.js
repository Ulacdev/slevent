import express from 'express';
import { suggestEventContent, suggestFieldContent, proxyImage } from '../controller/aiController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /api/ai/event-suggest — full name + description suggestion panel
router.post('/event-suggest', authMiddleware, suggestEventContent);

// POST /api/ai/field-suggest — per-field inline suggestion
router.post('/field-suggest', authMiddleware, suggestFieldContent);

// GET /api/ai/proxy-image — secure proxy for AI images
router.get('/proxy-image', proxyImage);

export default router;
