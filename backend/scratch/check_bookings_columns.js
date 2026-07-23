const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const pg = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });
    await pg.connect();
    
    const res = await pg.query(`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'bookings'
        ORDER BY ordinal_position;
    `);
    
    console.table(res.rows);
    await pg.end();
}
run();
