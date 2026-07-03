import db from '../config/db.js';

// 🔍 Récupérer tous les services
export const getServices = (req, res) => {
    const query = 'SELECT * FROM services ORDER BY commission_id, nom';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erreur getServices:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        res.json(results.rows);
    });
};

// 🔍 Récupérer les services d'une commission spécifique
export const getServicesByCommission = (req, res) => {
    const { commissionId } = req.params;
    const query = 'SELECT * FROM services WHERE commission_id = $1 ORDER BY nom';
    db.query(query, [commissionId], (err, results) => {
        if (err) {
            console.error('Erreur getServicesByCommission:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        // Retourne un tableau vide si aucun service (commissions RAS)
        res.json(results.rows);
    });
};

// ➕ Créer un nouveau service
export const createService = (req, res) => {
    const { nom, commission_id, description } = req.body;

    if (!nom || !commission_id) {
        return res.status(400).json({ error: 'Nom et commission_id requis' });
    }

    // Vérification du rôle de l'utilisateur
    if (req.user.role === 'adminCom' && req.user.commission_id !== parseInt(commission_id)) {
        return res.status(403).json({ error: 'Vous ne pouvez créer des services que dans votre commission' });
    }

    // Vérifier que la commission existe
    const checkCommissionQuery = 'SELECT id FROM commissions WHERE id = $1';
    db.query(checkCommissionQuery, [commission_id], (err, commissionResult) => {
        if (err) {
            console.error('Erreur vérification commission:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (commissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Commission introuvable' });
        }

        // Vérifier si le service existe déjà dans cette commission
        const checkServiceQuery = 'SELECT id FROM services WHERE nom = $1 AND commission_id = $2';
        db.query(checkServiceQuery, [nom, commission_id], (err, serviceResult) => {
            if (err) {
                console.error('Erreur vérification service:', err);
                return res.status(500).json({ error: 'Erreur serveur' });
            }

            if (serviceResult.rows.length > 0) {
                return res.status(409).json({ error: 'Un service avec ce nom existe déjà dans cette commission' });
            }

            // Créer le service
            const insertQuery = 'INSERT INTO services (nom, commission_id, description, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *';
            db.query(insertQuery, [nom, commission_id, description || null], (err, result) => {
                if (err) {
                    console.error('Erreur createService:', err);
                    return res.status(500).json({ error: 'Erreur lors de la création du service' });
                }
                // Émettre un événement WebSocket
                const io = req.app.get('io');
                if (io) {
                    io.emit('service:created', result.rows[0]);
                    io.emit('stats:updated');
                }
                res.status(201).json({ 
                    message: 'Service créé avec succès', 
                    service: result.rows[0]
                });
            });
        });
    });
};

// ✏️ Mettre à jour un service
export const updateService = (req, res) => {
    const { id } = req.params;
    const { nom, description } = req.body;

    if (!nom) {
        return res.status(400).json({ error: 'Le nom du service est requis' });
    }

    // Vérifier que le service existe
    const checkQuery = 'SELECT * FROM services WHERE id = $1';
    db.query(checkQuery, [id], (err, result) => {
        if (err) {
            console.error('Erreur vérification service:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service introuvable' });
        }

        const service = result.rows[0];

        // Vérification des permissions
        if (req.user.role === 'adminCom' && req.user.commission_id !== service.commission_id) {
            return res.status(403).json({ error: 'Vous ne pouvez modifier que les services de votre commission' });
        }

        if (req.user.role === 'admin' && req.user.service_id !== parseInt(id)) {
            return res.status(403).json({ error: 'Vous ne pouvez modifier que votre propre service' });
        }

        // Mettre à jour le service
        const updateQuery = 'UPDATE services SET nom = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *';
        db.query(updateQuery, [nom, description || service.description, id], (err, result) => {
            if (err) {
                console.error('Erreur updateService:', err);
                return res.status(500).json({ error: 'Erreur lors de la mise à jour du service' });
            }
            // Émettre un événement WebSocket
            const io = req.app.get('io');
            if (io) {
                io.emit('service:updated', result.rows[0]);
                io.emit('stats:updated');
            }
            res.json({ 
                message: 'Service mis à jour avec succès', 
                service: result.rows[0]
            });
        });
    });
};

// 🗑️ Supprimer un service
export const deleteService = (req, res) => {
    const { id } = req.params;

    // Vérifier que le service existe
    const checkQuery = 'SELECT * FROM services WHERE id = $1';
    db.query(checkQuery, [id], (err, result) => {
        if (err) {
            console.error('Erreur vérification service:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service introuvable' });
        }

        const service = result.rows[0];

        // Vérification des permissions (seuls superadmin et adminCom peuvent supprimer)
        if (req.user.role === 'adminCom' && req.user.commission_id !== service.commission_id) {
            return res.status(403).json({ error: 'Vous ne pouvez supprimer que les services de votre commission' });
        }

        if (req.user.role === 'admin') {
            return res.status(403).json({ error: 'Seuls les SuperAdmin et AdminCom peuvent supprimer des services' });
        }

        // Vérifier s'il y a des membres dans ce service
        const checkMembersQuery = 'SELECT COUNT(*) as count FROM membres WHERE service_id = $1';
        db.query(checkMembersQuery, [id], (err, membersResult) => {
            if (err) {
                console.error('Erreur vérification membres:', err);
                return res.status(500).json({ error: 'Erreur serveur' });
            }

            const membersCount = parseInt(membersResult.rows[0].count);
            if (membersCount > 0) {
                return res.status(409).json({ 
                    error: `Impossible de supprimer ce service car il contient ${membersCount} membre(s). Veuillez d'abord réaffecter ou supprimer les membres.` 
                });
            }

            // Supprimer le service
            const deleteQuery = 'DELETE FROM services WHERE id = $1';
            db.query(deleteQuery, [id], (err) => {
                if (err) {
                    console.error('Erreur deleteService:', err);
                    return res.status(500).json({ error: 'Erreur lors de la suppression du service' });
                }
                // Émettre un événement WebSocket
                const io = req.app.get('io');
                if (io) {
                    io.emit('service:deleted', { id: parseInt(id), service });
                    io.emit('stats:updated');
                }
                res.json({ message: 'Service supprimé avec succès' });
            });
        });
    });
};

// 📊 Obtenir les statistiques d'un service
export const getServiceStats = (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            s.id,
            s.nom,
            s.commission_id,
            c.nom as commission_nom,
            COUNT(m.id) as total_membres,
            COUNT(CASE WHEN m.sexe = 'Homme' THEN 1 END) as hommes,
            COUNT(CASE WHEN m.sexe = 'Femme' THEN 1 END) as femmes
        FROM services s
        LEFT JOIN commissions c ON s.commission_id = c.id
        LEFT JOIN membres m ON s.id = m.service_id
        WHERE s.id = $1
        GROUP BY s.id, s.nom, s.commission_id, c.nom
    `;

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Erreur getServiceStats:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service introuvable' });
        }

        res.json(result.rows[0]);
    });
};