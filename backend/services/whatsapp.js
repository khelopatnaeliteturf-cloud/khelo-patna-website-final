const dns = require('dns');
const axios = require('axios');
const Tenant = require('../models/Tenant');
const CommunicationLog = require('../models/CommunicationLog');

async function logWhatsApp({ to, content, status, errorMessage, bookedBy, recipientName }) {
    try {
        const tenant = await Tenant.findOne({ subdomain: 'khelopatna' });
        const tenantId = tenant ? tenant._id : null;
        try {
            await new CommunicationLog({
                tenantId,
                type: 'WHATSAPP',
                recipient: to,
                recipientName,
                bookedBy,
                content,
                status,
                errorMessage
            }).save();
        } catch (saveErr) {
            // Fallback for pre-existing tables missing bookedBy column
            await new CommunicationLog({
                tenantId,
                type: 'WHATSAPP',
                recipient: to,
                recipientName,
                content,
                status,
                errorMessage
            }).save();
        }
    } catch (err) {
        console.error('Error logging WhatsApp communication:', err.message || err);
    }
}
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

let makeWASocket, DisconnectReason;
const qrcode = require('qrcode');
const pino = require('pino');
const { Pool } = require('pg');

let sock = null;
let qrCodeImage = null;
let connectionStatus = 'DISCONNECTED'; // DISCONNECTED, CONNECTING, CONNECTED, DISABLED
let botEnabled = true; // Toggle for the WhatsApp Booking Bot

// Retry configuration
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 5000; // 5 seconds, doubles each attempt
let retryCount = 0;

// Callback to register message upsert bot listener
let onMessageCallback = null;

// Database connection pool for session storage
let pool = null;
function getPgPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.SUPABASE_DB_URL,
            ssl: { rejectUnauthorized: false }
        });
    }
    return pool;
}

/**
 * Custom auth state provider storing Baileys session in Supabase PostgreSQL
 */
async function useSupabaseAuthState(dbPool) {
    const { initAuthCreds, BufferJSON } = await import('@whiskeysockets/baileys');

    // Ensure session table exists
    await dbPool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_session (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        ALTER TABLE whatsapp_session ENABLE ROW LEVEL SECURITY;
    `);

    const readData = async (key) => {
        try {
            const res = await dbPool.query('SELECT value FROM whatsapp_session WHERE key = $1', [key]);
            if (res.rows.length > 0) {
                return JSON.parse(res.rows[0].value, BufferJSON.reviver);
            }
        } catch (err) {
            console.error(`Error reading key ${key} from Supabase WhatsApp session:`, err);
        }
        return null;
    };

    const writeData = async (key, data) => {
        try {
            const valueStr = JSON.stringify(data, BufferJSON.replacer);
            await dbPool.query(`
                INSERT INTO whatsapp_session (key, value)
                VALUES ($1, $2)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            `, [key, valueStr]);
        } catch (err) {
            console.error(`Error writing key ${key} to Supabase WhatsApp session:`, err);
        }
    };

    const removeData = async (key) => {
        try {
            await dbPool.query('DELETE FROM whatsapp_session WHERE key = $1', [key]);
        } catch (err) {
            console.error(`Error deleting key ${key} from Supabase WhatsApp session:`, err);
        }
    };

    let creds = await readData('creds:main') || await readData('creds');
    if (!creds || !creds.registered) {
        creds = initAuthCreds();
        await writeData('creds:main', creds);
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        let value = await readData(`${type}:${id}`) || await readData(`${type}-${id}`);
                        if (value) {
                            if (type === 'app-state-sync-key') {
                                const baileys = await import('@whiskeysockets/baileys');
                                value = baileys.proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        }
                    }
                    return data;
                },
                set: async (data) => {
                    for (const type in data) {
                        for (const id in data[type]) {
                            const value = data[type][id];
                            const fileKey = `${type}:${id}`;
                            if (value) {
                                await writeData(fileKey, value);
                            } else {
                                await removeData(fileKey);
                            }
                        }
                    }
                }
            }
        },
        saveCreds: async () => {
            await writeData('creds:main', creds);
        }
    };
}

/**
 * Check if WhatsApp is enabled via environment variable.
 * Set WHATSAPP_ENABLED=false in .env to skip WhatsApp entirely.
 */
function isWhatsAppEnabled() {
    const flag = process.env.WHATSAPP_ENABLED;
    if (flag && ['false', '0', 'no'].includes(flag.toLowerCase())) {
        return false;
    }
    return true;
}

let pollInterval = null;
let lastPollError = null;
let lastPollTime = null;
let lastReconnectTime = null;
let lastReconnectResult = null;

function startServicePolling() {
    if (pollInterval) clearInterval(pollInterval);

    const poll = async () => {
        lastPollTime = new Date().toISOString();
        try {
            const rawUrl = (process.env.WA_SERVICE_URL || '').trim();
            if (!rawUrl) return;
            const baseUrl = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) ? rawUrl : `https://${rawUrl}`;
            const url = `${baseUrl.replace(/\/+$/, '')}/status`;

            const response = await axios.get(url, {
                headers: { 'X-WA-Secret': process.env.WA_API_SECRET || '' },
                timeout: 5000
            });
            
            const isConnected = response.data.status === 'CONNECTED' || response.data.connected === true;
            connectionStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED';
            qrCodeImage = response.data.qr || null;
            botEnabled = response.data.bot_enabled !== undefined ? response.data.bot_enabled : botEnabled;
            lastPollError = null; // Clear on success
        } catch (err) {
            const errorMsg = err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : err.message;
            console.error('[WhatsApp Service] Polling status error:', errorMsg);
            connectionStatus = 'DISCONNECTED';
            qrCodeImage = null;
            lastPollError = errorMsg;
        }
    };

    poll(); // Run immediately
    pollInterval = setInterval(poll, 10000); // Repeat every 10 seconds
}

function getDiagnostics() {
    return {
        remote_mode: !!process.env.WA_SERVICE_URL,
        service_url: process.env.WA_SERVICE_URL || null,
        has_secret: !!process.env.WA_API_SECRET,
        last_poll_time: lastPollTime,
        last_poll_error: lastPollError,
        last_reconnect_time: lastReconnectTime,
        last_reconnect_result: lastReconnectResult
    };
}

async function initWhatsApp() {
    // If microservice URL is configured, run background status polling instead of local socket
    if (process.env.WA_SERVICE_URL) {
        console.log(`🔌 WhatsApp: External microservice configured at ${process.env.WA_SERVICE_URL}. Running in remote mode.`);
        startServicePolling();
        return;
    }

    // Skip entirely if WhatsApp is disabled
    if (!isWhatsAppEnabled()) {
        connectionStatus = 'DISABLED';
        console.log('⚠️  WhatsApp is DISABLED (WHATSAPP_ENABLED=false). Server will run without WhatsApp.');
        return;
    }

    // Enforce max retry limit
    if (retryCount >= MAX_RETRIES) {
        connectionStatus = 'DISCONNECTED';
        console.warn(`⚠️  WhatsApp: Max retries (${MAX_RETRIES}) exceeded. Giving up on WhatsApp connection.`);
        console.warn('   The server will continue running without WhatsApp.');
        console.warn('   To retry, restart the server or call the /api/admin/whatsapp/reconnect endpoint.');
        return;
    }

    retryCount++;
    const attemptLabel = `[Attempt ${retryCount}/${MAX_RETRIES}]`;
    console.log(`${attemptLabel} Initializing WhatsApp Connection...`);
    connectionStatus = 'CONNECTING';

    try {
        const baileys = await import('@whiskeysockets/baileys');
        makeWASocket = baileys.default?.default || baileys.default || baileys.makeWASocket;
        DisconnectReason = baileys.DisconnectReason || baileys.default?.DisconnectReason;
        const Browsers = baileys.Browsers || baileys.default?.Browsers;

        const { version, isLatest } = await baileys.fetchLatestBaileysVersion().catch(() => ({
            version: [2, 3000, 1017531287],
            isLatest: false
        }));
        console.log(`[WhatsApp] Using Baileys WA Web Version: ${version.join('.')} (isLatest: ${isLatest})`);

        const dbPool = getPgPool();
        const { state, saveCreds } = await useSupabaseAuthState(dbPool);

        // Optional proxy support to bypass Render/cloud datacenter IP blocks
        let agent;
        if (process.env.PROXY_URL) {
            const proxyUrl = process.env.PROXY_URL;
            console.log(`[WhatsApp] Routing traffic through proxy: ${proxyUrl}`);
            try {
                if (proxyUrl.startsWith('socks')) {
                    const { SocksProxyAgent } = require('socks-proxy-agent');
                    agent = new SocksProxyAgent(proxyUrl);
                } else {
                    const { HttpsProxyAgent } = require('https-proxy-agent');
                    agent = new HttpsProxyAgent(proxyUrl);
                }
            } catch (err) {
                console.error('[WhatsApp] Failed to initialize proxy agent:', err.message);
            }
        }

        sock = makeWASocket({
            version,
            browser: (Browsers && Browsers.macOS) ? Browsers.macOS('Chrome') : ['Mac OS', 'Chrome', '14.4.1'],
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }), // Suppress detailed logs
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            agent: agent,
            fetchAgent: agent
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    // Convert QR string to Base64 Image Data URL for dashboard display
                    qrCodeImage = await qrcode.toDataURL(qr);
                    connectionStatus = 'DISCONNECTED'; // QR code means we aren't logged in yet
                    console.log('New WhatsApp QR Code generated.');
                } catch (err) {
                    console.error('Error generating QR image:', err);
                }
            }

            if (connection === 'open') {
                connectionStatus = 'CONNECTED';
                qrCodeImage = null; // Connected! Clear QR
                retryCount = 0; // Reset retries on successful connection
                console.log('✅ WhatsApp connection successfully established!');
            }

            if (connection === 'close') {
                connectionStatus = 'DISCONNECTED';
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403;
                const shouldReconnect = !isLoggedOut;
                const reason = lastDisconnect?.error?.message || 'Unknown';
                console.log(`WhatsApp connection closed. Reason: ${reason}. Full Error:`, lastDisconnect?.error);

                if (shouldReconnect) {
                    if (retryCount >= MAX_RETRIES) {
                        console.warn(`⚠️  WhatsApp: Max retries (${MAX_RETRIES}) reached. Stopping reconnection attempts.`);
                        console.warn('   Server continues running without WhatsApp.');
                        return;
                    }
                    // Exponential backoff: 5s, 10s, 20s, 40s, 80s
                    const delay = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
                    console.log(`   Retrying in ${delay / 1000}s...`);
                    setTimeout(initWhatsApp, delay);
                } else {
                    // Logged out: clean session from DB and reset
                    console.log('Logged out from WhatsApp. Resetting session credentials...');
                    try {
                        await dbPool.query("DELETE FROM whatsapp_session WHERE key NOT LIKE 'setting:%'");
                    } catch (e) {
                        console.error('Error cleaning session from Supabase:', e);
                    }
                    qrCodeImage = null;
                    retryCount = 0; // Reset retries after logout cleanup
                    setTimeout(initWhatsApp, 2000);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // Listen for incoming messages (WhatsApp Auto-Booking Bot)
        sock.ev.on('messages.upsert', async (m) => {
            if (!botEnabled || !onMessageCallback) return;
            
            // Only process new messages
            if (m.type !== 'notify') return;

            for (const message of m.messages) {
                const jid = message.key.remoteJid || '';
                const msg = message.message?.ephemeralMessage?.message || message.message?.viewOnceMessage?.message || message.message;
                const text = (msg?.conversation || msg?.extendedTextMessage?.text || msg?.imageMessage?.caption || '').trim();

                // Ignore outgoing messages sent by the bot itself, unless it's a staff dot override command (. / .. / ...)
                if (message.key.fromMe && text !== '.' && text !== '..' && text !== '...') {
                    continue;
                }
                
                // Strict Group Filter: Never respond to group chats (@g.us), status broadcasts, or group participant messages
                if (!jid || jid.endsWith('@g.us') || jid.includes('@g.us') || jid.includes('-') || jid === 'status@broadcast' || message.key.participant) {
                    continue;
                }
                
                // Trigger bot callback
                try {
                    await onMessageCallback(sock, message);
                } catch (err) {
                    console.error('Error processing bot message:', err);
                }
            }
        });

    } catch (err) {
        console.error(`Fatal error during WhatsApp initialization: ${err.message}`);
        connectionStatus = 'DISCONNECTED';

        if (retryCount >= MAX_RETRIES) {
            console.warn(`⚠️  WhatsApp: Max retries (${MAX_RETRIES}) reached after fatal error. Server continues without WhatsApp.`);
            return;
        }

        const delay = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
        console.log(`   Retrying in ${delay / 1000}s...`);
        setTimeout(initWhatsApp, delay);
    }
}

/**
 * Force a reconnection attempt (resets retry counter).
 * Useful for the admin dashboard "Reconnect" button.
 */
function forceReconnect() {
    if (process.env.WA_SERVICE_URL) {
        lastReconnectTime = new Date().toISOString();
        console.log('[WhatsApp Service] Triggering remote disconnect/reconnect via microservice...');
        const url = `${process.env.WA_SERVICE_URL.replace(/\/+$/, '')}/disconnect`;
        axios.post(url, { confirm: true }, {
            headers: { 'X-WA-Secret': process.env.WA_API_SECRET || '' },
            timeout: 5000
        }).then(() => {
            console.log('[WhatsApp Service] Reconnection command received by microservice.');
            lastReconnectResult = 'SUCCESS';
            // Force status polling to run immediately
            startServicePolling();
        }).catch(err => {
            const errorMsg = err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : err.message;
            console.error('[WhatsApp Service] Failed to trigger remote reconnect:', errorMsg);
            lastReconnectResult = `FAILED: ${errorMsg}`;
        });
        return;
    }

    retryCount = 0;
    initWhatsApp();
}

/**
 * Sanitizes phone number and sends a text message.
 * @param {string} toPhone - Recipient phone number (e.g. "9709701400", "+919709701400")
 * @param {string} text - Message body
 */
async function sendWhatsAppMessage(toPhone, text) {
    let success = false;
    let errMessage = null;

    if (process.env.WA_SERVICE_URL) {
        try {
            // Preserve raw JID (e.g. 197753057391@lid or 917366963737@s.whatsapp.net) for exact Baileys routing
            let targetPhone = String(toPhone).trim();
            if (!targetPhone.includes('@')) {
                let clean = targetPhone.replace(/\D/g, '');
                if (clean.length === 10) clean = '91' + clean;
                targetPhone = clean;
            }

            console.log(`[WhatsApp Service] Sending message to ${targetPhone} via microservice...`);
            const url = `${process.env.WA_SERVICE_URL.replace(/\/+$/, '')}/send-text`;
            const response = await axios.post(url, {
                phone: targetPhone,
                message: text
            }, {
                headers: { 'X-WA-Secret': process.env.WA_API_SECRET || '' },
                timeout: 10000
            });
            
            success = response.data.success === true;
            if (!success) {
                errMessage = 'Microservice returned success=false';
            }
        } catch (err) {
            const remoteErr = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            console.error(`[WhatsApp Service] Failed to send message via microservice to ${toPhone}:`, remoteErr);
            errMessage = remoteErr;
        }
    } else {
        if (connectionStatus !== 'CONNECTED' || !sock) {
            console.warn(`WhatsApp message not sent to ${toPhone}. Client status: ${connectionStatus}`);
            errMessage = `Client not connected (Status: ${connectionStatus})`;
        } else {
            try {
                // Support full JIDs (@lid or @s.whatsapp.net) and raw 10-digit Indian numbers
                let jid = toPhone.trim();
                if (!jid.includes('@')) {
                    let cleanPhone = toPhone.replace(/\D/g, '');
                    if (cleanPhone.length === 10) {
                        cleanPhone = '91' + cleanPhone;
                    }
                    jid = `${cleanPhone}@s.whatsapp.net`;
                }

                await sock.sendMessage(jid, { text: text });
                console.log(`WhatsApp message successfully sent to JID ${jid}`);
                success = true;
            } catch (err) {
                console.error(`Failed to send WhatsApp message to ${toPhone}:`, err);
                errMessage = err.message || 'WhatsApp Socket Error';
            }
        }
    }

    // Log the result in the database asynchronously
    logWhatsApp({
        to: toPhone,
        content: text,
        status: success ? 'SENT' : 'FAILED',
        errorMessage: success ? null : errMessage
    }).catch(err => console.error('Error calling logWhatsApp:', err));

    return success;
}

// Getters and setters
const getQR = () => qrCodeImage;
const getStatus = () => connectionStatus;
const setBotEnabled = (enabled) => { 
    botEnabled = Boolean(enabled); 
    if (process.env.WA_SERVICE_URL) {
        const axios = require('axios');
        const url = `${process.env.WA_SERVICE_URL.replace(/\/+$/, '')}/toggle-bot`;
        axios.post(url, { enabled: botEnabled }, {
            headers: { 'X-WA-Secret': process.env.WA_API_SECRET || '' },
            timeout: 5000
        }).catch(err => console.warn('Microservice bot toggle sync warning:', err.message));
    }
};
const getBotEnabled = () => botEnabled;
const registerBotListener = (callback) => { onMessageCallback = callback; };

async function getRawRemoteStatus() {
    if (!process.env.WA_SERVICE_URL) return { error: 'Not in remote mode' };
    try {
        const axios = require('axios');
        const url = `${process.env.WA_SERVICE_URL.replace(/\/+$/, '')}/status`;
        const response = await axios.get(url, {
            headers: { 'X-WA-Secret': process.env.WA_API_SECRET || '' },
            timeout: 5000
        });
        return response.data;
    } catch (err) {
        return {
            error: err.message,
            status: err.response ? err.response.status : null,
            data: err.response ? err.response.data : null
        };
    }
}

module.exports = {
    initWhatsApp,
    forceReconnect,
    sendWhatsAppMessage,
    getQR,
    getStatus,
    setBotEnabled,
    getBotEnabled,
    registerBotListener,
    getDiagnostics,
    getRawRemoteStatus
};
