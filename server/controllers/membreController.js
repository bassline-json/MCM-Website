import db from '../config/db.js';
import { birthdayFunction } from '../utils/emailTemplate.js';

/**
 * 🔔 Vérifie et envoie un email d'anniversaire si la date correspond à aujourd'hui
 */
export const checkAndSendBirthdayEmails = async () => {
    try {
        const today = new Date();
        const todayFormatted = (today.getMonth() + 1).toString().padStart(2, '0') + 
                             '-' + today.getDate().toString().padStart(2, '0'); // MM-DD local
        
        console.log(`🎂 Vérification des anniversaires pour le ${todayFormatted}...`);
        
        const query = 'SELECT id, nom, prenom, email, date_naissance FROM membres WHERE date_naissance IS NOT NULL';
        db.query(query, async (err, results) => {
            if (err) {
                console.error('Erreur vérification anniversaires:', err);
                return;
            }
            
            const birthdayPeople = results.rows.filter(member => {
                if (!member.date_naissance) return false;
                
                let dateStr;
                if (member.date_naissance instanceof Date) {
                    dateStr = member.date_naissance.toISOString().split('T')[0];
                } else {
                    dateStr = String(member.date_naissance).split('T')[0];
                }
                
                const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (!match) return false;
                
                const birthMonthDay = `${match[2]}-${match[3]}`;
                return birthMonthDay === todayFormatted;
            });
            
            console.log(`🎉 ${birthdayPeople.length} anniversaire(s) aujourd'hui`);
            
            for (const person of birthdayPeople) {
                if (person.email) {
                    try {
                        await birthdayFunction(
                            person.email, 
                            `${person.prenom} ${person.nom}`
                        );
                        console.log(`✅ Email anniversaire envoyé à ${person.email}`);
                    } catch (error) {
                        console.error(`❌ Erreur email anniversaire pour ${person.email}:`, error);
                    }
                } else {
                    console.log(`⚠️ Pas d'email pour ${person.prenom} ${person.nom}`);
                }
            }
        });
    } catch (error) {
        console.error('Erreur générale vérification anniversaires:', error);
    }
};

/**
 * 🔹 Récupérer tous les membres (filtré selon le rôle de l'utilisateur)
 */
export const getMembres = (req, res) => {
    let query = `
        SELECT m.*, s.nom as service_nom, c.nom as commission_nom
        FROM membres m
        LEFT JOIN services s ON m.service_id = s.id
        LEFT JOIN commissions c ON s.commission_id = c.id
    `;
    let params = [];

    if (req.user.role === 'admin') {
        query += ' WHERE m.service_id = $1';
        params = [req.user.service_id];
    } else if (req.user.role === 'adminCom') {
        query += ' WHERE c.id = $1';
        params = [req.user.commission_id];
    }

    query += ' ORDER BY m.nom, m.prenom';

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Erreur getMembres:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        res.json(results.rows);
    });
};

/**
 * 🔹 Récupérer les membres d'un service précis
 */
export const getMembresByService = (req, res) => {
    const { serviceId } = req.params;
    
    console.log(`Récupération des membres du service ${serviceId} par ${req.user.email} (${req.user.role})`);
    
    if (req.user.role === 'admin' && req.user.service_id !== parseInt(serviceId)) {
        return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const query = `
        SELECT m.*, s.nom as service_nom, c.nom as commission_nom
        FROM membres m
        LEFT JOIN services s ON m.service_id = s.id
        LEFT JOIN commissions c ON s.commission_id = c.id
        WHERE m.service_id = $1
        ORDER BY m.nom, m.prenom
    `;
    
    db.query(query, [serviceId], (err, results) => {
        if (err) {
            console.error('Erreur getMembresByService:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        console.log(`${results.rows.length} membres trouvés pour le service ${serviceId}`);
        res.json(results.rows);
    });
};

/**
 * 🔹 Récupérer un membre par ID
 */
export const getMembreById = (req, res) => {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID de membre invalide' });
    }

    const query = `
        SELECT m.*, s.nom as service_nom, c.nom as commission_nom
        FROM membres m
        LEFT JOIN services s ON m.service_id = s.id
        LEFT JOIN commissions c ON s.commission_id = c.id
        WHERE m.id = $1
    `;
    
    db.query(query, [parseInt(id)], (err, results) => {
        if (err) {
            console.error('Erreur getMembreById:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        if (results.rows.length === 0) {
            return res.status(404).json({ error: 'Membre non trouvé' });
        }
        
        const membre = results.rows[0];
        
        if (req.user.role === 'admin' && req.user.service_id !== membre.service_id) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        if (req.user.role === 'adminCom' && req.user.commission_id !== membre.commission_id) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }
        
        res.json(membre);
    });
};

/**
 * 🔹 Créer un nouveau membre
 */
export const createMembre = (req, res) => {
    const { nom, prenom, sexe, date_naissance, email, telephone, service_id } = req.body;

    if (!nom || !prenom || !sexe || !date_naissance || !service_id) {
        return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
    }

    if (req.user.role === 'admin' && req.user.service_id !== parseInt(service_id)) {
        return res.status(403).json({ error: 'Vous ne pouvez ajouter des membres que dans votre service' });
    }

    const query = `
        INSERT INTO membres (nom, prenom, sexe, date_naissance, email, telephone, service_id, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
    `;
    
    db.query(query, [nom, prenom, sexe, date_naissance, email || null, telephone || null, service_id], async (err, result) => {
        if (err) {
            console.error('Erreur insertion membre:', err);
            return res.status(500).json({ error: 'Erreur lors de l\'ajout du membre' });
        }
        const newMembre = result.rows[0];
        console.log(`✅ Membre ajouté avec succès, ID: ${newMembre.id}`);
        
        // Vérifier si c'est l'anniversaire du nouveau membre
        try {
            const today = new Date();
            const birthDate = new Date(newMembre.date_naissance);
            
            if (birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate()) {
                if (newMembre.email) {
                    await birthdayFunction(newMembre.email, `${newMembre.prenom} ${newMembre.nom}`);
                    console.log(`🎂 Email d'anniversaire envoyé à ${newMembre.email}`);
                }
            }
        } catch (emailError) {
            console.error('❌ Erreur envoi email anniversaire:', emailError);
            // Ne pas bloquer la création si l'email échoue
        }
        
        // Émettre les événements temps réel via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.emit('member:created', newMembre);
            io.emit('stats:updated');
        }
        
        res.status(201).json({ 
            message: 'Membre ajouté avec succès', 
            membre: newMembre
        });
    });
};

/**
 * 🔹 Mettre à jour un membre existant
 */
export const updateMembre = (req, res) => {
    const { id } = req.params;
    const { nom, prenom, sexe, date_naissance, email, telephone, service_id } = req.body;

    if (!nom || !prenom || !sexe || !date_naissance || !service_id) {
        return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
    }

    const checkPermission = `
        SELECT m.*, s.commission_id 
        FROM membres m 
        LEFT JOIN services s ON m.service_id = s.id 
        WHERE m.id = $1
    `;
    
    db.query(checkPermission, [id], (err, results) => {
        if (err) {
            console.error('Erreur vérification permission:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        if (results.rows.length === 0) {
            return res.status(404).json({ error: 'Membre non trouvé' });
        }

        const member = results.rows[0];
        
        if (req.user.role === 'admin' && req.user.service_id !== member.service_id) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        if (req.user.role === 'adminCom' && req.user.commission_id !== member.commission_id) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const updateQuery = `
            UPDATE membres 
            SET nom = $1, prenom = $2, sexe = $3, date_naissance = $4, email = $5, telephone = $6, service_id = $7, updated_at = NOW() 
            WHERE id = $8
            RETURNING *
        `;
        db.query(updateQuery, [nom, prenom, sexe, date_naissance, email || null, telephone || null, service_id, id], (err, result) => {
            if (err) {
                console.error('Erreur mise à jour membre:', err);
                return res.status(500).json({ error: 'Erreur lors de la modification' });
            }
            
            const updatedMembre = result.rows[0];
            console.log(`✏️ Membre ${id} modifié avec succès`);
            
            const io = req.app.get('io');
            if (io) {
                io.emit('member:updated', updatedMembre);
                io.emit('stats:updated');
            }
            
            res.json({ 
                message: 'Membre modifié avec succès',
                membre: updatedMembre
            });
        });
    });
};

/**
 * 🔹 Supprimer un membre
 */
export const deleteMembre = (req, res) => {
    const { id } = req.params;

    const checkPermission = `
        SELECT m.*, s.commission_id 
        FROM membres m 
        LEFT JOIN services s ON m.service_id = s.id 
        WHERE m.id = $1
    `;
    
    db.query(checkPermission, [id], (err, results) => {
        if (err) {
            console.error('Erreur vérification permission suppression:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        if (results.rows.length === 0) {
            return res.status(404).json({ error: 'Membre non trouvé' });
        }

        const member = results.rows[0];
        
        if (req.user.role === 'admin' && req.user.service_id !== member.service_id) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        if (req.user.role === 'adminCom' && req.user.commission_id !== member.commission_id) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const deleteQuery = 'DELETE FROM membres WHERE id = $1';
        db.query(deleteQuery, [id], (err) => {
            if (err) {
                console.error('Erreur suppression membre:', err);
                return res.status(500).json({ error: 'Erreur lors de la suppression' });
            }

            console.log(`🗑️ Membre ${id} supprimé avec succès`);
            
            const io = req.app.get('io');
            if (io) {
                io.emit('member:deleted', { id: parseInt(id), member });
                io.emit('stats:updated');
            }
            
            res.json({ message: 'Membre supprimé avec succès' });
        });
    });
};