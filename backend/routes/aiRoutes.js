import express from 'express';
import { suggestEventContent, suggestFieldContent } from '../controller/aiController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /api/ai/event-suggest — full name + description suggestion panel
router.post('/event-suggest', authMiddleware, suggestEventContent);

// POST /api/ai/field-suggest — per-field inline suggestion
router.post('/field-suggest', authMiddleware, suggestFieldContent);

// GET /api/ai/proxy-image — secure proxy for AI images
router.get('/proxy-image', authMiddleware, (req, res, next) => {
  // We'll import and call the controller here
  import('../controller/aiController.js').then(m => m.proxyImage(req, res, next));
});

export default router;
