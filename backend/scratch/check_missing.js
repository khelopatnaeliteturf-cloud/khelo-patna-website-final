const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const pg = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });
    await pg.connect();
    
    const totalCount = await pg.query('SELECT COUNT(*) FROM bookings');
    const legacyCount = await pg.query("SELECT COUNT(*) FROM bookings WHERE order_id LIKE 'LEGACY_%'");
    const localCount = await pg.query("SELECT COUNT(*) FROM bookings WHERE order_id NOT LIKE 'LEGACY_%'");

    console.log('Total bookings in Supabase:', totalCount.rows[0].count);
    console.log('Legacy bookings in Supabase (LEGACY_*):', legacyCount.rows[0].count);
    console.log('Local/New bookings in Supabase (not LEGACY_*):', localCount.rows[0].count);

    if (localCount.rows[0].count > 0) {
        const localSamples = await pg.query("SELECT id, customer_name, date, order_id FROM bookings WHERE order_id NOT LIKE 'LEGACY_%' LIMIT 5");
        console.table(localSamples.rows);
    }

    // Let's find if there are any orderIds in the legacy API that are NOT in the database.
    // To do this, we can run the test scan again and query the DB for each unique orderId to see what is missing.
    await pg.end();
}
run();
