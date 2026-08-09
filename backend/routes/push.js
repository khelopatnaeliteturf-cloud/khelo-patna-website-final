'use strict';
const express = require('express');
const router = express.Router();
const { getVapidPublicKey, saveSubscription, sendLiveBookingPushNotification } = require('../services/pushNotifications');

// GET /api/push/public-key — fetch VAPID public key
router.get('/push/public-key', (req, res) => {
    try {
        const publicKey = getVapidPublicKey();
        res.json({ success: true, publicKey });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/push/subscribe — register device push subscription token
router.post('/push/subscribe', async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ success: false, message: 'Invalid subscription object.' });
        }
        const userAgent = req.headers['user-agent'] || '';
        const saved = await saveSubscription(subscription, userAgent, 'ADMIN');
        res.json({ success: true, message: 'Push notification subscription registered successfully!', subscriptionId: saved._id });
    } catch (err) {
        console.error('Push subscribe error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/push/test — send test push notification
router.post('/push/test', async (req, res) => {
    try {
        const result = await sendLiveBookingPushNotification({
            customerName: 'Test Booking',
            customerPhone: '9709701400',
            sport: 'cricket',
            date: 'Today',
            timeSlots: ['18:00-19:00'],
            paidAmount: 1200,
            orderId: 'TEST_' + Date.now()
        });
        res.json({ success: true, message: 'Test push notification dispatched!', result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
