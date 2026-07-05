/**
 * Development launcher: boots an in-memory MongoDB when no MONGODB_URI is
 * configured, then starts the API server. Used for local dev and the v0
 * preview sandbox where no real MongoDB is available.
 *
 * Production always sets MONGODB_URI and runs `node server.js` directly.
 */

async function main() {
    if (!process.env.MONGODB_URI) {
        console.log('[dev-server] No MONGODB_URI set. Starting in-memory MongoDB...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create({
            instance: { dbName: 'khelopatna' }
        });
        process.env.MONGODB_URI = mongod.getUri('khelopatna');
        console.log('[dev-server] In-memory MongoDB ready.');

        const shutdown = async () => {
            await mongod.stop();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }

    // Safe defaults for local development only
    if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
        console.log('[dev-server] Generated ephemeral JWT_SECRET for this session.');
    }

    require('./server.js');
}

main().catch((err) => {
    console.error('[dev-server] Failed to start:', err);
    process.exit(1);
});
