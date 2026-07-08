const mongoose = require('../lib/mongoose-pg-bridge');
const Staff = require('../models/Staff');
const { ensureDefaultTenant } = require('../lib/bootstrap');

async function seed() {
    console.log('Connecting to database...');
    await mongoose.connect();
    console.log('Connected!');

    console.log('Fetching default tenant and branch...');
    const { tenantId, branchId } = await ensureDefaultTenant();
    console.log(`Using Tenant ID: ${tenantId}`);
    console.log(`Using Branch ID: ${branchId}`);

    console.log('Checking for existing "admin" account...');
    let admin = await Staff.findOne({ username: 'admin' });

    if (admin) {
        console.log('Found existing "admin" account. Resetting password to "admin123"...');
        admin.password = 'admin123';
        admin.role = 'SUPER_ADMIN';
        admin.tenantId = tenantId;
        admin.branchId = branchId;
        await admin.save();
        console.log('Admin account password reset successfully!');
    } else {
        console.log('Creating new "admin" account with username "admin" and password "admin123"...');
        admin = new Staff({
            username: 'admin',
            password: 'admin123',
            role: 'SUPER_ADMIN',
            tenantId: tenantId,
            branchId: branchId,
            permissions: [
                'website:view', 'website:edit',
                'google-reviews:view', 'google-reviews:edit',
                'integrations:view', 'integrations:edit',
                'settings:view', 'settings:edit',
                'audit-logs:view'
            ] // Super Admin defaults
        });
        await admin.save();
        console.log('Admin account created and seeded successfully!');
    }

    console.log('Disconnecting...');
    await mongoose.disconnect();
    console.log('Done!');
}

seed().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
});
