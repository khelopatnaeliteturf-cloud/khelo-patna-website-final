const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:W2UiPL8b2kBARJXQ@db.kpwhnpexuggkjpzduxoq.supabase.co:5432/postgres';

async function applySchema() {
    console.log('Reading supabase_schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'supabase_schema.sql'), 'utf8');

    console.log('Connecting to Supabase PostgreSQL...');
    const pgClient = new Client({
        connectionString: SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });
    await pgClient.connect();
    console.log('Connected.');

    try {
        console.log('Applying schema SQL...');
        await pgClient.query(schemaSql);
        console.log('Schema successfully applied to Supabase!');
    } catch (err) {
        console.error('Error applying schema:', err.message);
        process.exit(1);
    } finally {
        await pgClient.end();
    }
}

applySchema();
