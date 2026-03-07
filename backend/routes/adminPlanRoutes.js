import express from 'express';
import {
  listAdminPlans,
  createAdminPlan,
  updateAdminPlan,
  updateAdminPlanStatus,
  deleteAdminPlan,
} from '../controller/adminPlanController.js';
import { requireRoles } from '../middleware/permissions.js';

const router = express.Router();

router.use(requireRoles(['ADMIN']));

router.get('/', listAdminPlans);
router.post('/', createAdminPlan);
router.patch('/:planId', updateAdminPlan);
router.patch('/:planId/status', updateAdminPlanStatus);
router.delete('/:planId', deleteAdminPlan);

export default router;
