const express = require('express');
const cors = require('cors');
const dns = require('dns');
const axios = require('axios');
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
const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || 'https://api.khelopatna.in';
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
let botEnabled = true;

async function ensureSessionTable() {
    try {
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_session (
                key VARCHAR PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE whatsapp_session ADD COLUMN IF NOT EXISTS key VARCHAR;
            ALTER TABLE whatsapp_session ADD COLUMN IF NOT EXISTS value TEXT;
        `);
    } catch (e) {
        console.error('Error ensuring whatsapp_session table:', e.message);
    }
}

/**
 * Custom Supabase PostgreSQL Auth State Provider for Baileys
 */
async function useSupabaseAuthState() {
    await ensureSessionTable();
    const { initAuthCreds, BufferJSON } = await import('@whiskeysockets/baileys');

    const readData = async (type, id) => {
        const key = `${type}:${id}`;
        try {
            const res = await dbPool.query('SELECT value FROM whatsapp_session WHERE key = $1', [key]);
            if (res.rows.length > 0) {
                return JSON.parse(res.rows[0].value, BufferJSON.reviver);
            }
        } catch (e) {
            console.error(`Error reading session ${key}:`, e.message);
        }
        return null;
    };

    const writeData = async (type, id, value) => {
        const key = `${type}:${id}`;
        try {
            const valStr = JSON.stringify(value, BufferJSON.replacer);
            await dbPool.query(
                `INSERT INTO whatsapp_session (key, value, updated_at) 
                 VALUES ($1, $2, NOW()) 
                 ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
                [key, valStr]
            );
        } catch (e) {
            console.error(`Error writing session ${key}:`, e.message);
        }
    };

    const removeData = async (type, id) => {
        const key = `${type}:${id}`;
        try {
            await dbPool.query('DELETE FROM whatsapp_session WHERE key = $1', [key]);
        } catch (e) {
            console.error(`Error deleting session ${key}:`, e.message);
        }
    };

    const credsData = await readData('creds', 'main');
    const creds = credsData || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        let value = await readData(type, id);
                        if (type === 'app-state-sync-key' && value) {
                            const baileys = await import('@whiskeysockets/baileys');
                            value = baileys.proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }
                    return data;
                },
                set: async (data) => {
                    for (const category of Object.keys(data)) {
                        for (const id of Object.keys(data[category])) {
                            const value = data[category][id];
                            if (value) {
                                await writeData(category, id, value);
                            } else {
                                await removeData(category, id);
                            }
                        }
                    }
                }
            }
        },
        saveCreds: async () => {
            await writeData('creds', 'main', creds);
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
        const makeWASocket = baileys.default;
        const DisconnectReason = baileys.DisconnectReason;
        const Browsers = baileys.Browsers || baileys.default?.Browsers;

        sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: (Browsers && Browsers.ubuntu) ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '110.0.5563.146']
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
                console.log('✅ WhatsApp Baileys socket connected successfully and listening!');
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403 || statusCode === 405 || statusCode === 408;

                console.warn(`Connection closed. StatusCode: ${statusCode}. Session corrupt/loggedOut: ${isLoggedOut}`);
                connectionStatus = 'DISCONNECTED';

                if (isLoggedOut || statusCode === 405) {
                    console.log(`StatusCode ${statusCode} detected. Cleaning stale session credentials from database to issue fresh QR code...`);
                    try {
                        await dbPool.query('DELETE FROM whatsapp_session');
                    } catch (e) {
                        console.error('Error wiping session from database:', e);
                    }
                    qrCodeImage = null;
                }
                
                setTimeout(initWhatsApp, 4000);
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // Listen for incoming messages and forward to main backend webhook
        sock.ev.on('messages.upsert', async (m) => {
            if (!botEnabled || m.type !== 'notify') return;

            for (const message of m.messages) {
                if (message.key.fromMe) continue;

                const phoneJid = message.key.remoteJid;
                if (!phoneJid || phoneJid.endsWith('@g.us') || phoneJid === 'status@broadcast') continue;

                const phone = phoneJid.split('@')[0];
                const msg = message.message?.ephemeralMessage?.message || message.message?.viewOnceMessage?.message || message.message;
                const text = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || '';

                if (!text) continue;

                console.log(`[Baileys Microservice] Incoming chat from ${phone}: "${text}". Forwarding to main site webhook...`);
                try {
                    const targetWebhook = `${MAIN_BACKEND_URL.replace(/\/+$/, '')}/api/reports/whatsapp/webhook`;
                    await axios.post(targetWebhook, {
                        phone,
                        text,
                        secret: WA_API_SECRET
                    }, {
                        headers: { 'X-WA-Secret': WA_API_SECRET },
                        timeout: 10000
                    });
                } catch (err) {
                    console.error('Error forwarding incoming chat webhook:', err.message);
                }
            }
        });

    } catch (err) {
        console.error('Fatal Baileys Error:', err.message);
        connectionStatus = 'DISCONNECTED';
        setTimeout(initWhatsApp, 10000);
    }
}

// Middleware: Verify secret header for endpoint security
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
        qr: qrCodeImage,
        bot_enabled: botEnabled
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
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
        const jid = `${cleanPhone}@s.whatsapp.net`;

        await sock.sendMessage(jid, { text: message });
        console.log(`[Baileys Microservice] Sent text to ${cleanPhone}`);
        res.json({ success: true, recipient: cleanPhone });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: err.message || 'Failed to send WhatsApp message' });
    }
});

app.post('/disconnect', authSecret, async (req, res) => {
    try {
        console.log('Resetting WhatsApp session credentials...');
        await dbPool.query('DELETE FROM whatsapp_session');
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
