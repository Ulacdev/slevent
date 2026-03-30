import express from 'express';
import { 
  listAnnouncements, 
  createAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement 
} from '../controller/announcementController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoles } from '../middleware/permissions.js';

const router = express.Router();

// Publicly reachable to list announcements (with target audience filtering)
router.get('/', listAnnouncements);

// Admin-only management
router.use('/admin', authMiddleware, requireRoles(['ADMIN']));
router.get('/admin', listAnnouncements);
router.post('/admin', createAnnouncement);
router.patch('/admin/:id', updateAnnouncement);
router.delete('/admin/:id', deleteAnnouncement);

export default router;
