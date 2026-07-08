const { Pool } = require('pg');

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:W2UiPL8b2kBARJXQ@db.kpwhnpexuggkjpzduxoq.supabase.co:5432/postgres';

async function run() {
    const pool = new Pool({
        connectionString: SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    console.log('Connecting to database and finding active tenant...');
    const tenantRes = await pool.query("SELECT id, name FROM tenants WHERE subdomain = 'khelopatna' LIMIT 1");
    if (tenantRes.rows.length === 0) {
        console.error('Active tenant "khelopatna" not found! Run "npm run seed" first.');
        await pool.end();
        return;
    }
    const tenantId = tenantRes.rows[0].id;
    console.log(`Active Tenant: "${tenantRes.rows[0].name}" (UUID: ${tenantId})`);

    const branchRes = await pool.query("SELECT id, name FROM branches WHERE tenant_id = $1 LIMIT 1", [tenantId]);
    if (branchRes.rows.length === 0) {
        console.error('Active branch not found!');
        await pool.end();
        return;
    }
    const branchId = branchRes.rows[0].id;
    console.log(`Active Branch: "${branchRes.rows[0].name}" (UUID: ${branchId})`);

    // Let's get active session ID
    const sessionRes = await pool.query("SELECT id, name FROM sessions WHERE tenant_id = $1 AND status = 'ACTIVE' LIMIT 1", [tenantId]);
    if (sessionRes.rows.length === 0) {
        console.error('Active session not found!');
        await pool.end();
        return;
    }
    const sessionId = sessionRes.rows[0].id;
    console.log(`Active Session: "${sessionRes.rows[0].name}" (UUID: ${sessionId})`);

    console.log('\n--- Link Orphaned/Legacy Records to the Active Tenant & Branch ---');

    const updateTables = [
        'bookings',
        'coaches',
        'batches',
        'students',
        'fees',
        'turf_settings',
        'turf_closures',
        'attendance',
        'pos_sales',
        'inventory_items',
        'staff'
    ];

    for (const table of updateTables) {
        try {
            const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
            const count = countRes.rows[0].count;
            if (count > 0) {
                const res = await pool.query(`UPDATE ${table} SET tenant_id = $1, branch_id = $2`, [tenantId, branchId]);
                console.log(`  Updated ${res.rowCount} row(s) in "${table}" table.`);
            } else {
                console.log(`  Table "${table}" is empty, skipping update.`);
            }
        } catch (err) {
            console.error(`  Error updating table "${table}":`, err.message);
        }
    }

    console.log('\n--- Seeding Test Student and Invoices ---');
    console.log('Cleaning up old test student (KP-0001) if any...');
    await pool.query("DELETE FROM fees WHERE student_id IN (SELECT id FROM students WHERE membership_id = 'KP-0001')");
    await pool.query("DELETE FROM students WHERE membership_id = 'KP-0001'");

    console.log('Inserting test student KP-0001...');
    const studentInsert = await pool.query(`
        INSERT INTO students (
            tenant_id, branch_id, membership_id, name, date_of_birth, gender, sport, batch_time, phone, father_name, father_mobile
        ) VALUES (
            $1, $2, 'KP-0001', 'Test Student', '2015-05-15', 'Male', 'cricket', '06:00-08:00 AM', '9876543210', 'Father Test', '9876543210'
        ) RETURNING id;
    `, [tenantId, branchId]);
    const studentId = studentInsert.rows[0].id;
    console.log(`Test student inserted with UUID: ${studentId}`);

    console.log('Inserting outstanding fee invoices (June and July 2026) for Test Student...');
    await pool.query(`
        INSERT INTO fees (
            tenant_id, branch_id, student_id, amount_due, amount_paid, due_date, month_for, status
        ) VALUES 
        ($1, $2, $3, 2000.00, 0.00, '2026-06-10', 'June 2026', 'UNPAID'),
        ($1, $2, $3, 2000.00, 0.00, '2026-07-10', 'July 2026', 'UNPAID');
    `, [tenantId, branchId, studentId]);
    console.log('Test student fee invoices inserted successfully.');

    // Let's verify total bookings count
    const totalBookings = await pool.query("SELECT COUNT(*)::int AS count FROM bookings");
    console.log(`\nTotal bookings currently linked to active tenant: ${totalBookings.rows[0].count}`);

    console.log('\nAll data references restored successfully!');
    await pool.end();
}

run().catch(console.error);
