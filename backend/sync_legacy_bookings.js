#!/usr/bin/env node
/**
 * sync_legacy_bookings.js
 * ─────────────────────────────────────────────────────────────────────────
 * Fetches booking data from the legacy PHP API at admin.khelopatna.in and
 * pushes it directly into Supabase PostgreSQL — no MongoDB required.
 *
 * Usage:
 *   node sync_legacy_bookings.js
 *
 * Required env var (already in .env):
 *   SUPABASE_DB_URL=postgresql://...
 *
 * Options (env vars):
 *   SYNC_FROM=2025-07-01   (default: 2025-07-01)
 *   SYNC_TO=2026-12-31     (default: today)
 *   DRY_RUN=true           (default: false — print rows but don't insert)
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { Client } = require('pg');
const axios       = require('axios');
const dotenv      = require('dotenv');

dotenv.config();

// ── Config ────────────────────────────────────────────────────────────────
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
const LEGACY_API_BASE = 'https://admin.khelopatna.in/admin_api.php?action=search_bookings&search=';
const SYNC_FROM       = process.env.SYNC_FROM || '2025-07-01';
const SYNC_TO         = process.env.SYNC_TO   || new Date().toISOString().split('T')[0];
const DRY_RUN         = process.env.DRY_RUN === 'true';
const BATCH_SIZE      = 50;   // rows per pg transaction

if (!SUPABASE_DB_URL) {
    console.error('❌  SUPABASE_DB_URL is not set. Add it to your .env file.');
    process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

/**
 * Expand a time range like "06:00" → "10:00" into slot strings:
 * ["06-07", "07-08", "08-09", "09-10"]
 */
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

/**
 * Normalise legacy payment_method to a known enum value.
 */
function normaliseMethod(raw) {
    const m = (raw || '').toLowerCase();
    if (m.includes('cashfree'))                      return 'cashfree';
    if (m.includes('upi') || m.includes('gpay'))     return 'upi';
    if (m.includes('card'))                          return 'card';
    return 'upi'; // default — most legacy offline payments were UPI/cash
}

// ── Main ──────────────────────────────────────────────────────────────────

async function run() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log(' KheloPatna · Legacy Booking Sync → Supabase');
    console.log(`  Range  : ${SYNC_FROM}  →  ${SYNC_TO}`);
    console.log(`  Dry run: ${DRY_RUN}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    // ── Connect to Supabase ──────────────────────────────────────────────
    const pg = new Client({
        connectionString: SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });
    await pg.connect();
    console.log('✅  Connected to Supabase PostgreSQL');

    // ── Resolve tenant & branch IDs from Supabase ────────────────────────
    const tenantRes = await pg.query(
        `SELECT id FROM tenants WHERE subdomain = 'khelopatna' LIMIT 1`
    );
    if (!tenantRes.rows.length) {
        console.error('❌  Tenant "khelopatna" not found in Supabase.');
        console.error('    Run the seed first, or create the tenant record manually.');
        await pg.end();
        process.exit(1);
    }
    const tenantId = tenantRes.rows[0].id;

    const branchRes = await pg.query(
        `SELECT id FROM branches WHERE tenant_id = $1 LIMIT 1`, [tenantId]
    );
    if (!branchRes.rows.length) {
        console.error('❌  No branch found for tenant in Supabase.');
        await pg.end();
        process.exit(1);
    }
    const branchId = branchRes.rows[0].id;

    console.log(`✅  Tenant  ID : ${tenantId}`);
    console.log(`✅  Branch  ID : ${branchId}`);
    console.log('');

    // ── Week-by-week crawl ───────────────────────────────────────────────
    const startDate = new Date(SYNC_FROM);
    const endDate   = new Date(SYNC_TO);
    endDate.setDate(endDate.getDate() + 1); // make end inclusive

    let cursor = new Date(startDate);
    let totalFetched  = 0;
    let totalInserted = 0;
    let totalSkipped  = 0;
    let totalErrors   = 0;

    const buffer = []; // accumulate rows for batch insert

    const flushBuffer = async () => {
        if (buffer.length === 0 || DRY_RUN) {
            if (DRY_RUN && buffer.length) {
                console.log(`  [DRY RUN] Would insert ${buffer.length} rows`);
                buffer.length = 0;
            }
            return;
        }

        await pg.query('BEGIN');
        try {
            for (const row of buffer) {
                const res = await pg.query(
                    `INSERT INTO bookings
                        (tenant_id, branch_id, customer_name, customer_email, customer_phone,
                         date, time_slots, total_amount, paid_amount, payment_status,
                         payment_method, discount, order_id, transaction_id, sport,
                         participants_count, created_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
                     ON CONFLICT (order_id) DO NOTHING
                     RETURNING id`,
                    [
                        tenantId,
                        branchId,
                        row.customerName,
                        row.customerEmail,
                        row.customerPhone,
                        row.date,
                        row.timeSlots,
                        row.totalAmount,
                        row.paidAmount,
                        row.paymentStatus,
                        row.paymentMethod,
                        row.discount,
                        row.orderId,
                        row.transactionId,
                        row.sport,
                        1,
                        row.createdAt
                    ]
                );
                if (res.rows.length) totalInserted++;
                else totalSkipped++;
            }
            await pg.query('COMMIT');
        } catch (err) {
            await pg.query('ROLLBACK');
            console.error(`  ❌  Batch insert failed: ${err.message}`);
            totalErrors += buffer.length;
        }
        buffer.length = 0;
    };

    while (cursor < endDate) {
        const next = new Date(cursor);
        next.setDate(next.getDate() + 7);

        const dateFrom = cursor.toISOString().split('T')[0];
        const dateTo   = (next > endDate ? endDate : next).toISOString().split('T')[0];

        try {
            process.stdout.write(`  Fetching ${dateFrom} → ${dateTo} ... `);
            const response = await axios.get(
                `${LEGACY_API_BASE}&date_from=${dateFrom}&date_to=${dateTo}`,
                { timeout: 15000 }
            );

            const legacyBookings = response.data?.bookings || [];
            process.stdout.write(`${legacyBookings.length} bookings\n`);
            totalFetched += legacyBookings.length;

            for (const legacy of legacyBookings) {
                const orderId = `LEGACY_${legacy.id}`;
                const phone   = String(legacy.phone || '0000000000').replace(/\D/g, '').slice(-10);
                const email   = legacy.email || `${phone}@khelopatna.in`;

                let timeSlots = buildTimeSlots(legacy.start_time, legacy.end_time);
                // Special legacy quirk: booking 1121 always needs 23-24 slot
                if (String(legacy.id) === '1121' && !timeSlots.includes('23-24')) {
                    timeSlots.push('23-24');
                }

                const sport = (legacy.sport || '').toLowerCase() === 'cricket'
                    ? 'cricket'
                    : 'football';

                const paymentStatus = (legacy.booking_status || '').toLowerCase() === 'cancelled'
                    ? 'FAILED'
                    : 'SUCCESS';

                buffer.push({
                    customerName  : legacy.full_name || 'Anonymous',
                    customerEmail : email,
                    customerPhone : phone,
                    date          : legacy.booking_date,
                    timeSlots,
                    totalAmount   : parseFloat(legacy.total_amount)  || 0,
                    paidAmount    : parseFloat(legacy.paid_amount)   || 0,
                    paymentStatus,
                    paymentMethod : normaliseMethod(legacy.payment_method),
                    discount      : 0,
                    orderId,
                    transactionId : legacy.transaction_id || null,
                    sport,
                    createdAt     : legacy.created_at ? new Date(legacy.created_at) : new Date()
                });

                if (buffer.length >= BATCH_SIZE) await flushBuffer();
            }
        } catch (err) {
            console.error(`\n  ❌  Failed interval ${dateFrom}→${dateTo}: ${err.message}`);
            totalErrors++;
        }

        cursor = next;
    }

    // flush remaining
    await flushBuffer();

    await pg.end();

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log(' Sync Complete!');
    console.log(`  Fetched from legacy API : ${totalFetched}`);
    console.log(`  Inserted into Supabase  : ${totalInserted}`);
    console.log(`  Skipped (already exist) : ${totalSkipped}`);
    console.log(`  Errors                  : ${totalErrors}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    if (totalErrors > 0) process.exit(1);
}

run().catch(err => {
    console.error('\n❌  Fatal error:', err.message);
    process.exit(1);
});
