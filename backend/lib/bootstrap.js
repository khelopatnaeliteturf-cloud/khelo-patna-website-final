/**
 * bootstrap.js
 * Ensures the default tenant, branch, active session, and environment-defined admin user exist in Supabase.
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

        // ── Environment-defined Admin User ───────────────────────────────
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (adminUsername && adminPassword) {
            let adminRes = await client.query(
                `SELECT id FROM staff WHERE tenant_id = $1 AND username = $2 LIMIT 1`, [tenantId, adminUsername]
            );
            const salt = bcrypt.genSaltSync(10);
            const passwordHash = bcrypt.hashSync(adminPassword, salt);

            if (adminRes.rows.length) {
                // Update password of existing admin user
                const adminId = adminRes.rows[0].id;
                await client.query(
                    `UPDATE staff SET password_hash = $1 WHERE id = $2`,
                    [passwordHash, adminId]
                );
                console.log(`  Bootstrap: updated password for admin user "${adminUsername}"`);
            } else {
                // Insert new admin user
                await client.query(
                    `INSERT INTO staff (tenant_id, branch_id, username, password_hash, role)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [tenantId, branchId, adminUsername, passwordHash, 'SUPER_ADMIN']
                );
                console.log(`  Bootstrap: seeded admin user "${adminUsername}"`);
            }
        } else {
            console.log('  Bootstrap: ADMIN_USERNAME or ADMIN_PASSWORD not configured. Skipping admin user seeding.');
        }

        // ── Default Turf Settings ────────────────────────────────────────
        const settingsRes = await client.query(
            `SELECT id FROM turf_settings WHERE tenant_id = $1 LIMIT 1`, [tenantId]
        );
        if (!settingsRes.rows.length) {
            await client.query(
                `INSERT INTO turf_settings (tenant_id, branch_id, cricket_base_rate, football_base_rate, blackout_hours)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    tenantId,
                    branchId,
                    1200.00,
                    1500.00,
                    JSON.stringify({ start: 15, end: 18 })
                ]
            );
            console.log('  Bootstrap: created default turf settings');
        }

        // ── Scoreboards Table ─────────────────────────────────────────────
        console.log('  Bootstrap: ensuring scoreboards table exists...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS scoreboards (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
                branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
                booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
                sport TEXT NOT NULL,
                match_name TEXT NOT NULL,
                team_a_name TEXT NOT NULL,
                team_b_name TEXT NOT NULL,
                team_a_score INT DEFAULT 0,
                team_b_score INT DEFAULT 0,
                status TEXT CHECK (status IN ('UPCOMING', 'LIVE', 'FINISHED')) DEFAULT 'LIVE',
                settings JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE scoreboards ENABLE ROW LEVEL SECURITY;
        `);
        console.log('  Bootstrap: scoreboards table checked/created');

        // ── Coupons Table ────────────────────────────────────────────────
        console.log('  Bootstrap: ensuring coupons table exists...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENT', 'FLAT')),
                discount_value NUMERIC(10, 2) NOT NULL,
                min_order_amount NUMERIC(10, 2) DEFAULT 0,
                max_discount_amount NUMERIC(10, 2) DEFAULT NULL,
                expiry_date DATE DEFAULT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                usage_limit INT DEFAULT NULL,
                usage_count INT DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
        `);
        console.log('  Bootstrap: coupons table checked/created');

        // ── Communication Logs Table ──────────────────────────────────────
        console.log('  Bootstrap: ensuring communication_logs table exists...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS communication_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
                type VARCHAR(20) NOT NULL CHECK (type IN ('EMAIL', 'WHATSAPP')),
                recipient VARCHAR(255) NOT NULL,
                recipient_name VARCHAR(255) DEFAULT NULL,
                booked_by VARCHAR(255) DEFAULT NULL,
                subject VARCHAR(255) DEFAULT NULL,
                content TEXT NOT NULL,
                status VARCHAR(20) CHECK (status IN ('SENT', 'FAILED')) DEFAULT 'SENT',
                error_message TEXT DEFAULT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255) DEFAULT NULL;
            ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS booked_by VARCHAR(255) DEFAULT NULL;
            ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
        `);
        console.log('  Bootstrap: communication_logs table checked/created');
 
        // ── Bookings Table Columns Migration ─────────────────────────────
        console.log('  Bootstrap: ensuring bookings table has coupon & booked_by columns...');
        await client.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS payment_link TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS booked_by VARCHAR(255) DEFAULT 'Online / WhatsApp Bot',
            ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
        `);
        console.log('  Bootstrap: bookings table columns checked/added');

        // ── Turf Settings Table Columns Migration ────────────────────────
        console.log('  Bootstrap: ensuring turf_settings table has advance_percentage column...');
        await client.query(`
            ALTER TABLE turf_settings 
            ADD COLUMN IF NOT EXISTS advance_percentage INT DEFAULT 100;
        `);
        console.log('  Bootstrap: turf_settings table advance_percentage column checked/added');

        // ── Chat Sessions Table for WhatsApp Bot ─────────────────────────
        console.log('  Bootstrap: ensuring chat_sessions table exists...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                phone VARCHAR(50) UNIQUE NOT NULL,
                state VARCHAR(50) DEFAULT 'IDLE',
                booking_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('  Bootstrap: chat_sessions table checked/created');

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
