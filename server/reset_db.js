import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mcm_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function resetDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Suppression des anciennes données...');
    
    // We update users to avoid foreign key constraints errors
    await client.query('UPDATE users SET commission_id = NULL, service_id = NULL');
    
    await client.query('TRUNCATE TABLE services CASCADE');
    await client.query('TRUNCATE TABLE commissions CASCADE');

    const commissions = [
      { id: 1, nom: 'Évangélisation' },
      { id: 2, nom: 'Multimédia & Audiovisuel' },
      { id: 3, nom: 'Presse & Documentation' },
      { id: 4, nom: 'Chœur' },
      { id: 5, nom: 'Accueil' },
      { id: 6, nom: 'Comptabilité' },
      { id: 7, nom: 'Organisation & Logistique' },
      { id: 8, nom: 'Liturgie MCM-Bénin (Service Délégué)' }
    ];

    console.log('Insertion des commissions...');
    for (const c of commissions) {
      await client.query('INSERT INTO commissions (id, nom) VALUES ($1, $2)', [c.id, c.nom]);
    }
    
    // reset sequence
    await client.query("SELECT setval(pg_get_serial_sequence('commissions', 'id'), coalesce(max(id)+1, 1), false) FROM commissions;");

    const services = [
      { nom: 'Intercession', commission_id: 1 },
      { nom: 'Social & Humanitaire', commission_id: 1 },
      { nom: 'Liturgique', commission_id: 4 },
      { nom: 'Louange & Adoration', commission_id: 4 },
      { nom: 'Logistique musicale', commission_id: 4 },
      { nom: 'Protocole / Accueil', commission_id: 5 },
      { nom: 'Ordre & Sécurité', commission_id: 5 },
      { nom: 'Enregistrement', commission_id: 5 },
      { nom: 'Intégration & Sacrements', commission_id: 5 },
      { nom: 'Suivi Budgétaire', commission_id: 6 },
      { nom: 'Collecte & Offrandes', commission_id: 6 },
      { nom: 'Installation & Matériel', commission_id: 7 },
      { nom: 'Transport & Mobilité', commission_id: 7 },
      { nom: 'Approvisionnement', commission_id: 7 },
      { nom: 'Préparation des événements', commission_id: 7 }
    ];

    console.log('Insertion des services...');
    let s_id = 1;
    for (const s of services) {
      await client.query('INSERT INTO services (id, nom, commission_id) VALUES ($1, $2, $3)', [s_id++, s.nom, s.commission_id]);
    }
    await client.query("SELECT setval(pg_get_serial_sequence('services', 'id'), coalesce(max(id)+1, 1), false) FROM services;");

    await client.query('COMMIT');
    console.log('Base de données mise à jour avec succès !');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour', e);
  } finally {
    client.release();
    pool.end();
  }
}

resetDB();
