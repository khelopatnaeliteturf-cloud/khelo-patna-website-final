const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    console.log('Connecting to Supabase...');
    const client = await pool.connect();
    try {
        console.log('Creating coupons table...');
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
        `);
        console.log('Coupons table created successfully in Supabase!');
    } catch (err) {
        console.error('Failed to create coupons table:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
