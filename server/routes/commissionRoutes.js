import express from 'express';
import { getCommissions } from '../controllers/commissionController.js';

const router = express.Router();

// Route publique — nécessaire pour le formulaire d'inscription (sans token)
router.get('/', getCommissions);

export default router;