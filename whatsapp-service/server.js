const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// Connect to DB (since bot needs DB access to query bookings, sessions and settings)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/khelopatna';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('WhatsApp Service successfully connected to MongoDB.'))
    .catch(err => console.error('MongoDB connection error:', err));

// Initialize WhatsApp client
const { initWhatsApp, forceReconnect, getQR, getStatus, setBotEnabled, getBotEnabled, sendWhatsAppMessage } = require('./services/whatsapp');
// Require botStates to register message handler callback automatically
require('./services/botStates');

initWhatsApp();

// API Routes
// 1. Get Status & QR code
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        status: getStatus(),
        qr: getQR(),
        bot_enabled: getBotEnabled()
    });
});

// 2. Toggle Bot Auto-Booking
app.post('/api/whatsapp/toggle-bot', (req, res) => {
    const { enabled } = req.body;
    setBotEnabled(enabled);
    res.json({ success: true, bot_enabled: getBotEnabled() });
});

// 3. Reconnect client
app.post('/api/whatsapp/reconnect', (req, res) => {
    forceReconnect();
    res.json({ success: true, message: 'WhatsApp reconnection initiated.' });
});

// 4. Send Message (REST API invoked by main backend to trigger confirmation messages)
app.post('/api/whatsapp/send', async (req, res) => {
    const { toPhone, text } = req.body;
    if (!toPhone || !text) {
        return res.status(400).json({ error: 'Missing toPhone or text parameters.' });
    }
    
    const success = await sendWhatsAppMessage(toPhone, text);
    if (success) {
        res.json({ success: true, message: 'Message sent successfully.' });
    } else {
        res.status(500).json({ error: 'Failed to send WhatsApp message. Client status: ' + getStatus() });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`WhatsApp Service successfully listening on port ${PORT}`);
});
