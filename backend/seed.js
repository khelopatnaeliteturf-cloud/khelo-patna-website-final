const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tenant = require('./models/Tenant');
const Branch = require('./models/Branch');
const Session = require('./models/Session');
const Staff = require('./models/Staff');
const InventoryItem = require('./models/InventoryItem');
const TurfSettings = require('./models/TurfSettings');
const Coach = require('./models/Coach');
const Batch = require('./models/Batch');
const FeeStructure = require('./models/FeeStructure');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/khelopatna';

async function seed() {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // 1. Seed Tenant
    console.log('Clearing and seeding Tenant...');
    await Tenant.deleteMany({});
    const tenant = new Tenant({
        name: 'Khelo Patna Elite Sports & Turf',
        subdomain: 'khelopatna',
        isActive: true,
        config: {
            theme: 'light',
            currency: 'INR'
        },
        subscription: {
            plan: 'ENTERPRISE',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
    });
    await tenant.save();
    console.log(`Tenant created: ${tenant.name} (${tenant._id})`);

    // 2. Seed Branch
    console.log('Clearing and seeding Branch...');
    await Branch.deleteMany({});
    const branch = new Branch({
        tenantId: tenant._id,
        name: 'Patna Main Arena',
        address: 'Khagaul Road, Near Saguna More',
        city: 'Patna',
        state: 'Bihar',
        contactNumber: '9709701400'
    });
    await branch.save();
    console.log(`Branch created: ${branch.name} (${branch._id})`);

    // 3. Seed Session
    console.log('Clearing and seeding Session...');
    await Session.deleteMany({});
    const session = new Session({
        tenantId: tenant._id,
        name: '2026-2027',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        status: 'ACTIVE'
    });
    await session.save();
    console.log(`Session created: ${session.name} (${session._id})`);

    // 4. Seed Turf Settings
    console.log('Clearing and seeding Turf Settings...');
    await TurfSettings.deleteMany({});
    const settings = new TurfSettings({
        tenantId: tenant._id,
        branchId: branch._id,
        cricketBaseRate: 1200,
        footballBaseRate: 1500,
        blackoutHours: { start: 15, end: 18 } // 3 PM - 6 PM
    });
    await settings.save();
    console.log('Turf settings seeded.');

    // 5. Seed Staff Accounts
    // Passwords come from env vars; if unset, strong random passwords are
    // generated and printed ONCE so no environment ever ships with
    // guessable defaults like "admin123".
    console.log('Clearing and seeding Staff Accounts...');
    await Staff.deleteMany({});

    const crypto = require('crypto');
    const generatePassword = () => crypto.randomBytes(9).toString('base64url');

    const seedAccounts = [
        { username: 'admin', role: 'SUPER_ADMIN', envKey: 'SEED_ADMIN_PASSWORD' },
        { username: 'manager', role: 'BRANCH_MANAGER', envKey: 'SEED_MANAGER_PASSWORD' },
        { username: 'counsellor', role: 'RECEPTIONIST', envKey: 'SEED_COUNSELLOR_PASSWORD' }
    ];

    for (const account of seedAccounts) {
        const fromEnv = process.env[account.envKey];
        const password = fromEnv || generatePassword();
        const staff = new Staff({
            tenantId: tenant._id,
            branchId: branch._id,
            username: account.username,
            password,
            role: account.role
        });
        await staff.save();
        if (!fromEnv) {
            console.log(`  Generated password for "${account.username}": ${password}  (save this now — it will not be shown again; or set ${account.envKey} before seeding)`);
        }
    }
    console.log('Staff accounts seeded successfully.');

    // 5b. Seed Fee Structure
    console.log('Clearing and seeding Fee Structure...');
    await FeeStructure.deleteMany({});
    await FeeStructure.create([
        {
            tenantId: tenant._id,
            branchId: branch._id,
            sessionId: session._id,
            sport: 'cricket',
            oneTimeAdmissionFee: 1500,
            monthlyFee: 2000,
            dueDayOfMonth: 5,
            isActive: true
        },
        {
            tenantId: tenant._id,
            branchId: branch._id,
            sessionId: session._id,
            sport: 'football',
            oneTimeAdmissionFee: 1500,
            monthlyFee: 2500,
            dueDayOfMonth: 5,
            isActive: true
        }
    ]);
    console.log('Fee structure seeded.');

    // 6. Seed Coaches
    console.log('Clearing and seeding Coaches...');
    await Coach.deleteMany({});
    const coach1 = new Coach({
        tenantId: tenant._id,
        branchId: branch._id,
        name: 'Coach Rakesh Singh',
        phone: '9876543210',
        email: 'rakesh@khelopatna.in',
        sports: ['cricket'],
        salary: 0,
        schedule: 'Mon-Sat 06:00 AM - 09:00 AM',
        status: 'ACTIVE'
    });
    await coach1.save();

    const coach2 = new Coach({
        tenantId: tenant._id,
        branchId: branch._id,
        name: 'Coach Amit Kumar',
        phone: '9988776655',
        email: 'amit@khelopatna.in',
        sports: ['football'],
        salary: 0,
        schedule: 'Mon-Sat 04:00 PM - 07:00 PM',
        status: 'ACTIVE'
    });
    await coach2.save();
    console.log('Coaches seeded.');

    // 7. Seed Batches
    console.log('Clearing and seeding Batches...');
    await Batch.deleteMany({});
    const batch1 = new Batch({
        tenantId: tenant._id,
        branchId: branch._id,
        name: 'Cricket Morning Elite',
        sport: 'cricket',
        sessionId: session._id,
        coachId: coach1._id,
        groundId: 'Turf A',
        capacity: 25,
        startTime: '06:00 AM',
        endTime: '08:00 AM',
        status: 'ACTIVE'
    });
    await batch1.save();

    const batch2 = new Batch({
        tenantId: tenant._id,
        branchId: branch._id,
        name: 'Football Evening Juniors',
        sport: 'football',
        sessionId: session._id,
        coachId: coach2._id,
        groundId: 'Turf B',
        capacity: 20,
        startTime: '04:00 PM',
        endTime: '06:00 PM',
        status: 'ACTIVE'
    });
    await batch2.save();
    console.log('Batches seeded.');

    // 8. Seed POS Beverage/General Inventory Items
    console.log('Clearing and seeding Inventory Items...');
    await InventoryItem.deleteMany({});

    const items = [
        {
            tenantId: tenant._id,
            branchId: branch._id,
            itemName: 'Mineral Water 1L',
            category: 'pos_drinks',
            totalQuantity: 100,
            availableQuantity: 45,
            condition: 'GOOD'
        },
        {
            tenantId: tenant._id,
            branchId: branch._id,
            itemName: 'Gatorade Sports Drink 500ml',
            category: 'pos_drinks',
            totalQuantity: 50,
            availableQuantity: 15,
            condition: 'GOOD'
        },
        {
            tenantId: tenant._id,
            branchId: branch._id,
            itemName: 'Training Orange Cones Set',
            category: 'general',
            totalQuantity: 10,
            availableQuantity: 8,
            condition: 'GOOD'
        },
        {
            tenantId: tenant._id,
            branchId: branch._id,
            itemName: 'Synthetic Football Pitch Marker cones',
            category: 'general',
            totalQuantity: 30,
            availableQuantity: 28,
            condition: 'GOOD'
        },
        {
            tenantId: tenant._id,
            branchId: branch._id,
            itemName: 'SS Cricket Leather Ball Alum tan',
            category: 'cricket',
            totalQuantity: 20,
            availableQuantity: 18,
            condition: 'GOOD'
        },
        {
            tenantId: tenant._id,
            branchId: branch._id,
            itemName: 'Nivia Football Size 5 Storm',
            category: 'football',
            totalQuantity: 15,
            availableQuantity: 12,
            condition: 'GOOD'
        }
    ];

    for (const item of items) {
        const doc = new InventoryItem(item);
        await doc.save();
    }
    console.log('Inventory items seeded.');

    console.log('Database Seeding Completed Successfully.');
    await mongoose.connection.close();
}

seed().catch(err => {
    console.error('Error during database seed:', err);
    process.exit(1);
});
