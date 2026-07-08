const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const pg = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });
    await pg.connect();
    const countRes = await pg.query('SELECT COUNT(*) FROM bookings');
    console.log('Bookings count in Supabase:', countRes.rows[0].count);
    
    // Also print some sample bookings
    const sampleRes = await pg.query('SELECT id, customer_name, date, sport, total_amount, order_id FROM bookings ORDER BY date DESC LIMIT 5');
    console.log('Latest 5 bookings:');
    console.table(sampleRes.rows);

    await pg.end();
}
run();
