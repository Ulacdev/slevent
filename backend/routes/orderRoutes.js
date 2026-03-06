// orderRoutes.js
import express from 'express';
import { createOrder, getOrderById, getMyOrders } from '../controller/orderController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /api/orders
router.post('/orders', createOrder);
// GET /api/orders/my (must be before :orderId to avoid conflict)
router.get('/orders/my', authMiddleware, getMyOrders);
// GET /api/orders/:orderId
router.get('/orders/:orderId', getOrderById);

export default router;
