const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
const Tenant = require('./models/Tenant');
const Branch = require('./models/Branch');
const Booking = require('./models/Booking');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/khelopatna';
const BASE_API_URL = 'https://admin.khelopatna.in/admin_api.php?action=search_bookings&search=';

async function importBookings() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // 1. Fetch Active Tenant & Branch
    const tenant = await Tenant.findOne({ subdomain: 'khelopatna' });
    if (!tenant) {
        console.error('Tenant "khelopatna" not found. Please run "npm run seed" first.');
        process.exit(1);
    }
    console.log(`Using Tenant: ${tenant.name} (${tenant._id})`);

    const branch = await Branch.findOne({ tenantId: tenant._id });
    if (!branch) {
        console.error('Branch not found for tenant. Please run "npm run seed" first.');
        process.exit(1);
    }
    console.log(`Using Branch: ${branch.name} (${branch._id})`);

    // 2. Set Up Date Range (01 July 2025 to 30 July 2026)
    const startDate = new Date('2025-07-01');
    const endDate = new Date('2026-08-01'); // Query up to Aug 1st to fully cover July 30th/31st

    let current = new Date(startDate);
    let grandTotalImported = 0;
    let grandTotalSkipped = 0;

    console.log(`Starting week-by-week paginated import from 2025-07-01 to 2026-08-01...\n`);

    while (current < endDate) {
        const next = new Date(current);
        next.setDate(next.getDate() + 7);

        // Format dates as YYYY-MM-DD
        const dateFrom = current.toISOString().split('T')[0];
        // Calculate dateTo (exclusive limit or inclusive date)
        const dateTo = next.toISOString().split('T')[0];

        const queryUrl = `${BASE_API_URL}&date_from=${dateFrom}&date_to=${dateTo}`;
        
        try {
            console.log(`Fetching interval: ${dateFrom} to ${dateTo}...`);
            const response = await axios.get(queryUrl);
            
            if (response.data && response.data.bookings) {
                const bookings = response.data.bookings;
                console.log(`  -> Found ${bookings.length} bookings.`);

                let intervalImported = 0;

                for (const legacy of bookings) {
                    // Parse timeSlots
                    let startHour = parseInt(legacy.start_time.split(':')[0], 10);
                    let endHour = parseInt(legacy.end_time.split(':')[0], 10);
                    if (endHour === 0) endHour = 24;
                    if (startHour > endHour) {
                        endHour += 24;
                    }

                    const timeSlots = [];
                    for (let h = startHour; h < endHour; h++) {
                        const h1 = h % 24;
                        const h2 = (h + 1) % 24;
                        const sStr = String(h1).padStart(2, '0');
                        const eStr = String(h2).padStart(2, '0');
                        timeSlots.push(`${sStr}-${eStr}`);
                    }

                    // Special legacy database quirk: Sams booking 1121 covers both 10-11 PM (22) and 11-12 PM (23) slots
                    if (String(legacy.id) === '1121' && !timeSlots.includes('23-24')) {
                        timeSlots.push('23-24');
                    }

                    // Validate fields
                    const orderId = `LEGACY_${legacy.id}`;
                    const customerName = legacy.full_name || 'Anonymous';
                    const customerPhone = legacy.phone || '0000000000';
                    const customerEmail = legacy.email || `${customerPhone}@khelopatna.in`;
                    const totalAmount = parseFloat(legacy.total_amount) || 0;
                    const paidAmount = parseFloat(legacy.paid_amount) || 0;
                    const sport = (legacy.sport || 'football').toLowerCase() === 'football' ? 'football' : 'cricket';

                    // Payment status
                    let paymentStatus = 'SUCCESS';
                    if (legacy.booking_status === 'cancelled') {
                        paymentStatus = 'FAILED';
                    }

                    // Payment method enum validation
                    let paymentMethod = 'upi';
                    const legacyMethod = (legacy.payment_method || '').toLowerCase();
                    if (legacyMethod.includes('cash') || legacyMethod.includes('offline')) {
                        paymentMethod = 'upi';
                    } else if (legacyMethod.includes('cashfree')) {
                        paymentMethod = 'cashfree';
                    }

                    const bookingDoc = {
                        tenantId: tenant._id,
                        branchId: branch._id,
                        customerName,
                        customerEmail,
                        customerPhone,
                        date: legacy.booking_date,
                        timeSlots,
                        totalAmount,
                        paidAmount,
                        paymentStatus,
                        paymentMethod,
                        orderId,
                        transactionId: legacy.transaction_id || '',
                        sport,
                        createdAt: new Date(legacy.created_at || Date.now())
                    };

                    await Booking.findOneAndUpdate(
                        { orderId },
                        bookingDoc,
                        { upsert: true, new: true }
                    );
                    intervalImported++;
                }

                grandTotalImported += intervalImported;
            } else {
                console.log(`  -> Empty response or no bookings found for this interval.`);
            }
        } catch (error) {
            console.error(`  -> Failed to fetch/process interval ${dateFrom} - ${dateTo}:`, error.message);
            grandTotalSkipped++;
        }

        // Advance to next 7-day interval
        current = next;
    }

    console.log(`\n==============================================`);
    console.log(`Grand Import Migration Complete!`);
    console.log(`- Total unique bookings successfully synced: ${grandTotalImported}`);
    console.log(`- Failed/Skipped intervals: ${grandTotalSkipped}`);
    console.log(`==============================================`);

    await mongoose.disconnect();
}

importBookings().catch(err => {
    console.error('Fatal import error:', err);
    process.exit(1);
});
