import express from 'express';
import { suggestEventContent, suggestFieldContent, suggestFaqs, proxyImage, chat } from '../controller/aiController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /api/ai/event-suggest — full name + description suggestion panel
router.post('/event-suggest', authMiddleware, suggestEventContent);

// POST /api/ai/field-suggest — per-field inline suggestion
router.post('/field-suggest', authMiddleware, suggestFieldContent);

// POST /api/ai/faq-suggest — generate FAQ suggestions based on event context
router.post('/faq-suggest', authMiddleware, suggestFaqs);
// GET /api/ai/proxy-image — secure proxy for AI images
router.get('/proxy-image', proxyImage);

// POST /api/ai/chat — generic chat endpoint
router.post('/chat', chat);

export default router;
