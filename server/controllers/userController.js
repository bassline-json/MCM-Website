import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { 
    accountCreatedEmailTemplate, 
    accountDeletedEmailTemplate 
} from '../utils/emailTemplate.js';

export const getUsers = (req, res) => {
    console.log(`Récupération des utilisateurs par ${req.user.email} (${req.user.role})`);
    
    const query = `
        SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.role, u.commission_id, u.service_id, u.is_active, u.created_at,
               c.nom as commission_nom, s.nom as service_nom
        FROM users u
        LEFT JOIN commissions c ON u.commission_id = c.id
        LEFT JOIN services s ON u.service_id = s.id
        ORDER BY u.created_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erreur getUsers:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        console.log(`${results.rows.length} utilisateurs récupérés`);
        res.json(results.rows);
    });
};

export const getUserById = (req, res) => {
    const { id } = req.params;
    
    console.log(`Récupération de l'utilisateur ID ${id} par ${req.user.email}`);
    
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    const query = `
        SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.role, u.commission_id, u.service_id, u.is_active, u.created_at,
               c.nom as commission_nom, s.nom as service_nom
        FROM users u
        LEFT JOIN commissions c ON u.commission_id = c.id
        LEFT JOIN services s ON u.service_id = s.id
        WHERE u.id = $1
    `;
    
    db.query(query, [parseInt(id)], (err, results) => {
        if (err) {
            console.error('Erreur getUserById:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        if (results.rows.length === 0) {
            console.log(`Utilisateur non trouvé avec l'ID: ${id}`);
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        console.log(`Utilisateur trouvé: ${results.rows[0].nom} ${results.rows[0].prenom}`);
        res.json(results.rows[0]);
    });
};

export const getUserProfile = (req, res) => {
    const userId = req.user.id;
    
    console.log(`Récupération du profil utilisateur ID ${userId}`);
    
    const query = `
        SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.role, u.commission_id, u.service_id,
               c.nom as commission_nom, s.nom as service_nom
        FROM users u
        LEFT JOIN commissions c ON u.commission_id = c.id
        LEFT JOIN services s ON u.service_id = s.id
        WHERE u.id = $1
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erreur getUserProfile:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        if (results.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        res.json(results.rows[0]);
    });
};

export const updateUserRole = (req, res) => {
    const { id } = req.params;
    const { role, commission_id, service_id } = req.body;

    console.log(`Modification du rôle utilisateur ID ${id} par ${req.user.email}`);

    if (!role) {
        return res.status(400).json({ error: 'Le rôle est requis' });
    }

    const query = 'UPDATE users SET role = $1, commission_id = $2, service_id = $3, updated_at = NOW() WHERE id = $4 RETURNING *';
    db.query(query, [role, commission_id || null, service_id || null, id], (err, results) => {
        if (err) {
            console.error('Erreur updateUserRole:', err);
            return res.status(500).json({ error: 'Erreur lors de la modification' });
        }
        
        if (results.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        console.log(`Rôle utilisateur ${id} modifié avec succès`);
        
        // Émettre un événement WebSocket
        if (req.app.get('io')) {
            req.app.get('io').emit('user_updated', {
                userId: id,
                user: results.rows[0]
            });
        }
        
        res.json({ 
            success: true,
            message: 'Rôle modifié avec succès',
            user: results.rows[0]
        });
    });
};

export const deleteUser = (req, res) => {
    const { id } = req.params;

    console.log(`Suppression utilisateur ID ${id} par ${req.user.email}`);

    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Récupérer les infos de l'utilisateur avant suppression pour l'email
    const getUserQuery = 'SELECT email, nom, prenom, role FROM users WHERE id = $1';
    db.query(getUserQuery, [id], (err, userResults) => {
        if (err) {
            console.error('Erreur récupération utilisateur:', err);
            return res.status(500).json({ error: 'Erreur lors de la suppression' });
        }

        if (userResults.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const userToDelete = userResults.rows[0];

        // Supprimer l'utilisateur
        const deleteQuery = 'DELETE FROM users WHERE id = $1';
        db.query(deleteQuery, [id], async (err) => {
            if (err) {
                console.error('Erreur deleteUser:', err);
                return res.status(500).json({ error: 'Erreur lors de la suppression' });
            }
            
            console.log(`Utilisateur ${id} supprimé avec succès`);
            
            // ENVOYER L'EMAIL DE SUPPRESSION DIRECTEMENT ICI
            try {
                await accountDeletedEmailTemplate(
                    userToDelete.email, 
                    `${userToDelete.prenom} ${userToDelete.nom}`, 
                    userToDelete.role
                );
                console.log(`✅ Email de suppression envoyé à ${userToDelete.email}`);
            } catch (emailError) {
                console.error('❌ Erreur envoi email suppression:', emailError);
                // Ne pas bloquer la suppression si l'email échoue
            }
            
            // Émettre un événement WebSocket
            if (req.app.get('io')) {
                req.app.get('io').emit('user_deleted', {
                    userId: id,
                    user: userToDelete
                });
            }
            
            res.json({ 
                success: true,
                message: 'Utilisateur supprimé avec succès'
            });
        });
    });
};

export const updateProfile = async (req, res) => {
    const { nom, prenom, email, telephone, mot_de_passe } = req.body;
    const userId = req.user.id;

    console.log(`Mise à jour profil utilisateur ID ${userId}`);

    if (!nom || !prenom || !email) {
        return res.status(400).json({ error: 'Nom, prénom et email requis' });
    }

    try {
        const checkEmailQuery = 'SELECT id FROM users WHERE email = $1 AND id != $2';
        
        db.query(checkEmailQuery, [email, userId], async (err, emailResults) => {
            if (err) {
                console.error('Erreur vérification email:', err);
                return res.status(500).json({ error: 'Erreur serveur' });
            }
            
            if (emailResults.rows.length > 0) {
                return res.status(409).json({ error: 'Cet email est déjà utilisé par un autre utilisateur' });
            }

            try {
                let query = 'UPDATE users SET nom = $1, prenom = $2, email = $3, telephone = $4, updated_at = NOW()';
                let params = [nom, prenom, email, telephone || null];
                let paramIndex = 5;

                if (mot_de_passe && mot_de_passe.trim() !== '') {
                    const hashedPassword = await bcrypt.hash(mot_de_passe, 12);
                    query += `, mot_de_passe = $${paramIndex}`;
                    params.push(hashedPassword);
                    paramIndex++;
                }

                query += ` WHERE id = $${paramIndex} RETURNING id, nom, prenom, email, telephone, role, commission_id, service_id`;
                params.push(userId);

                db.query(query, params, (err, results) => {
                    if (err) {
                        console.error('Erreur updateProfile:', err);
                        return res.status(500).json({ error: 'Erreur lors de la modification' });
                    }
                    
                    if (results.rows.length === 0) {
                        return res.status(404).json({ error: 'Utilisateur non trouvé' });
                    }
                    
                    const updatedUser = results.rows[0];
                    console.log(`Profil utilisateur ${userId} modifié avec succès`);
                    
                    // Émettre un événement WebSocket
                    if (req.app.get('io')) {
                        req.app.get('io').emit('profile_updated', {
                            userId: userId,
                            user: updatedUser
                        });
                    }
                    
                    // Générer un nouveau token JWT avec les données mises à jour
                    const tokenPayload = {
                        id: updatedUser.id,
                        email: updatedUser.email,
                        nom: updatedUser.nom,
                        prenom: updatedUser.prenom,
                        role: updatedUser.role,
                        commission_id: updatedUser.commission_id,
                        service_id: updatedUser.service_id
                    };
                    const JWT_SECRET = process.env.JWT_SECRET || 'mcm_secret_key_2024';
                    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

                    res.json({ 
                        success: true,
                        message: 'Profil modifié avec succès',
                        user: updatedUser,
                        token: token
                    });
                });
            } catch (hashError) {
                console.error('Erreur hachage mot de passe:', hashError);
                res.status(500).json({ error: 'Erreur lors du traitement du mot de passe' });
            }
        });
    } catch (error) {
        console.error('Erreur updateProfile générale:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};