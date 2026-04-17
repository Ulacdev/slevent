// orderRoutes.js
import express from 'express';
import { createOrder, getOrderById, getMyOrders, getManagedPayouts, updatePayoutStatus } from '../controller/orderController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoles } from '../middleware/permissions.js';
import { verifyRecaptcha } from '../middleware/recaptchaMiddleware.js';

const router = express.Router();

// ADMIN ROUTES (Managed Payouts)
router.get('/orders/managed-payouts', authMiddleware, requireRoles(['ADMIN']), getManagedPayouts);
router.patch('/orders/:orderId/payout-status', authMiddleware, requireRoles(['ADMIN']), updatePayoutStatus);

// POST /api/orders
router.post('/orders', verifyRecaptcha, createOrder);
// GET /api/orders/my (must be before :orderId to avoid conflict)
router.get('/orders/my', authMiddleware, getMyOrders);
// GET /api/orders/:orderId
router.get('/orders/:orderId', getOrderById);

export default router;
