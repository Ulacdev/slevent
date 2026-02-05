import express from 'express';
import multer from 'multer';
import {getUser, getAllUsers, getRole, getRoleByEmail, whoAmI, updatePermissions, updateUserName, updateUserAvatar} from "../controller/userController.js"
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/user', authMiddleware, getUser);
router.get('/users/all', authMiddleware, getAllUsers);
router.get('/whoAmI', authMiddleware, whoAmI);
router.get('/user/role', authMiddleware, getRole);
router.get('/role-by-email', getRoleByEmail);
// Alias to match frontend path /api/user/role-by-email
router.get('/user/role-by-email', getRoleByEmail);
router.put('/users/:id/permissions', authMiddleware, updatePermissions);
router.patch('/user/name', authMiddleware, updateUserName);
router.post('/user/avatar', authMiddleware, upload.single('image'), updateUserAvatar);

export default router;