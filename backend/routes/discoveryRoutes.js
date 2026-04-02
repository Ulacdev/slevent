import express from 'express';
import multer from 'multer';
import { 
    getDiscoveryDestinations, 
    getAdminDiscoveryStats, 
    getPublicImpactStats,
    createDiscoveryDestination, 
    updateDiscoveryDestination, 
    deleteDiscoveryDestination,
    getAvailableLocations,
    uploadDiscoveryImage
} from '../controller/discoveryController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * Public Route for Frontend Slider
 */
router.get('/destinations', getDiscoveryDestinations);
router.get('/locations', getAvailableLocations);
router.get('/impact-stats', getPublicImpactStats);

/**
 * Admin Routes for Discovery Hub Management
 */
router.get('/admin', authMiddleware, getAdminDiscoveryStats);
router.post('/admin', authMiddleware, createDiscoveryDestination);
router.put('/admin/:id', authMiddleware, updateDiscoveryDestination);
router.delete('/admin/:id', authMiddleware, deleteDiscoveryDestination);
router.post('/upload', authMiddleware, upload.single('image'), uploadDiscoveryImage);

export default router;
