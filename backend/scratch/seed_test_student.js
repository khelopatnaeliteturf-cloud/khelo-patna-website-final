const { Pool } = require('pg');

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:W2UiPL8b2kBARJXQ@db.kpwhnpexuggkjpzduxoq.supabase.co:5432/postgres';

async function run() {
    const pool = new Pool({
        connectionString: SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    const tenantId = '00000000-6a4a-3dab-2d00-52c4749665c9';
    const branchId = '00000000-6a4a-3dab-2d00-52c4749665cf';

    console.log('Cleaning up existing test student records...');
    await pool.query("DELETE FROM fees WHERE student_id IN (SELECT id FROM students WHERE membership_id = 'KP-0001')");
    await pool.query("DELETE FROM students WHERE membership_id = 'KP-0001'");

    console.log('Inserting test student KP-0001...');
    const studentRes = await pool.query(`
        INSERT INTO students (
            tenant_id, branch_id, membership_id, name, date_of_birth, gender, sport, batch_time, phone, father_name, father_mobile
        ) VALUES (
            $1, $2, 'KP-0001', 'Test Student', '2015-05-15', 'Male', 'cricket', '06:00-08:00 AM', '9876543210', 'Father Test', '9876543210'
        ) RETURNING id;
    `, [tenantId, branchId]);

    const studentId = studentRes.rows[0].id;
    console.log(`Inserted test student with UUID: ${studentId}`);

    console.log('Inserting outstanding fee invoices for Test Student...');
    await pool.query(`
        INSERT INTO fees (
            tenant_id, branch_id, student_id, amount_due, amount_paid, due_date, month_for, status
        ) VALUES 
        ($1, $2, $3, 2000.00, 0.00, '2026-06-10', 'June 2026', 'UNPAID'),
        ($1, $2, $3, 2000.00, 0.00, '2026-07-10', 'July 2026', 'UNPAID');
    `, [tenantId, branchId, studentId]);

    console.log('Database seeding successfully finished!');
    await pool.end();
}

run().catch(console.error);
