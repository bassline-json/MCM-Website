import express from 'express';
import { 
    getServices, 
    getServicesByCommission, 
    createService 
} from '../controllers/serviceController.js';
import { authenticate, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getServices);
router.get('/commission/:commissionId', authenticate, getServicesByCommission);
router.post('/', authenticate, checkRole(['superadmin', 'adminCom']), createService);

export default router;