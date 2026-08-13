// Force IPv4-first DNS resolution process-wide to prevent ENETUNREACH IPv6 errors on cloud hosts
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// Shim global crypto for Baileys compatibility in Node 18
if (!globalThis.crypto) {
    globalThis.crypto = require('crypto').webcrypto;
}

const path = require('path');
// Load environment variables first from backend/.env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('./lib/mongoose-pg-bridge');
const { bootstrapDatabase } = require('./lib/bootstrap');


const app = express();
const PORT = process.env.PORT || 5001;

// Trust proxy for Render reverse proxy rate limiting
app.set('trust proxy', 1);

// Enable security headers with custom Content Security Policy to allow Cashfree Checkout SDK
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://*.cashfree.com"],
            connectSrc: ["'self'", "https://*.cashfree.com"],
            frameSrc: ["'self'", "https://*.cashfree.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
            formAction: ["'self'", "https://*.cashfree.com"],
            imgSrc: ["'self'", "data:", "https://*.cashfree.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false
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
    'https://khelo-patna-website-final.vercel.app',
    process.env.FRONTEND_URL,
    ...parseOriginList(process.env.FRONTEND_URLS)
].filter(Boolean));

const isAllowedDynamicOrigin = (origin) => {
    try {
        const parsed = new URL(origin);
        // Allow Vercel preview/deployment URLs and local dev
        if (parsed.hostname.endsWith('.vercel.app')) return true;
        if (process.env.NODE_ENV === 'production') return false;
        return (
            ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname) ||
            parsed.hostname.endsWith('.vusercontent.net')
        );
    } catch (e) {
        return false;
    }
};

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.has(origin) || isAllowedDynamicOrigin(origin)) {
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

// Rate limiter for public dues lookup (prevents phone-number enumeration)
const duesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Too many fee lookup requests. Please try again later.' }
});
app.use('/api/academy/dues', duesLimiter);

// Database Connection
mongoose.connect()
    .catch(err => console.error('Database connection error:', err));

// WhatsApp Engine Startup
const { initWhatsApp, forceReconnect, getQR, getStatus, setBotEnabled, getBotEnabled, getDiagnostics, getRawRemoteStatus } = require('./services/whatsapp');
// Require botStates to register the message listener callback
require('./services/botStates');
initWhatsApp();

// Cashfree integration checks
const { hasCredentials, CASHFREE_ENV } = require('./services/cashfree');

// Import auth middleware for securing admin routes
const { authenticateToken, authorizeRoles } = require('./middlewares/auth');

// Periodic cleanup: expire stale PENDING bookings (releases their slots)
const { startBookingExpirySweep } = require('./services/expirePendingBookings');
startBookingExpirySweep();

// Automated 2-hour WhatsApp booking reminder cron
const { startReminderCron } = require('./services/reminders');
startReminderCron();

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
const scoreboardsRoutes = require('./routes/scoreboards');
const tournamentsRoutes = require('./routes/tournaments');
const pushRoutes = require('./routes/push');

// Apply Routes
app.use('/api', authRoutes);
app.use('/api', slotsRoutes);
app.use('/api', paymentsRoutes);
app.use('/api', academyRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', pushRoutes);
app.use('/api', checkinRoutes);
app.use('/api', reportsRoutes);
app.use('/api', uploadRoutes);
app.use('/api', financeRoutes);
app.use('/api', reviewsRoutes);
app.use('/api', scoreboardsRoutes);
app.use('/api', tournamentsRoutes);

// WhatsApp Status API for Admin Dashboard (Secured)
app.get('/api/admin/whatsapp/status', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), (req, res) => {
    res.json({
        status: getStatus(),
        qr: getQR(),
        bot_enabled: getBotEnabled()
    });
});

app.post('/api/admin/whatsapp/toggle-bot', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'ADMIN', 'STAFF', 'RECEPTIONIST'), async (req, res) => {
    const { enabled } = req.body;
    setBotEnabled(enabled);
    
    try {
        const AuditLog = require('./models/AuditLog');
        await new AuditLog({
            tenantId: req.user.tenantId || 'KHELOPATNA',
            userId: req.user.username || req.user.role || 'owner',
            module: 'Integrations',
            action: 'TOGGLE_WHATSAPP_BOT',
            newData: { enabled: Boolean(enabled), status: enabled ? 'ENABLED' : 'DISABLED', toggledBy: req.user.username || req.user.role || 'owner' },
            timestamp: new Date()
        }).save();
    } catch (e) {
        console.warn('Failed to save bot toggle audit log:', e.message);
    }

    res.json({ success: true, bot_enabled: getBotEnabled() });
});

app.post('/api/admin/whatsapp/reconnect', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER'), (req, res) => {
    forceReconnect();
    res.json({ success: true, message: 'WhatsApp reconnection initiated.' });
});

app.get('/api/admin/whatsapp/diagnose', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER'), (req, res) => {
    res.json(getDiagnostics());
});

// Primary Incoming Webhook for external Baileys Microservice
const { handleIncomingWebhook } = require('./services/botStates');
app.post('/api/whatsapp/webhook', (req, res) => {
    const { phone, text, secret } = req.body;
    const apiSecret = process.env.WA_API_SECRET;
    if (apiSecret && secret !== apiSecret && req.headers['x-wa-secret'] !== apiSecret) {
        return res.status(403).json({ error: 'Unauthorized webhook call.' });
    }
    const incomingText = text || req.body?.message;
    if (!phone || !incomingText) {
        return res.status(400).json({ error: 'phone and text/message are required.' });
    }

    // Immediately respond 200 OK to microservice to avoid 502/500 gateway timeouts
    res.json({ success: true, status: 'QUEUED' });

    // Process bot logic asynchronously in background
    setImmediate(async () => {
        try {
            await handleIncomingWebhook({ phone, text: incomingText });
        } catch (err) {
            console.error('[WhatsApp Primary Webhook Async Error]:', err.message || err);
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    if (req.query.trigger_reconnect === 'true') {
        console.log('🔄 Triggering forceReconnect via health endpoint query parameter...');
        forceReconnect();
    }
    res.json({ 
        status: 'OK', 
        db_connected: mongoose.connection.readyState === 1,
        whatsapp_status: getStatus(),
        whatsapp_diagnostics: {
            ...getDiagnostics(),
            qr_loaded: !!getQR(),
            qr_length: getQR() ? getQR().length : 0
        },
        cashfree_diagnostics: {
            has_credentials: hasCredentials(),
            env: CASHFREE_ENV
        },
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

    // Helper function to check if current time is in late-night off-hours (01:00 AM to 05:30 AM IST)
    // Pausing pinger during these 4.5 hours saves ~135+ free tier hours/month on Render
    function isOffHoursIST() {
        try {
            const now = new Date();
            const istTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: 'numeric', minute: 'numeric' });
            const [hours, minutes] = istTimeStr.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes;
            // Off hours: 01:00 AM (60 min) to 05:30 AM (330 min) IST
            return totalMinutes >= 60 && totalMinutes < 330;
        } catch (e) {
            return false;
        }
    }

    // Self-pinger to prevent free-tier servers from sleeping during active hours (05:30 AM - 01:00 AM IST, every 12 minutes)
    const intervalMs = 12 * 60 * 1000;
    setInterval(async () => {
        if (isOffHoursIST()) {
            console.log('[Self-Pinger] Late-night off-hours active (01:00 AM - 05:30 AM IST). Skipping keep-alive ping to allow Render server to sleep.');
            return;
        }
        try {
            const host = process.env.BACKEND_SELF_URL || 'https://api.khelopatna.in';
            console.log(`[Self-Pinger] Sending keep-alive ping to ${host}/health...`);
            const axios = require('axios');
            await axios.get(`${host}/health`);
        } catch (err) {
            console.warn('[Self-Pinger] Ping failed:', err.message);
        }
    }, intervalMs);
});

module.exports = app;
