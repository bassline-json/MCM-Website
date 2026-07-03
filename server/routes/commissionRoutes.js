import express from 'express';
import { getCommissions } from '../controllers/commissionController.js';
import { authenticate } from '../middlewares/authMiddleware.js'

const router = express.Router();

router.get('/', authenticate, getCommissions);

export default router;