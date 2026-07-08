const { Pool } = require('pg');

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:W2UiPL8b2kBARJXQ@db.kpwhnpexuggkjpzduxoq.supabase.co:5432/postgres';

async function run() {
    const pool = new Pool({
        connectionString: SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    console.log('Inspecting constraints on staff table:');
    const res = await pool.query(`
        SELECT conname, pg_get_constraintdef(c.oid)
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE conrelid = 'staff'::regclass;
    `);
    console.log(res.rows);
    await pool.end();
}

run().catch(console.error);
