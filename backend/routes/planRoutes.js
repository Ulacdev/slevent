import express from 'express';
import { listPublicPlans } from '../controller/planController.js';

const router = express.Router();

router.get('/', listPublicPlans);

export default router;
