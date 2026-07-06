import db from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function saveBase64Image(base64Str) {
    if (!base64Str || !base64Str.startsWith('data:image/')) return null;
    
    try {
        const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;
        
        const ext = matches[1].split('/')[1] || 'png';
        const buffer = Buffer.from(matches[2], 'base64');
        
        const filename = `event_${Date.now()}_${Math.round(Math.random() * 1e9)}.${ext}`;
        const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
        
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, buffer);
        
        return `/uploads/${filename}`;
    } catch (e) {
        console.error('Error saving base64 image:', e);
        return null;
    }
}

// ============================
// 📅 GET /api/evenements
// Public — liste des événements publiés
// ============================
export const getEvenementsPublics = (req, res) => {
    console.log('Récupération des événements publics');

    const query = `
        SELECT e.id, e.titre, e.description, e.date_evenement,
               e.heure_debut, e.heure_fin, e.lieu, e.type_evenement,
               e.image_url, e.created_at,
               u.prenom || ' ' || u.nom AS auteur
        FROM evenements e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.est_publie = TRUE
        ORDER BY e.date_evenement ASC, e.heure_debut ASC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Erreur getEvenementsPublics:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        console.log(`${results.rows.length} événements publics récupérés`);
        res.json(results.rows);
    });
};

// ============================
// 📅 GET /api/evenements/all
// Privé (superadmin, adminCom) — tous les événements (publiés + brouillons)
// ============================
export const getAllEvenements = (req, res) => {
    console.log(`Récupération de tous les événements par ${req.user.email} (${req.user.role})`);

    let query;
    let params = [];

    if (req.user.role === 'superadmin') {
        // Le superadmin voit TOUT
        query = `
            SELECT e.id, e.titre, e.description, e.date_evenement,
                   e.heure_debut, e.heure_fin, e.lieu, e.type_evenement,
                   e.image_url, e.est_publie, e.created_at, e.updated_at,
                   u.prenom || ' ' || u.nom AS auteur,
                   u.id AS auteur_id
            FROM evenements e
            LEFT JOIN users u ON e.created_by = u.id
            ORDER BY e.created_at DESC
        `;
    } else {
        // L'adminCom ne voit que ses propres événements
        query = `
            SELECT e.id, e.titre, e.description, e.date_evenement,
                   e.heure_debut, e.heure_fin, e.lieu, e.type_evenement,
                   e.image_url, e.est_publie, e.created_at, e.updated_at,
                   u.prenom || ' ' || u.nom AS auteur,
                   u.id AS auteur_id
            FROM evenements e
            LEFT JOIN users u ON e.created_by = u.id
            WHERE e.created_by = $1
            ORDER BY e.created_at DESC
        `;
        params = [req.user.id];
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Erreur getAllEvenements:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        console.log(`${results.rows.length} événements récupérés`);
        res.json(results.rows);
    });
};

// ============================
// 📅 GET /api/evenements/:id
// Public — détail d'un événement publié (ou privé si admin)
// ============================
export const getEvenementById = (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID événement invalide' });
    }

    // Si l'utilisateur est authentifié (admin), il peut voir les brouillons
    const isAdmin = req.user && ['superadmin', 'adminCom'].includes(req.user.role);

    const query = isAdmin
        ? `SELECT e.*, u.prenom || ' ' || u.nom AS auteur FROM evenements e LEFT JOIN users u ON e.created_by = u.id WHERE e.id = $1`
        : `SELECT e.*, u.prenom || ' ' || u.nom AS auteur FROM evenements e LEFT JOIN users u ON e.created_by = u.id WHERE e.id = $1 AND e.est_publie = TRUE`;

    db.query(query, [parseInt(id)], (err, results) => {
        if (err) {
            console.error('Erreur getEvenementById:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (results.rows.length === 0) {
            return res.status(404).json({ error: 'Événement non trouvé' });
        }

        res.json(results.rows[0]);
    });
};

// ============================
// 📅 POST /api/evenements
// Privé (superadmin, adminCom) — créer un événement
// ============================
export const createEvenement = (req, res) => {
    const { titre, description, date_evenement, heure_debut, heure_fin, lieu, type_evenement, image_url, image_base64, est_publie } = req.body;
    const created_by = req.user.id;

    console.log(`Création d'un événement par ${req.user.email} (${req.user.role})`);

    // ---- Validation ----
    if (!titre || !titre.trim()) {
        return res.status(400).json({ error: 'Le titre est requis' });
    }
    if (!date_evenement) {
        return res.status(400).json({ error: 'La date est requise' });
    }
    if (!heure_debut) {
        return res.status(400).json({ error: 'L\'heure de début est requise' });
    }
    if (!lieu || !lieu.trim()) {
        return res.status(400).json({ error: 'Le lieu est requis' });
    }
    if (!type_evenement || !type_evenement.trim()) {
        return res.status(400).json({ error: 'Le type d\'événement est requis' });
    }

    let finalImageUrl = image_url ? image_url.trim() : null;
    if (image_base64) {
        const savedPath = saveBase64Image(image_base64);
        if (savedPath) {
            finalImageUrl = savedPath;
        }
    }

    const query = `
        INSERT INTO evenements (titre, description, date_evenement, heure_debut, heure_fin, lieu, type_evenement, image_url, est_publie, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `;

    const params = [
        titre.trim(),
        description ? description.trim() : null,
        date_evenement,
        heure_debut,
        heure_fin || null,
        lieu.trim(),
        type_evenement.trim(),
        finalImageUrl,
        est_publie !== undefined ? est_publie : true,
        created_by
    ];

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Erreur createEvenement:', err);
            return res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
        }

        const newEvent = results.rows[0];
        console.log(`Événement créé avec succès : ID ${newEvent.id} — "${newEvent.titre}"`);

        // Notification WebSocket
        if (req.app.get('io')) {
            req.app.get('io').emit('evenement_created', { evenement: newEvent });
        }

        res.status(201).json({
            success: true,
            message: 'Événement créé avec succès',
            evenement: newEvent
        });
    });
};

// ============================
// 📅 PUT /api/evenements/:id
// Privé (superadmin, adminCom) — modifier un événement
// ============================
export const updateEvenement = (req, res) => {
    const { id } = req.params;
    const { titre, description, date_evenement, heure_debut, heure_fin, lieu, type_evenement, image_url, image_base64, est_publie } = req.body;

    console.log(`Modification de l'événement ID ${id} par ${req.user.email} (${req.user.role})`);

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID événement invalide' });
    }

    // Vérifier d'abord que l'événement existe (et appartient à l'admin si pas superadmin)
    const checkQuery = req.user.role === 'superadmin'
        ? 'SELECT id, created_by, image_url FROM evenements WHERE id = $1'
        : 'SELECT id, created_by, image_url FROM evenements WHERE id = $1 AND created_by = $2';

    const checkParams = req.user.role === 'superadmin'
        ? [parseInt(id)]
        : [parseInt(id), req.user.id];

    db.query(checkQuery, checkParams, (err, checkResults) => {
        if (err) {
            console.error('Erreur vérification événement:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (checkResults.rows.length === 0) {
            return res.status(404).json({ error: 'Événement non trouvé ou accès non autorisé' });
        }

        const existingEvent = checkResults.rows[0];

        // ---- Validation ----
        if (!titre || !titre.trim()) return res.status(400).json({ error: 'Le titre est requis' });
        if (!date_evenement) return res.status(400).json({ error: 'La date est requise' });
        if (!heure_debut) return res.status(400).json({ error: 'L\'heure de début est requise' });
        if (!lieu || !lieu.trim()) return res.status(400).json({ error: 'Le lieu est requis' });
        if (!type_evenement || !type_evenement.trim()) return res.status(400).json({ error: 'Le type est requis' });

        let finalImageUrl = image_url ? image_url.trim() : existingEvent.image_url;
        if (image_base64) {
            const savedPath = saveBase64Image(image_base64);
            if (savedPath) {
                finalImageUrl = savedPath;
            }
        }

        const updateQuery = `
            UPDATE evenements
            SET titre = $1, description = $2, date_evenement = $3, heure_debut = $4,
                heure_fin = $5, lieu = $6, type_evenement = $7, image_url = $8,
                est_publie = $9, updated_at = NOW()
            WHERE id = $10
            RETURNING *
        `;

        const params = [
            titre.trim(),
            description ? description.trim() : null,
            date_evenement,
            heure_debut,
            heure_fin || null,
            lieu.trim(),
            type_evenement.trim(),
            finalImageUrl,
            est_publie !== undefined ? est_publie : true,
            parseInt(id)
        ];

        db.query(updateQuery, params, (err, results) => {
            if (err) {
                console.error('Erreur updateEvenement:', err);
                return res.status(500).json({ error: 'Erreur lors de la modification' });
            }

            const updatedEvent = results.rows[0];
            console.log(`Événement ID ${id} modifié avec succès`);

            // Notification WebSocket
            if (req.app.get('io')) {
                req.app.get('io').emit('evenement_updated', { evenement: updatedEvent });
            }

            res.json({
                success: true,
                message: 'Événement modifié avec succès',
                evenement: updatedEvent
            });
        });
    });
};

// ============================
// 📅 PATCH /api/evenements/:id/toggle-publish
// Privé (superadmin, adminCom) — basculer l'état publié/brouillon
// ============================
export const togglePublishEvenement = (req, res) => {
    const { id } = req.params;

    console.log(`Bascule publication événement ID ${id} par ${req.user.email}`);

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID événement invalide' });
    }

    const checkQuery = req.user.role === 'superadmin'
        ? 'SELECT id, est_publie FROM evenements WHERE id = $1'
        : 'SELECT id, est_publie FROM evenements WHERE id = $1 AND created_by = $2';

    const checkParams = req.user.role === 'superadmin'
        ? [parseInt(id)]
        : [parseInt(id), req.user.id];

    db.query(checkQuery, checkParams, (err, checkResults) => {
        if (err) {
            console.error('Erreur vérification toggle:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (checkResults.rows.length === 0) {
            return res.status(404).json({ error: 'Événement non trouvé ou accès non autorisé' });
        }

        const currentState = checkResults.rows[0].est_publie;
        const newState = !currentState;

        db.query(
            'UPDATE evenements SET est_publie = $1, updated_at = NOW() WHERE id = $2 RETURNING id, titre, est_publie',
            [newState, parseInt(id)],
            (err, results) => {
                if (err) {
                    console.error('Erreur toggle publish:', err);
                    return res.status(500).json({ error: 'Erreur lors de la modification' });
                }

                console.log(`Événement ID ${id} : est_publie = ${newState}`);

                if (req.app.get('io')) {
                    req.app.get('io').emit('evenement_updated', { evenement: results.rows[0] });
                }

                res.json({
                    success: true,
                    message: newState ? 'Événement publié' : 'Événement mis en brouillon',
                    evenement: results.rows[0]
                });
            }
        );
    });
};

// ============================
// 📅 DELETE /api/evenements/:id
// Privé (superadmin, adminCom) — supprimer un événement
// ============================
export const deleteEvenement = (req, res) => {
    const { id } = req.params;

    console.log(`Suppression de l'événement ID ${id} par ${req.user.email} (${req.user.role})`);

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID événement invalide' });
    }

    // L'adminCom ne peut supprimer que ses propres événements
    const checkQuery = req.user.role === 'superadmin'
        ? 'SELECT id, titre FROM evenements WHERE id = $1'
        : 'SELECT id, titre FROM evenements WHERE id = $1 AND created_by = $2';

    const checkParams = req.user.role === 'superadmin'
        ? [parseInt(id)]
        : [parseInt(id), req.user.id];

    db.query(checkQuery, checkParams, (err, checkResults) => {
        if (err) {
            console.error('Erreur vérification suppression:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (checkResults.rows.length === 0) {
            return res.status(404).json({ error: 'Événement non trouvé ou accès non autorisé' });
        }

        const eventTitle = checkResults.rows[0].titre;

        db.query('DELETE FROM evenements WHERE id = $1', [parseInt(id)], (err) => {
            if (err) {
                console.error('Erreur deleteEvenement:', err);
                return res.status(500).json({ error: 'Erreur lors de la suppression' });
            }

            console.log(`Événement "${eventTitle}" (ID ${id}) supprimé avec succès`);

            if (req.app.get('io')) {
                req.app.get('io').emit('evenement_deleted', { id: parseInt(id) });
            }

            res.json({
                success: true,
                message: `Événement "${eventTitle}" supprimé avec succès`
            });
        });
    });
};
