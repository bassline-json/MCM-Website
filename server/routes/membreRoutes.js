import express from 'express';
import { 
    getMembres,
    getMembresByService,
    getMembreById,
    createMembre,
    updateMembre,
    deleteMembre 
} from '../controllers/membreController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, getMembres);
router.get('/service/:serviceId', authenticate, getMembresByService);
router.get('/:id', authenticate, getMembreById);
router.post('/', authenticate, createMembre);
router.put('/:id', authenticate, updateMembre);
router.delete('/:id', authenticate, deleteMembre);

export default router;