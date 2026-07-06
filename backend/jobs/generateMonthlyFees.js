#!/usr/bin/env node
/**
 * Run monthly fee generation for all tenants.
 * Usage: node jobs/generateMonthlyFees.js
 * Cron example: 0 6 1 * * cd /path/to/backend && node jobs/generateMonthlyFees.js
 */
require('dotenv').config();

const mongoose = require('../lib/mongoose-pg-bridge');
const Tenant = require('../models/Tenant');
const { generateMonthlyFeesForTenant } = require('../services/billing');

async function main() {
    await mongoose.connect();
    console.log('Connected to Database');

    const tenants = await Tenant.find({ isActive: { $ne: false } });
    let totalCreated = 0;

    for (const tenant of tenants) {
        const result = await generateMonthlyFeesForTenant(tenant._id);
        console.log(`[${tenant.subdomain}] created=${result.created} skipped=${result.skipped}`);
        totalCreated += result.created;
    }

    console.log(`Done. Total invoices created: ${totalCreated}`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
