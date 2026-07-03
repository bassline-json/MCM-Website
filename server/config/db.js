import { Pool } from 'pg';
import dotenv from 'dotenv';

// Force reload of env vars
dotenv.config({ override: true });

// Build config — Supabase (DATABASE_URL) en production, PostgreSQL local en développement
let config;

if (process.env.DATABASE_URL) {
    // ✅ Production : Render + Supabase via DATABASE_URL
    console.log('🌐 Connexion à la base via DATABASE_URL (Supabase)');
    config = {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,  // Supabase peut être lent au 1er démarrage
        keepAlive: true,
    };
} else {
    // ✅ Développement local : PostgreSQL sur le PC
    console.log('💻 Connexion à la base locale PostgreSQL');
    config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD).trim() : '',
        database: process.env.DB_NAME || 'mcm_db',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };
}

const pool = new Pool(config);


// Gestion des erreurs du pool
pool.on('error', (err) => {
    console.error('❌ Pool Error:', err.message);
});
pool.on('connect', () => {
    console.log('✅ Client connected to pool');
});

// Function query - Returns the full result object
const query = (text, params, callback) => {
    const start = Date.now();
    
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    
    return pool.query(text, params, (err, result) => {
        const duration = Date.now() - start;
        
        if (err) {
            console.error('❌ Query Error:', err.message);
            console.error('   Query:', text);
            if (callback) return callback(err);
            return;
        }
        
        if (process.env.NODE_ENV === 'development') {
            console.log(`✓ Query executed in ${duration}ms`);
        }
        
        if (callback) {
            // Pass result object with rows property for compatibility
            callback(null, { rows: result.rows });
        }
    });
};

// Function to close pool
const end = (callback) => {
    console.log('🔌 Closing PostgreSQL pool...');
    pool.end((err) => {
        if (err) {
            console.error('❌ Error closing pool:', err.message);
        } else {
            console.log('✅ Pool closed');
        }
        if (callback) callback(err);
    });
};

export default {
    query,
    end,
    pool
};