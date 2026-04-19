import express from 'express';
import { 
    saveSearchHistory, 
    getSearchHistory, 
    clearSearchHistory, 
    deleteSearchHistoryEntry 
} from '../controller/searchHistoryController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, getSearchHistory);
router.post('/', authMiddleware, saveSearchHistory);
router.delete('/', authMiddleware, clearSearchHistory);
router.delete('/entry', authMiddleware, deleteSearchHistoryEntry);

export default router;
