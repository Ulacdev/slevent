import express from 'express';
import { subscribe } from '../controller/newsletterController.js';

const router = express.Router();

// Public newsletter subscribe endpoint
router.post('/subscribe', subscribe);

export default router;
