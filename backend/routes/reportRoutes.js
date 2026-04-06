import express from 'express';
import { submitEventReport, uploadReportImage } from '../controller/reportController.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public route to report an event
router.post('/reports/event', submitEventReport);
router.post('/reports/upload', upload.single('image'), uploadReportImage);

export default router;
