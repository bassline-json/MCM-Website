/**
 * ================================
 * 🌐 MCM Management System Server
 * ================================
 */

import dotenv from 'dotenv';
dotenv.config({ quiet: true, path: '.env' });

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { Server } from 'socket.io';
import { createServer } from 'http';

import db from './server/config/db.js';

import authRoutes from './server/routes/authRoutes.js';
import commissionRoutes from './server/routes/commissionRoutes.js';
import serviceRoutes from './server/routes/serviceRoutes.js';
import membreRoutes from './server/routes/membreRoutes.js';
import userRoutes from './server/routes/userRoutes.js';
import contactRoutes from './server/routes/contactRoutes.js';
import { appMiddleware } from './server/middlewares/appMiddleware.js';
import { checkForgotPasswordToken, updatePassword } from './server/controllers/authController.js';
import { checkAndSendBirthdayEmails } from './server/controllers/membreController.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(express.json());
app.use(appMiddleware);
app.use(express.urlencoded({ extended: true }));

// Fichiers statiques (CSS, JS, images, etc.)
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Chemin des templates
const templatesPath = path.join(__dirname, 'public', 'templates');

// Rendre io accessible globalement
app.set('io', io);

// =============================
// 🔗 Vérification connexion PostgreSQL
// =============================
try {
    await db.pool.query('SELECT NOW()');
    console.log("✅ Connecté à PostgreSQL (Supabase)");
    console.log("🐘 Supabase connecté");
} catch (err) {
    console.error("❌ Erreur de connexion PostgreSQL :", err.message);
}

// =============================
// 📧 Configuration Email
// =============================
// La configuration email est gérée dans emailService.js via SMTP_USER/SMTP_PASS
if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_HOST) {
    console.log(`📧 Email configuré: ✅ (${process.env.SMTP_USER})`);
} else {
    console.log("📧 Email non configuré — vérifiez SMTP_USER, SMTP_PASS et SMTP_HOST dans .env");
}

// =============================
// 🔌 WebSocket pour temps réel
// =============================
io.on('connection', (socket) => {
    console.log('👤 Client connecté:', socket.id);
    
    // Écouter les événements personnalisés
    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`👤 Client ${socket.id} a rejoint la room: ${room}`);
    });
    
    socket.on('leave_room', (room) => {
        socket.leave(room);
        console.log(`👤 Client ${socket.id} a quitté la room: ${room}`);
    });
    
    socket.on('disconnect', () => {
        console.log('👋 Client déconnecté:', socket.id);
    });
});

// Export io pour l'utiliser dans les controllers
export { io };

// =============================
// 🚀 ROUTES API - ENREGISTREMENT
// =============================

// Routes d'authentification
app.use('/api/auth', authRoutes);

// Routes des commissions
app.use('/api/commissions', commissionRoutes);

// Routes des services
app.use('/api/services', serviceRoutes);

// Routes des membres
app.use('/api/membres', membreRoutes);

// Routes des utilisateurs
app.use('/api/users', userRoutes);

// Routes de contact
app.use('/api/contact', contactRoutes);

// =============================
// 🧭 ROUTES FRONTEND
// =============================

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(templatesPath, 'accueil.html'));
});

// Routes d'authentification
app.get('/login', (req, res) => {
    res.sendFile(path.join(templatesPath, 'login.html'));
});

app.get('/password-recovery', (req, res) => {
    res.sendFile(path.join(templatesPath, 'password-recovery.html'));
});

// Routes des pages légales (footer)
app.get('/politique-confidentialite', (req, res) => {
    res.sendFile(path.join(templatesPath, 'politique-confidentialite.html'));
});

app.get('/conditions-utilisation', (req, res) => {
    res.sendFile(path.join(templatesPath, 'conditions-utilisation.html'));
});

app.get('/protection-donnees', (req, res) => {
    res.sendFile(path.join(templatesPath, 'protection-donnees.html'));
});

app.get('/mentions-legales', (req, res) => {
    res.sendFile(path.join(templatesPath, 'mentions-legales.html'));
});

app.get('/newPassword/:token', checkForgotPasswordToken);
app.post('/newPassword/:token/complete', updatePassword);

// Routes des dashboards
app.get('/superadmin', (req, res) => {
    res.sendFile(path.join(templatesPath, 'superadmin.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(templatesPath, 'admin.html'));
});

app.get('/adminCom', (req, res) => {
    res.sendFile(path.join(templatesPath, 'adminCom.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(templatesPath, 'dashboard.html'));
});

// Servir les fichiers statiques du dossier templates
app.use(express.static(path.join(__dirname, 'public', 'templates')));

// =============================
// ❌ GESTION 404
// =============================
app.use((req, res, next) => {
    // Pour les routes API
    if (req.originalUrl.startsWith('/api/')) {
        console.log(`❌ Route API non trouvée: ${req.method} ${req.originalUrl}`);
        return res.status(404).json({
            error: 'Endpoint non trouvé',
            path: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString(),
        });
    }

    // Pour les routes frontend
    console.log(`❌ Page non trouvée: ${req.originalUrl}`);
    res.status(404).sendFile(path.join(templatesPath, '404.html'), err => {
        if (err) {
            console.error('Erreur lors de la lecture de 404.html:', err);
            res.status(404).send('Page non trouvée');
        }
    });
});

// =============================
// 💥 GESTION 500 (Erreurs serveur)
// =============================
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err.stack || err.message);

    // Pour les routes API
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(500).json({
            error: 'Erreur interne du serveur',
            message: NODE_ENV === 'development' ? err.message : 'Une erreur est survenue',
            timestamp: new Date().toISOString(),
        });
    }

    // Pour les routes frontend
    res.status(500).sendFile(path.join(templatesPath, '500.html'), sendErr => {
        if (sendErr) {
            console.error('Erreur lors de la lecture de 500.html:', sendErr);
            res.status(500).send('Erreur interne du serveur');
        }
    });
});

// =============================
// 🎂 GESTION DES ANNIVERSAIRES AUTOMATIQUES
// =============================

// Fonction pour vérifier les anniversaires
const startBirthdayChecker = () => {
    
    // Vérifier immédiatement au démarrage
    checkAndSendBirthdayEmails();
    
    // Planifier la vérification quotidienne (toutes les 24h)
    const dailyCheckInterval = setInterval(() => {
        checkAndSendBirthdayEmails();
    }, 24 * 60 * 60 * 1000); // 24 heures
    
    // Vérification de test toutes les heures en développement
    if (NODE_ENV === 'development') {
        const testCheckInterval = setInterval(() => {
            checkAndSendBirthdayEmails();
        }, 60 * 60 * 1000); // 1 heure
        
        // Nettoyer l'intervalle de test si nécessaire
        process.on('SIGINT', () => {
            clearInterval(testCheckInterval);
            clearInterval(dailyCheckInterval);
            process.exit(0);
        });
    }
    
    // Nettoyer les intervalles à l'arrêt
    process.on('SIGINT', () => {
        clearInterval(dailyCheckInterval);
        process.exit(0);
    });
};

// =============================
// 🚀 Lancement du serveur
// =============================
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🎯 MCM Management System démarré !`);
    console.log(`🔗 URL locale: http://localhost:${PORT}`);
    console.log(`📝 Environnement: ${NODE_ENV}`);
    console.log(`🔌 WebSocket activé pour le temps réel`);
    
    // Démarrer le système de vérification des anniversaires
    startBirthdayChecker();
});

httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Le port ${PORT} est déjà utilisé.`);
        console.error(`   👉 Fermez l'autre serveur ou changez PORT dans .env\n`);
        process.exit(1);
    } else {
        throw err;
    }
});