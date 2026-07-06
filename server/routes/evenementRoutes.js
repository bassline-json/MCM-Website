import express from 'express';
import {
    getEvenementsPublics,
    getAllEvenements,
    getEvenementById,
    createEvenement,
    updateEvenement,
    togglePublishEvenement,
    deleteEvenement
} from '../controllers/evenementController.js';
import { authenticate, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ============================
// 🌐 ROUTES PUBLIQUES
// ============================

// GET /api/evenements — liste des événements publiés (page d'accueil)
router.get('/', getEvenementsPublics);

// GET /api/evenements/:id — détail d'un événement (public si publié)
router.get('/:id', getEvenementById);

// ============================
// 🔒 ROUTES PRIVÉES (superadmin + adminCom uniquement)
// ============================

// GET /api/evenements/admin/all — tous les événements (avec brouillons)
router.get(
    '/admin/all',
    authenticate,
    checkRole(['superadmin', 'adminCom']),
    getAllEvenements
);

// POST /api/evenements — créer un événement
router.post(
    '/',
    authenticate,
    checkRole(['superadmin', 'adminCom']),
    createEvenement
);

// PUT /api/evenements/:id — modifier un événement
router.put(
    '/:id',
    authenticate,
    checkRole(['superadmin', 'adminCom']),
    updateEvenement
);

// PATCH /api/evenements/:id/toggle-publish — basculer publié/brouillon
router.patch(
    '/:id/toggle-publish',
    authenticate,
    checkRole(['superadmin', 'adminCom']),
    togglePublishEvenement
);

// DELETE /api/evenements/:id — supprimer un événement
router.delete(
    '/:id',
    authenticate,
    checkRole(['superadmin', 'adminCom']),
    deleteEvenement
);

export default router;
