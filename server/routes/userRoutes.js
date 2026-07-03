import express from 'express';
import { 
    getUsers, 
    getUserById,
    getUserProfile, 
    updateUserRole, 
    deleteUser, 
    updateProfile 
} from '../controllers/userController.js';
import { authenticate, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, checkRole(['superadmin']), getUsers);
router.get('/me', authenticate, getUserProfile);
router.get('/:id', authenticate, getUserById);
router.put('/:id/role', authenticate, checkRole(['superadmin']), updateUserRole);
router.put('/profile', authenticate, updateProfile);
router.delete('/:id', authenticate, checkRole(['superadmin']), deleteUser);

export default router;