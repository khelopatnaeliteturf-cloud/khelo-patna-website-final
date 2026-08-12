const express = require('express');
const cors = require('cors');
const dns = require('dns');
const pino = require('pino');
const qrcode = require('qrcode');
const { Pool } = require('pg');
require('dotenv').config();

// Force IPv4 first DNS lookup to prevent ENETUNREACH on cloud environments
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// Global crypto shim for Node 18+ Baileys compatibility
if (!globalThis.crypto) {
    globalThis.crypto = require('crypto').webcrypto;
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const WA_API_SECRET = process.env.WA_API_SECRET || '';
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!SUPABASE_DB_URL) {
    console.error('CRITICAL ERROR: SUPABASE_DB_URL or DATABASE_URL environment variable is missing.');
    process.exit(1);
}

const dbPool = new Pool({
    connectionString: SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

let sock = null;
let qrCodeImage = null;
let connectionStatus = 'DISCONNECTED';

async function ensureSessionTable() {
    try {
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_session (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } catch (e) {
        console.error('Error ensuring whatsapp_session table:', e.message);
    }
}

/**
 * High-Performance Supabase PostgreSQL Auth State Provider for Baileys
 * 
 * Uses in-memory cache + parallel DB writes to prevent the QR scan
 * from hanging for minutes due to sequential network round-trips.
 */
async function useSupabaseAuthState() {
    await ensureSessionTable();
    const { initAuthCreds, BufferJSON } = await import('@whiskeysockets/baileys');

    // ── In-memory key cache ──────────────────────────────────────────
    // All keys are held in RAM for instant reads. DB writes happen
    // in parallel in the background so Baileys never blocks.
    const keyCache = new Map();

    // Pre-load ALL existing keys into memory cache on startup
    try {
        const res = await dbPool.query('SELECT key, value FROM whatsapp_session');
        for (const row of res.rows) {
            try {
                keyCache.set(row.key, JSON.parse(row.value, BufferJSON.reviver));
            } catch (e) {
                // Skip corrupt entries
            }
        }
        console.log(`📦 Loaded ${keyCache.size} session keys into memory cache.`);
    } catch (e) {
        console.warn('Could not pre-load session keys:', e.message);
    }

    // ── DB helper: write one key ────────────────────────────────────
    const dbWrite = async (key, valStr) => {
        try {
            await dbPool.query(
                `INSERT INTO whatsapp_session (key, value, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
                [key, valStr]
            );
        } catch (e) {
            // Fallback for tables without updated_at column
            try {
                await dbPool.query(
                    `INSERT INTO whatsapp_session (key, value)
                     VALUES ($1, $2)
                     ON CONFLICT (key) DO UPDATE SET value = $2`,
                    [key, valStr]
                );
            } catch (e2) {
                console.error(`DB write error for ${key}:`, e2.message);
            }
        }
    };

    const dbDelete = async (key) => {
        try {
            await dbPool.query('DELETE FROM whatsapp_session WHERE key = $1', [key]);
        } catch (e) {
            console.error(`DB delete error for ${key}:`, e.message);
        }
    };

    // ── Credentials ──────────────────────────────────────────────────
    const credsData = keyCache.get('creds:main');
    // Only reuse creds if device is fully registered; otherwise start fresh
    const creds = (credsData && credsData.registered) ? credsData : initAuthCreds();

    // If starting fresh, wipe stale pre-keys/sessions that would corrupt pairing
    if (!credsData || !credsData.registered) {
        console.log('🔑 Fresh pairing — clearing stale session keys from DB...');
        try {
            await dbPool.query("DELETE FROM whatsapp_session WHERE key NOT LIKE 'setting:%'");
            keyCache.clear();
        } catch (e) {
            console.warn('Could not clear stale keys:', e.message);
        }
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    const baileys = await import('@whiskeysockets/baileys');
                    for (const id of ids) {
                        const cacheKey = `${type}:${id}`;
                        let value = keyCache.get(cacheKey) || null;
                        if (type === 'app-state-sync-key' && value) {
                            value = baileys.proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }
                    return data;
                },
                set: async (data) => {
                    // Collect all write/delete operations and run them in parallel
                    const ops = [];
                    for (const category of Object.keys(data)) {
                        for (const id of Object.keys(data[category])) {
                            const cacheKey = `${category}:${id}`;
                            const value = data[category][id];
                            if (value) {
                                // Update memory cache instantly
                                keyCache.set(cacheKey, value);
                                // Queue parallel DB write
                                const valStr = JSON.stringify(value, BufferJSON.replacer);
                                ops.push(dbWrite(cacheKey, valStr));
                            } else {
                                // Remove from memory cache instantly
                                keyCache.delete(cacheKey);
                                // Queue parallel DB delete
                                ops.push(dbDelete(cacheKey));
                            }
                        }
                    }
                    // Fire all DB operations in parallel — don't block Baileys
                    if (ops.length > 0) {
                        await Promise.all(ops);
                    }
                }
            }
        },
        saveCreds: async () => {
            const cacheKey = 'creds:main';
            keyCache.set(cacheKey, creds);
            const valStr = JSON.stringify(creds, BufferJSON.replacer);
            await dbWrite(cacheKey, valStr);
        }
    };
}

/**
 * Initialize Baileys WhatsApp Socket Connection
 */
async function initWhatsApp() {
    try {
        console.log('Initializing KheloPatna Standalone Baileys WhatsApp Microservice...');
        connectionStatus = 'CONNECTING';

        const { state, saveCreds } = await useSupabaseAuthState();
        const baileys = await import('@whiskeysockets/baileys');
        const makeWASocket = baileys.default?.default || baileys.default || baileys.makeWASocket;
        const DisconnectReason = baileys.DisconnectReason || baileys.default?.DisconnectReason;
        const Browsers = baileys.Browsers || baileys.default?.Browsers;

        const { version, isLatest } = await baileys.fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1017531287], isLatest: false }));
        console.log(`Using WhatsApp Web Version: ${Array.isArray(version) ? version.join('.') : version} (isLatest: ${isLatest})`);

        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: (Browsers && Browsers.macOS) ? Browsers.macOS('Desktop') : ['Mac OS', 'Chrome', '14.4.1'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            shouldSyncHistory: () => false,
            fireInitQueries: true,
            getMessage: async () => ({ conversation: '' })
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    qrCodeImage = await qrcode.toDataURL(qr);
                    connectionStatus = 'DISCONNECTED';
                    console.log('📱 New WhatsApp QR Code generated for scanning.');
                } catch (e) {
                    console.error('Failed to render QR Code:', e);
                }
            }

            if (connection === 'open') {
                connectionStatus = 'CONNECTED';
                qrCodeImage = null;
                console.log('✅ WhatsApp Baileys socket connected successfully!');
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason?.loggedOut || statusCode === 401 || statusCode === 403;

                console.warn(`Connection closed. StatusCode: ${statusCode}. LoggedOut: ${isLoggedOut}`);
                connectionStatus = 'DISCONNECTED';

                if (isLoggedOut) {
                    console.log(`StatusCode ${statusCode} detected (Logged Out). Wiping session for fresh QR...`);
                    try {
                        await dbPool.query("DELETE FROM whatsapp_session WHERE key NOT LIKE 'setting:%'");
                    } catch (e) {
                        console.error('Error wiping session from database:', e);
                    }
                    qrCodeImage = null;
                }

                setTimeout(initWhatsApp, 4000);
            }
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (err) {
        console.error('Error in WhatsApp initialization:', err);
        connectionStatus = 'DISCONNECTED';
        setTimeout(initWhatsApp, 10000);
    }
}

// Middleware to authenticate microservice API requests
function authSecret(req, res, next) {
    if (!WA_API_SECRET) return next();
    const providedSecret = req.headers['x-wa-secret'] || req.body.secret || req.query.secret;
    if (providedSecret !== WA_API_SECRET) {
        return res.status(403).json({ error: 'Unauthorized secret header' });
    }
    next();
}

// API Endpoints
app.get('/', (req, res) => {
    res.send('⚽ KheloPatna Baileys WhatsApp Microservice is Running!');
});

app.get('/status', authSecret, (req, res) => {
    res.json({
        status: connectionStatus,
        qr: qrCodeImage
    });
});

app.post('/send-text', authSecret, async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ error: 'phone and message are required' });
    }
    if (connectionStatus !== 'CONNECTED' || !sock) {
        return res.status(503).json({ error: `Client not connected (Status: ${connectionStatus})` });
    }

    try {
        let jid;
        if (String(phone).includes('@')) {
            jid = String(phone).trim();
        } else {
            let cleanPhone = String(phone).replace(/\D/g, '');
            if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

            if (cleanPhone.length >= 11 && cleanPhone.startsWith('19')) {
                jid = `${cleanPhone}@lid`;
            } else {
                jid = `${cleanPhone}@s.whatsapp.net`;
            }
        }

        try {
            await sock.sendMessage(jid, { text: message });
            console.log(`[Baileys Microservice] Sent text to ${jid}`);
            res.json({ success: true, recipient: jid });
        } catch (sendErr) {
            console.warn(`[Baileys Microservice] Direct send to ${jid} failed (${sendErr.message}). Attempting fallback routing...`);
            if (jid.endsWith('@lid')) {
                const rawDigits = jid.split('@')[0].replace(/\D/g, '');
                if (rawDigits.length >= 10) {
                    let formatted = rawDigits.length === 10 ? '91' + rawDigits : rawDigits;
                    const fallbackJid = `${formatted}@s.whatsapp.net`;
                    await sock.sendMessage(fallbackJid, { text: message });
                    console.log(`[Baileys Microservice] Sent text via fallback to ${fallbackJid}`);
                    return res.json({ success: true, recipient: fallbackJid, fallbackUsed: true });
                }
            }
            throw sendErr;
        }
    } catch (err) {
        console.error('Error sending message:', err.message || err);
        res.status(500).json({ error: err.message || 'Failed to send WhatsApp message' });
    }
});

app.post('/disconnect', authSecret, async (req, res) => {
    try {
        console.log('Resetting WhatsApp session credentials...');
        await dbPool.query("DELETE FROM whatsapp_session WHERE key NOT LIKE 'setting:%'");
        if (sock) {
            try { sock.end(); } catch (e) {}
        }
        initWhatsApp();
        res.json({ success: true, message: 'Session reset initiated. Scan QR code to re-pair.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 KheloPatna Baileys WhatsApp Microservice running on port ${PORT}`);
    initWhatsApp();
});
