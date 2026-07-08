/**
 * bootstrap.js
 * Ensures the default tenant, branch, active session, and default admin user exist in Supabase.
 * Called once at server startup — safe to re-run (idempotent).
 */

'use strict';

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function ensureDefaultTenant() {
    const client = await pool.connect();
    try {
        // ── Tenant ──────────────────────────────────────────────────────
        let tenantRes = await client.query(
            `SELECT id FROM tenants WHERE subdomain = 'khelopatna' LIMIT 1`
        );

        let tenantId;
        if (tenantRes.rows.length) {
            tenantId = tenantRes.rows[0].id;
        } else {
            const ins = await client.query(
                `INSERT INTO tenants (name, subdomain, is_active, config, subscription_plan, subscription_expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [
                    'Khelo Patna Elite Sports & Turf',
                    'khelopatna',
                    true,
                    JSON.stringify({ theme: 'light', currency: 'INR' }),
                    'ENTERPRISE',
                    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                ]
            );
            tenantId = ins.rows[0].id;
            console.log('  Bootstrap: created default tenant');
        }

        // ── Branch ───────────────────────────────────────────────────────
        let branchRes = await client.query(
            `SELECT id FROM branches WHERE tenant_id = $1 LIMIT 1`, [tenantId]
        );

        let branchId;
        if (branchRes.rows.length) {
            branchId = branchRes.rows[0].id;
        } else {
            const ins = await client.query(
                `INSERT INTO branches (tenant_id, name, address, city, state, contact_number)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [tenantId, 'Patna Main Arena', 'Khagaul Road, Near Saguna More', 'Patna', 'Bihar', '9709701400']
            );
            branchId = ins.rows[0].id;
            console.log('  Bootstrap: created default branch');
        }

        // ── Active Session ────────────────────────────────────────────────
        const sessionRes = await client.query(
            `SELECT id FROM sessions WHERE tenant_id = $1 AND status = 'ACTIVE' LIMIT 1`, [tenantId]
        );
        if (!sessionRes.rows.length) {
            const year = new Date().getFullYear();
            await client.query(
                `INSERT INTO sessions (tenant_id, name, start_date, end_date, status)
                 VALUES ($1, $2, $3, $4, 'ACTIVE')`,
                [tenantId, `${year}-${year + 1}`, `${year}-04-01`, `${year + 1}-03-31`]
            );
            console.log('  Bootstrap: created active session');
        }

        // ── Default Admin User ────────────────────────────────────────────
        let adminRes = await client.query(
            `SELECT id FROM staff WHERE tenant_id = $1 AND username = 'admin' LIMIT 1`, [tenantId]
        );
        if (!adminRes.rows.length) {
            const salt = bcrypt.genSaltSync(10);
            const passwordHash = bcrypt.hashSync('admin123', salt);

            await client.query(
                `INSERT INTO staff (tenant_id, branch_id, username, password_hash, role)
                 VALUES ($1, $2, $3, $4, $5)`,
                [tenantId, branchId, 'admin', passwordHash, 'SUPER_ADMIN']
            );
            console.log('  Bootstrap: created default admin user ("admin" / "admin123")');
        }

        return { tenantId, branchId };
    } finally {
        client.release();
    }
}

async function bootstrapDatabase() {
    console.log('[Bootstrap] Checking database structures and initial admin seeding...');
    try {
        const { tenantId, branchId } = await ensureDefaultTenant();
        console.log(`[Bootstrap] Database successfully initialized. Tenant ID: ${tenantId}`);
        return { tenantId, branchId };
    } catch (err) {
        console.error('[Bootstrap] CRITICAL: Failed database bootstrap sequence:', err.message);
        throw err;
    }
}

module.exports = { bootstrapDatabase };
