-- Activer l'extension pour les UUID si nécessaire
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 📁 Table des commissions
CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 📁 Table des services
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    commission_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE
);

-- 👥 Table des utilisateurs (Admins, AdminCom, Superadmin)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    telephone VARCHAR(20) DEFAULT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'adminCom', 'superadmin')) NOT NULL,
    commission_id INTEGER DEFAULT NULL,
    service_id INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

-- 👤 Table des membres
CREATE TABLE IF NOT EXISTS membres (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    sexe VARCHAR(10) CHECK (sexe IN ('Homme', 'Femme')),
    date_naissance DATE,
    email VARCHAR(150),
    telephone VARCHAR(20),
    service_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- 📊 Création des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_services_commission ON services(commission_id);
CREATE INDEX IF NOT EXISTS idx_membres_service ON membres(service_id);

-- 🔄 Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🔄 Triggers pour updated_at
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membres_updated_at BEFORE UPDATE ON membres
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ✅ SUPPRESSION DES DONNÉES EXISTANTES (pour réinitialisation)
TRUNCATE TABLE membres CASCADE;
TRUNCATE TABLE services CASCADE;
TRUNCATE TABLE commissions CASCADE;

-- ✅ Insertion des commissions (CONFORME AU DOCUMENT)
INSERT INTO commissions (id, nom, description) VALUES
(1, 'Évangélisation', 'Commission chargée de l''évangélisation'),
(2, 'Multimédia et audiovisuel', 'Commission en charge de la technique audio et visuelle - RAS'),
(3, 'Presse et documentation', 'Commission de communication et d''archives - RAS'),
(4, 'Chœur', 'Commission musicale et louange'),
(5, 'Accueil', 'Commission d''accueil et d''hospitalité'),
(6, 'Comptabilité', 'Commission financière et budgétaire'),
(7, 'Organisation et logistique', 'Commission organisationnelle'),
(8, 'Liturgie MCM bénin service délégué', 'Commission liturgique - RAS')
ON CONFLICT (id) DO UPDATE SET 
    nom = EXCLUDED.nom, 
    description = EXCLUDED.description;

-- Réinitialiser la séquence des commissions
SELECT setval('commissions_id_seq', (SELECT MAX(id) FROM commissions));

-- ✅ Insertion des services (CONFORME AU DOCUMENT - UNIQUEMENT LES SERVICES EXISTANTS)
INSERT INTO services (nom, commission_id) VALUES
-- Commission 1: Évangélisation
('Intercession', 1),
('Social et humanitaire', 1),

-- Commission 2: Multimédia et audiovisuel - RAS (aucun service)

-- Commission 3: Presse et documentation - RAS (aucun service)

-- Commission 4: Chœur
('Louange et adoration', 4),
('Logistique musicale', 4),
('Liturgie', 4),

-- Commission 5: Accueil
('Protocole /Accueil', 5),
('Ordre et sécurité', 5),
('Enregistrements', 5),
('Intégrations et sacrements', 5),

-- Commission 6: Comptabilité
('Suivi budgétaire', 6),
('Collecte et offrande', 6),

-- Commission 7: Organisation et logistique
('Installation et matériel', 7),
('Transport et mobilité', 7),
('Approvisionnement', 7),
('Préparation des événements', 7)

-- Commission 8: Liturgie MCM bénin service délégué - RAS (aucun service)

ON CONFLICT DO NOTHING;

-- 👑 Insertion d'un superadmin par défaut
-- Mot de passe : admin123 (à changer en production !)
INSERT INTO users (nom, prenom, email, mot_de_passe, role) VALUES
('Admin', 'Super', 'admin@mcm.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKCfHPJm', 'superadmin')
ON CONFLICT (email) DO UPDATE SET 
    nom = EXCLUDED.nom, 
    prenom = EXCLUDED.prenom, 
    role = EXCLUDED.role;

-- 📊 Vue pour les statistiques (optionnel mais utile)
CREATE OR REPLACE VIEW vue_statistiques AS
SELECT 
    (SELECT COUNT(*) FROM commissions) as total_commissions,
    (SELECT COUNT(*) FROM services) as total_services,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM membres) as total_membres,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
    (SELECT COUNT(*) FROM users WHERE role = 'adminCom') as total_adminCom,
    (SELECT COUNT(*) FROM users WHERE is_active = true) as users_actifs;

-- 📝 Commentaires pour clarification
COMMENT ON TABLE commissions IS 'Table des commissions MCM - 3 commissions sans services (RAS): Multimédia et audiovisuel, Presse et documentation, Liturgie MCM bénin service délégué';
COMMENT ON TABLE services IS 'Table des services - Seuls les services existants selon le document support sont créés. Les commissions RAS peuvent recevoir de nouveaux services via l''interface.';