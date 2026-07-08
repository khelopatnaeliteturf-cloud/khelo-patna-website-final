const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const pg = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });
    await pg.connect();
    
    console.log('Creating maps_reviews_used table in Supabase...');
    await pg.query(`
        CREATE TABLE IF NOT EXISTS maps_reviews_used (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            text TEXT NOT NULL,
            rating INT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            device TEXT,
            browser TEXT,
            os TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log('✅ Table created successfully.');
    await pg.end();
}

run().catch(err => {
    console.error('Failed to create table:', err.message);
    process.exit(1);
});
