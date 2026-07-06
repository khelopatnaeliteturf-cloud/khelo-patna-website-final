let makeWASocket, useMultiFileAuthState, DisconnectReason;
const qrcode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

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

const SESSION_DIR = path.join(__dirname, '../whatsapp_session');

/**
 * Check if WhatsApp is enabled via environment variable.
 * Set WHATSAPP_ENABLED=false in .env to skip WhatsApp entirely.
 */
function isWhatsAppEnabled() {
    const flag = process.env.WHATSAPP_ENABLED;
    // Disabled if explicitly set to 'false', '0', or 'no'
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
        useMultiFileAuthState = baileys.useMultiFileAuthState;
        DisconnectReason = baileys.DisconnectReason;

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
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
                    // Logged out: clean session folder and reset
                    console.log('Logged out from WhatsApp. Resetting session credentials...');
                    try {
                        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                    } catch (e) {
                        console.error('Error cleaning session directory:', e);
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
