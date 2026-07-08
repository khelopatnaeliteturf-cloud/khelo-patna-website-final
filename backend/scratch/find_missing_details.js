const axios = require('axios');
const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const pg = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });
    await pg.connect();

    const SYNC_FROM = '2025-07-01';
    const SYNC_TO = '2026-07-08';
    const startDate = new Date(SYNC_FROM);
    const endDate   = new Date(SYNC_TO);
    endDate.setDate(endDate.getDate() + 1);

    let cursor = new Date(startDate);
    const apiBookings = new Map();

    while (cursor < endDate) {
        const next = new Date(cursor);
        next.setDate(next.getDate() + 7);

        const dateFrom = cursor.toISOString().split('T')[0];
        const dateTo   = (next > endDate ? endDate : next).toISOString().split('T')[0];

        try {
            const response = await axios.get(
                `https://admin.khelopatna.in/admin_api.php?action=search_bookings&search=&date_from=${dateFrom}&date_to=${dateTo}`,
                { timeout: 15000 }
            );
            const legacyBookings = response.data?.bookings || [];
            for (const legacy of legacyBookings) {
                apiBookings.set(`LEGACY_${legacy.id}`, legacy);
            }
        } catch (err) {
            console.error(`Failed interval ${dateFrom}→${dateTo}: ${err.message}`);
        }
        cursor = next;
    }

    console.log(`Fetched ${apiBookings.size} unique bookings from legacy API.`);

    // Get all order_ids from Supabase
    const dbRes = await pg.query("SELECT order_id FROM bookings");
    const dbOrderIds = new Set(dbRes.rows.map(r => r.order_id));

    console.log(`Found ${dbOrderIds.size} bookings in database.`);

    const missing = [];
    for (const [orderId, legacy] of apiBookings.entries()) {
        if (!dbOrderIds.has(orderId)) {
            missing.push(legacy);
        }
    }

    console.log(`Missing from database: ${missing.length}`);
    for (const m of missing) {
        console.log(`ID: ${m.id}, Date: ${m.booking_date}, Name: ${m.full_name}, Time: ${m.start_time}-${m.end_time}, Status: ${m.booking_status}`);
        
        // Try inserting it individually to see if PostgreSQL rejects it and why!
        // We will mimic the insert query from sync_legacy_bookings.js
        try {
            // First we need tenant and branch
            const tenantRes = await pg.query("SELECT id FROM tenants WHERE subdomain = 'khelopatna' LIMIT 1");
            const tenantId = tenantRes.rows[0].id;
            const branchRes = await pg.query("SELECT id FROM branches WHERE tenant_id = $1 LIMIT 1", [tenantId]);
            const branchId = branchRes.rows[0].id;

            function pad(n) { return String(n).padStart(2, '0'); }
            function buildTimeSlots(startStr, endStr) {
                let s = parseInt((startStr || '00:00').split(':')[0], 10);
                let e = parseInt((endStr   || '00:00').split(':')[0], 10);
                if (e === 0) e = 24;
                if (s > e)   e += 24;
                const slots = [];
                for (let h = s; h < e; h++) {
                    slots.push(`${pad(h % 24)}-${pad((h + 1) % 24)}`);
                }
                return slots;
            }
            function normaliseMethod(raw) {
                const m = (raw || '').toLowerCase();
                if (m.includes('cashfree')) return 'cashfree';
                if (m.includes('upi') || m.includes('gpay')) return 'upi';
                if (m.includes('card')) return 'card';
                return 'upi';
            }

            const orderId = `LEGACY_${m.id}`;
            const phone = String(m.phone || '0000000000').replace(/\D/g, '').slice(-10);
            const email = m.email || `${phone}@khelopatna.in`;
            const timeSlots = buildTimeSlots(m.start_time, m.end_time);
            const sport = (m.sport || '').toLowerCase() === 'cricket' ? 'cricket' : 'football';
            const paymentStatus = (m.booking_status || '').toLowerCase() === 'cancelled' ? 'FAILED' : 'SUCCESS';

            await pg.query(
                `INSERT INTO bookings
                    (tenant_id, branch_id, customer_name, customer_email, customer_phone,
                     date, time_slots, total_amount, paid_amount, payment_status,
                     payment_method, discount, order_id, transaction_id, sport,
                     participants_count, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
                [
                    tenantId,
                    branchId,
                    m.full_name || 'Anonymous',
                    email,
                    phone,
                    m.booking_date,
                    timeSlots,
                    parseFloat(m.total_amount) || 0,
                    parseFloat(m.paid_amount) || 0,
                    paymentStatus,
                    normaliseMethod(m.payment_method),
                    0,
                    orderId,
                    m.transaction_id || null,
                    sport,
                    1,
                    m.created_at ? new Date(m.created_at) : new Date()
                ]
            );
            console.log(`Successfully inserted missing legacy booking: ${orderId}`);
        } catch (err) {
            console.error(`FAILED to insert missing booking ${m.id}:`, err.message);
        }
    }

    await pg.end();
}

run();
