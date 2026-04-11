import express from 'express';
import { inviteUser, acceptInvite, createInviteAndSend, listInvites, checkStaffLimitEndpoint, checkInvite } from '../controller/inviteController.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();

router.post('/invite', authMiddleware, inviteUser);
router.post('/create-and-send', authMiddleware, createInviteAndSend);
router.post('/accept-invite', acceptInvite);
router.get('/check-invite', checkInvite);
router.get('/list-invites', authMiddleware, listInvites);
router.get('/check-limit', authMiddleware, checkStaffLimitEndpoint);

export default router;
