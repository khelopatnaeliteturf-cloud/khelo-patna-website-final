const Tenant = require('../models/Tenant');
const Branch = require('../models/Branch');
const Session = require('../models/Session');

async function ensureDefaultTenant() {
    let tenant = await Tenant.findOne({ subdomain: 'khelopatna' });
    if (!tenant) {
        tenant = await Tenant.create({
            name: 'Khelo Patna Elite Sports & Turf',
            subdomain: 'khelopatna',
            isActive: true,
            config: { theme: 'light', currency: 'INR' },
            subscription: {
                plan: 'ENTERPRISE',
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            }
        });
    }

    let branch = await Branch.findOne({ tenantId: tenant._id });
    if (!branch) {
        branch = await Branch.create({
            tenantId: tenant._id,
            name: 'Patna Main Arena',
            address: 'Khagaul Road, Near Saguna More',
            city: 'Patna',
            state: 'Bihar',
            contactNumber: '9709701400'
        });
    }

    const activeSession = await Session.findOne({ tenantId: tenant._id, status: 'ACTIVE' });
    if (!activeSession) {
        const year = new Date().getFullYear();
        await Session.create({
            tenantId: tenant._id,
            name: `${year}-${year + 1}`,
            startDate: new Date(`${year}-04-01`),
            endDate: new Date(`${year + 1}-03-31`),
            status: 'ACTIVE'
        });
    }

    return { tenant, branch };
}

module.exports = { ensureDefaultTenant };
