import express from 'express';
import multer from 'multer';
import {
  listAdminEvents,
  getAdminEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  restoreEvent,
  listArchivedEvents,
  publishEvent,
  closeEvent,
  uploadEventImage
} from '../controller/adminEventController.js';
import { requireRoles } from '../middleware/permissions.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireRoles(['ADMIN', 'STAFF']));

// GET /api/admin/events
router.get('/', listAdminEvents);

// GET /api/admin/events/archived - List archived events
router.get('/archived', listArchivedEvents);

// POST /api/admin/events/image (upload without eventId)
router.post('/image', upload.single('image'), uploadEventImage);

// GET /api/admin/events/:id
router.get('/:id', getAdminEventById);

// POST /api/admin/events/:id/image
router.post('/:id/image', upload.single('image'), (req, _res, next) => {
  req.body.eventId = req.params.id;
  next();
}, uploadEventImage);

// POST /api/admin/events
router.post('/', createEvent);

// PUT /api/admin/events/:id
router.put('/:id', updateEvent);

// DELETE /api/admin/events/:id (soft delete/archive)
router.delete('/:id', deleteEvent);

// POST /api/admin/events/:id/restore - Restore archived event
router.post('/:id/restore', restoreEvent);

// POST /api/admin/events/:id/publish
router.post('/:id/publish', publishEvent);

// POST /api/admin/events/:id/close
router.post('/:id/close', closeEvent);

export default router;
