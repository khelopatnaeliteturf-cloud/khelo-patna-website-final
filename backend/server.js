// Shim global crypto for Baileys compatibility in Node 18
if (!globalThis.crypto) {
    globalThis.crypto = require('crypto').webcrypto;
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('./lib/mongoose-pg-bridge');
const dotenv = require('dotenv');
const path = require('path');
const { bootstrapDatabase } = require('./lib/bootstrap');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enable security headers
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP locally to allow embedded maps/APIs in dev
}));

// CORS Configuration (credentials require a strict origin allow-list)
const parseOriginList = (value = '') => value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://khelopatna.in',
    'https://www.khelopatna.in',
    process.env.FRONTEND_URL,
    ...parseOriginList(process.env.FRONTEND_URLS)
].filter(Boolean));

const isLocalDevOrigin = (origin) => {
    if (process.env.NODE_ENV === 'production') return false;
    try {
        const parsed = new URL(origin);
        // Local dev + v0/Vercel preview sandboxes (requests arrive via the
        // Next.js same-origin proxy, which forwards the browser's Origin).
        return (
            ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname) ||
            parsed.hostname.endsWith('.vusercontent.net') ||
            parsed.hostname.endsWith('.vercel.app')
        );
    } catch (e) {
        return false;
    }
};

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
            callback(null, true);
        } else {
            // Deny CORS without throwing: throwing produces an HTML 500 error
            // page, which breaks JSON parsing on the client. `false` simply
            // omits CORS headers so the browser blocks the response itself.
            callback(null, false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    credentials: true
}));

// Parsers
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl === '/api/payment/webhook') {
            req.rawBody = buf.toString('utf8');
        }
    }
}));
app.use(express.urlencoded({ extended: true }));

// Serve static mock payment page
app.use(express.static(path.join(__dirname, 'public')));


// Global API Rate Limiter — generous for admin dashboard usage
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // allow 1000 requests per window (admin dashboards make many calls)
    message: { error: 'Too many requests from this IP. Please try again later.' },
    skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'
});
app.use('/api/', apiLimiter);

// Stricter login-specific limiter to block brute force
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many login attempts. Please wait 15 minutes before trying again.' }
});
app.use('/api/auth/login', loginLimiter);

// Database Connection
mongoose.connect()
    .catch(err => console.error('Database connection error:', err));

// WhatsApp Engine Startup
const { initWhatsApp, forceReconnect, getQR, getStatus, setBotEnabled, getBotEnabled } = require('./services/whatsapp');
// Require botStates to register the message listener callback
require('./services/botStates');
initWhatsApp();

// Import auth middleware for securing admin routes
const { authenticateToken, authorizeRoles } = require('./middlewares/auth');

// Periodic cleanup: expire stale PENDING bookings (releases their slots)
const { startBookingExpirySweep } = require('./services/expirePendingBookings');
startBookingExpirySweep();

// Import Routes
const authRoutes = require('./routes/auth');
const slotsRoutes = require('./routes/slots');
const paymentsRoutes = require('./routes/payments');
const academyRoutes = require('./routes/academy');
const inventoryRoutes = require('./routes/inventory');
const checkinRoutes = require('./routes/checkin');
const reportsRoutes = require('./routes/reports');
const uploadRoutes = require('./routes/upload');
const financeRoutes = require('./routes/finance');
const reviewsRoutes = require('./routes/reviews');

// Apply Routes
app.use('/api', authRoutes);
app.use('/api', slotsRoutes);
app.use('/api', paymentsRoutes);
app.use('/api', academyRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', checkinRoutes);
app.use('/api', reportsRoutes);
app.use('/api', uploadRoutes);
app.use('/api', financeRoutes);
app.use('/api', reviewsRoutes);

// WhatsApp Status API for Admin Dashboard (Secured)
app.get('/api/admin/whatsapp/status', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), (req, res) => {
    res.json({
        status: getStatus(),
        qr: getQR(),
        bot_enabled: getBotEnabled()
    });
});

app.post('/api/admin/whatsapp/toggle-bot', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER'), (req, res) => {
    const { enabled } = req.body;
    setBotEnabled(enabled);
    res.json({ success: true, bot_enabled: getBotEnabled() });
});

app.post('/api/admin/whatsapp/reconnect', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER'), (req, res) => {
    forceReconnect();
    res.json({ success: true, message: 'WhatsApp reconnection initiated.' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        db_connected: mongoose.connection.readyState === 1,
        whatsapp_status: getStatus(),
        timestamp: new Date() 
    });
});

// Start Express Server
app.listen(PORT, async () => {
    console.log(`Backend server successfully listening on port ${PORT}`);

    // Run database bootstrapping and admin user seeding
    try {
        await bootstrapDatabase();
    } catch (err) {
        console.error('Database bootstrap failed during startup:', err);
    }

    // Self-pinger to prevent free-tier servers from sleeping (every 12 minutes)
    const intervalMs = 12 * 60 * 1000;
    setInterval(async () => {
        try {
            const host = process.env.BACKEND_SELF_URL || `http://localhost:${PORT}`;
            console.log(`[Self-Pinger] Sending keep-alive ping to ${host}/health...`);
            const axios = require('axios');
            await axios.get(`${host}/health`);
        } catch (err) {
            console.warn('[Self-Pinger] Ping failed:', err.message);
        }
    }, intervalMs);
});

module.exports = app;
