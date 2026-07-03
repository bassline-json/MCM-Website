import db from '../config/db.js';

// Liste des commissions fixes avec indication RAS
const COMMISSIONS_INFO = {
    1: { nom: 'Évangélisation', hasServices: true },
    2: { nom: 'Multimédia et audiovisuel', hasServices: false, ras: true },
    3: { nom: 'Presse et documentation', hasServices: false, ras: true },
    4: { nom: 'Chœur', hasServices: true },
    5: { nom: 'Accueil', hasServices: true },
    6: { nom: 'Comptabilité', hasServices: true },
    7: { nom: 'Organisation et logistique', hasServices: true },
    8: { nom: 'Liturgie MCM bénin service délégué', hasServices: false, ras: true }
};

// 🔍 Récupérer toutes les commissions
export const getCommissions = (req, res) => {
    const query = 'SELECT * FROM commissions ORDER BY id';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erreur getCommissions:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        // Enrichir les données avec les informations RAS
        const enrichedResults = results.rows.map(commission => ({
            ...commission,
            ras: COMMISSIONS_INFO[commission.id]?.ras || false,
            hasServices: COMMISSIONS_INFO[commission.id]?.hasServices || false
        }));

        res.json(enrichedResults);
    });
};

// 🔍 Récupérer une commission par ID
export const getCommissionById = (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM commissions WHERE id = $1';
    
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Erreur getCommissionById:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Commission introuvable' });
        }

        const commission = result.rows[0];
        const enrichedCommission = {
            ...commission,
            ras: COMMISSIONS_INFO[commission.id]?.ras || false,
            hasServices: COMMISSIONS_INFO[commission.id]?.hasServices || false
        };

        res.json(enrichedCommission);
    });
};

// 📊 Obtenir les statistiques d'une commission
export const getCommissionStats = (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            c.id,
            c.nom,
            c.description,
            COUNT(DISTINCT s.id) as total_services,
            COUNT(DISTINCT m.id) as total_membres,
            COUNT(DISTINCT CASE WHEN m.sexe = 'Homme' THEN m.id END) as hommes,
            COUNT(DISTINCT CASE WHEN m.sexe = 'Femme' THEN m.id END) as femmes
        FROM commissions c
        LEFT JOIN services s ON c.id = s.commission_id
        LEFT JOIN membres m ON s.id = m.service_id
        WHERE c.id = $1
        GROUP BY c.id, c.nom, c.description
    `;

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Erreur getCommissionStats:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Commission introuvable' });
        }

        const stats = result.rows[0];
        const enrichedStats = {
            ...stats,
            ras: COMMISSIONS_INFO[stats.id]?.ras || false,
            hasServices: COMMISSIONS_INFO[stats.id]?.hasServices || false,
            // Si c'est une commission RAS et qu'elle a maintenant des services
            rasButHasServices: COMMISSIONS_INFO[stats.id]?.ras && parseInt(stats.total_services) > 0
        };

        res.json(enrichedStats);
    });
};

// 🔍 Récupérer les services d'une commission avec leurs membres
export const getCommissionWithServices = (req, res) => {
    const { id } = req.params;

    // Récupérer la commission
    const commissionQuery = 'SELECT * FROM commissions WHERE id = $1';
    db.query(commissionQuery, [id], (err, commissionResult) => {
        if (err) {
            console.error('Erreur getCommissionWithServices:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (commissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Commission introuvable' });
        }

        const commission = commissionResult.rows[0];

        // Récupérer les services de la commission
        const servicesQuery = `
            SELECT 
                s.*,
                COUNT(m.id) as total_membres
            FROM services s
            LEFT JOIN membres m ON s.id = m.service_id
            WHERE s.commission_id = $1
            GROUP BY s.id
            ORDER BY s.nom
        `;

        db.query(servicesQuery, [id], (err, servicesResult) => {
            if (err) {
                console.error('Erreur récupération services:', err);
                return res.status(500).json({ error: 'Erreur serveur' });
            }

            const response = {
                ...commission,
                ras: COMMISSIONS_INFO[commission.id]?.ras || false,
                hasServices: servicesResult.rows.length > 0,
                canAddServices: true, // Toutes les commissions peuvent ajouter des services
                services: servicesResult.rows
            };

            res.json(response);
        });
    });
};

// ➕ Créer une nouvelle commission (réservé au superadmin)
export const createCommission = (req, res) => {
    const { nom, description } = req.body;

    if (!nom) {
        return res.status(400).json({ error: 'Le nom de la commission est requis' });
    }

    // Seul le superadmin peut créer des commissions
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Seuls les SuperAdmin peuvent créer des commissions' });
    }

    // Vérifier si la commission existe déjà
    const checkQuery = 'SELECT id FROM commissions WHERE nom = $1';
    db.query(checkQuery, [nom], (err, result) => {
        if (err) {
            console.error('Erreur vérification commission:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (result.rows.length > 0) {
            return res.status(409).json({ error: 'Une commission avec ce nom existe déjà' });
        }

        // Créer la commission
        const insertQuery = 'INSERT INTO commissions (nom, description, created_at) VALUES ($1, $2, NOW()) RETURNING *';
        db.query(insertQuery, [nom, description || null], (err, result) => {
            if (err) {
                console.error('Erreur createCommission:', err);
                return res.status(500).json({ error: 'Erreur lors de la création de la commission' });
            }
            // Émettre un événement WebSocket
            const io = req.app.get('io');
            if (io) {
                io.emit('commission:created', result.rows[0]);
                io.emit('stats:updated');
            }
            res.status(201).json({ 
                message: 'Commission créée avec succès', 
                commission: result.rows[0]
            });
        });
    });
};

// ✏️ Mettre à jour une commission (réservé au superadmin)
export const updateCommission = (req, res) => {
    const { id } = req.params;
    const { nom, description } = req.body;

    if (!nom) {
        return res.status(400).json({ error: 'Le nom de la commission est requis' });
    }

    // Seul le superadmin peut modifier des commissions
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Seuls les SuperAdmin peuvent modifier des commissions' });
    }

    // Vérifier que la commission existe
    const checkQuery = 'SELECT * FROM commissions WHERE id = $1';
    db.query(checkQuery, [id], (err, result) => {
        if (err) {
            console.error('Erreur vérification commission:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Commission introuvable' });
        }

        // Mettre à jour la commission
        const updateQuery = 'UPDATE commissions SET nom = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *';
        db.query(updateQuery, [nom, description, id], (err, result) => {
            if (err) {
                console.error('Erreur updateCommission:', err);
                return res.status(500).json({ error: 'Erreur lors de la mise à jour de la commission' });
            }
            // Émettre un événement WebSocket
            const io = req.app.get('io');
            if (io) {
                io.emit('commission:updated', result.rows[0]);
                io.emit('stats:updated');
            }
            res.json({ 
                message: 'Commission mise à jour avec succès', 
                commission: result.rows[0]
            });
        });
    });
};

// 🗑️ Supprimer une commission (réservé au superadmin)
export const deleteCommission = (req, res) => {
    const { id } = req.params;

    // Seul le superadmin peut supprimer des commissions
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Seuls les SuperAdmin peuvent supprimer des commissions' });
    }

    // Vérifier que la commission existe
    const checkQuery = 'SELECT * FROM commissions WHERE id = $1';
    db.query(checkQuery, [id], (err, result) => {
        if (err) {
            console.error('Erreur vérification commission:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Commission introuvable' });
        }

        // Vérifier s'il y a des services dans cette commission
        const checkServicesQuery = 'SELECT COUNT(*) as count FROM services WHERE commission_id = $1';
        db.query(checkServicesQuery, [id], (err, servicesResult) => {
            if (err) {
                console.error('Erreur vérification services:', err);
                return res.status(500).json({ error: 'Erreur serveur' });
            }

            const servicesCount = parseInt(servicesResult.rows[0].count);
            if (servicesCount > 0) {
                return res.status(409).json({ 
                    error: `Impossible de supprimer cette commission car elle contient ${servicesCount} service(s). Veuillez d'abord supprimer les services.` 
                });
            }

            // Supprimer la commission
            const deleteQuery = 'DELETE FROM commissions WHERE id = $1';
            db.query(deleteQuery, [id], (err) => {
                if (err) {
                    console.error('Erreur deleteCommission:', err);
                    return res.status(500).json({ error: 'Erreur lors de la suppression de la commission' });
                }
                // Émettre un événement WebSocket
                const io = req.app.get('io');
                if (io) {
                    io.emit('commission:deleted', { id: parseInt(id) });
                    io.emit('stats:updated');
                }
                res.json({ message: 'Commission supprimée avec succès' });
            });
        });
    });
};