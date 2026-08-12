'use strict';
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

let VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
let VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:service@khelopatna.in';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    const keys = webpush.generateVAPIDKeys();
    VAPID_PUBLIC_KEY = VAPID_PUBLIC_KEY || keys.publicKey;
    VAPID_PRIVATE_KEY = VAPID_PRIVATE_KEY || keys.privateKey;
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Auto-create push_subscriptions table if missing in PostgreSQL/Supabase
async function ensurePushTable() {
    try {
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.SUPABASE_DB_URL,
            ssl: { rejectUnauthorized: false }
        });
        await pool.query(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                endpoint TEXT NOT NULL UNIQUE,
                subscription JSONB NOT NULL,
                user_agent TEXT,
                user_role TEXT DEFAULT 'ADMIN',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await pool.end();
    } catch (e) {
        console.warn('[WebPush] Could not auto-create push_subscriptions table:', e.message);
    }
}
ensurePushTable();

function getVapidPublicKey() {
    return VAPID_PUBLIC_KEY;
}

// Save or update subscription endpoint token
async function saveSubscription(subscription, userAgent = '', userRole = 'ADMIN') {
    if (!subscription || !subscription.endpoint) return null;
    const existing = await PushSubscription.findOne({ endpoint: subscription.endpoint });
    if (existing) {
        existing.subscription = subscription;
        existing.userAgent = userAgent;
        existing.userRole = userRole;
        existing.updatedAt = new Date();
        await existing.save();
        return existing;
    } else {
        const newSub = new PushSubscription({
            endpoint: subscription.endpoint,
            subscription,
            userAgent,
            userRole,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        await newSub.save();
        return newSub;
    }
}

// Format time slots helper
function formatSlotTo12Hr(slot) {
    if (!slot) return '';
    const parts = slot.split('-');
    if (parts.length !== 2) return slot;
    
    const formatHour = (hStr) => {
        let h = parseInt(hStr, 10);
        if (isNaN(h)) return hStr;
        h = h % 24;
        const period = h >= 12 ? 'PM' : 'AM';
        let h12 = h % 12;
        if (h12 === 0) h12 = 12;
        const padHour = String(h12).padStart(2, '0');
        return `${padHour}:00 ${period}`;
    };
    
    return `${formatHour(parts[0])} - ${formatHour(parts[1])}`;
}

// Send live booking push notification to all admin phone subscribers
async function sendLiveBookingPushNotification(booking) {
    try {
        const subscriptions = await PushSubscription.find({});
        if (!subscriptions || subscriptions.length === 0) {
            console.log('[WebPush] No active push subscriptions registered.');
            return;
        }

        const formattedTiming = (booking.timeSlots || []).map(formatSlotTo12Hr).join(', ');
        const sportUpper = booking.sport ? booking.sport.toUpperCase() : 'TURF';
        const advancePaid = Number(booking.paidAmount || 0);

        const payload = JSON.stringify({
            title: `🚨 NEW BOOKING: ${booking.customerName}`,
            body: `🏟️ ${sportUpper} | 📅 ${booking.date}\n⏰ ${formattedTiming}\n💰 Paid: ₹${advancePaid} (${booking.customerPhone || 'Online'})`,
            icon: '/icon.png',
            badge: '/icon.png',
            tag: `booking-${booking.orderId || Date.now()}`,
            data: {
                url: '/admin',
                bookingId: booking._id,
                orderId: booking.orderId
            }
        });

        console.log(`[WebPush] Dispatching live booking notification to ${subscriptions.length} device(s)...`);

        const pushPromises = subscriptions.map(async (subRecord) => {
            try {
                const subObj = subRecord.subscription || subRecord;
                await webpush.sendNotification(subObj, payload);
            } catch (err) {
                console.error('[WebPush] Notification error for endpoint:', subRecord.endpoint, err.statusCode || err.message);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription expired or invalid -> delete from database
                    await PushSubscription.deleteOne({ _id: subRecord._id });
                }
            }
        });

        const results = await Promise.allSettled(pushPromises);
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        return { success: true, totalSubscriptions: subscriptions.length, successCount };
    } catch (error) {
        console.error('[WebPush] Failed to dispatch push notifications:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    getVapidPublicKey,
    saveSubscription,
    sendLiveBookingPushNotification
};
