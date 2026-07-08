const { Pool } = require('pg');

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:W2UiPL8b2kBARJXQ@db.kpwhnpexuggkjpzduxoq.supabase.co:5432/postgres';

async function run() {
    const pool = new Pool({
        connectionString: SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    console.log('Querying tenants:');
    const tenantsRes = await pool.query('SELECT id, name FROM tenants LIMIT 5;');
    console.log(tenantsRes.rows);

    console.log('Querying branches:');
    const branchesRes = await pool.query('SELECT id, name FROM branches LIMIT 5;');
    console.log(branchesRes.rows);

    await pool.end();
}

run().catch(console.error);
