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
        )
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

    let creds = await readData('creds');
    if (!creds) {
        creds = initAuthCreds();
        await writeData('creds', creds);
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        let value = await readData(`${type}-${id}`);
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
                            const fileKey = `${type}-${id}`;
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
            await writeData('creds', creds);
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

async function initWhatsApp() {
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
        makeWASocket = baileys.default;
        DisconnectReason = baileys.DisconnectReason;

        const dbPool = getPgPool();
        const { state, saveCreds } = await useSupabaseAuthState(dbPool);

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }), // Suppress detailed logs
            defaultQueryTimeoutMs: undefined
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
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                const reason = lastDisconnect?.error?.message || 'Unknown';
                console.log(`WhatsApp connection closed. Reason: ${reason}. Will retry: ${shouldReconnect && retryCount < MAX_RETRIES}`);

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
                        await dbPool.query('DELETE FROM whatsapp_session');
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
                // Ignore outgoing messages sent by the bot itself
                if (message.key.fromMe) continue;
                
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
    retryCount = 0;
    initWhatsApp();
}

/**
 * Sanitizes phone number and sends a text message.
 * @param {string} toPhone - Recipient phone number (e.g. "9709701400", "+919709701400")
 * @param {string} text - Message body
 */
async function sendWhatsAppMessage(toPhone, text) {
    if (connectionStatus !== 'CONNECTED' || !sock) {
        console.warn(`WhatsApp message not sent to ${toPhone}. Client status: ${connectionStatus}`);
        return false;
    }

    try {
        // Sanitize phone number: remove non-digits
        let cleanPhone = toPhone.replace(/\D/g, '');
        // If it doesn't start with country code (e.g. starts with 10 digits in India), append country code "91"
        if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
        }

        const jid = `${cleanPhone}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: text });
        console.log(`WhatsApp message successfully sent to ${cleanPhone}`);
        return true;
    } catch (err) {
        console.error(`Failed to send WhatsApp message to ${toPhone}:`, err);
        return false;
    }
}

// Getters and setters
const getQR = () => qrCodeImage;
const getStatus = () => connectionStatus;
const setBotEnabled = (enabled) => { botEnabled = enabled; };
const getBotEnabled = () => botEnabled;
const registerBotListener = (callback) => { onMessageCallback = callback; };

module.exports = {
    initWhatsApp,
    forceReconnect,
    sendWhatsAppMessage,
    getQR,
    getStatus,
    setBotEnabled,
    getBotEnabled,
    registerBotListener
};
