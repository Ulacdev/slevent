import express from 'express';
import { inviteUser, acceptInvite, createInviteAndSend } from '../controller/inviteController.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();

router.post('/invite', authMiddleware, inviteUser);
router.post('/create-and-send', authMiddleware, createInviteAndSend);
router.post('/accept-invite', acceptInvite);

export default router;
