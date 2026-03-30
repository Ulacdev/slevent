import express from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controller/categoryController.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoles } from '../middleware/permissions.js';

const router = express.Router();

// Publicly reachable to browse
router.get('/categories', getCategories);

// Admin only management
router.use('/admin', authMiddleware, requireRoles(['ADMIN']));
router.get('/admin/categories', getCategories);
router.post('/admin/categories', createCategory);
router.patch('/admin/categories/:id', updateCategory);
router.delete('/admin/categories/:id', deleteCategory);

export default router;
