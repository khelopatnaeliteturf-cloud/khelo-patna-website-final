require('dotenv').config({ path: './.env' });
const Booking = require('../models/Booking');
const { bootstrapDatabase } = require('../lib/bootstrap');

async function testOfflineBooking() {
    try {
        console.log('Initializing database connection & migrations...');
        await bootstrapDatabase();

        console.log('Testing offline booking insertion...');
        const testOrder = 'TEST_' + Date.now();
        const testB = new Booking({
            customerName: 'Test Staff Booking',
            customerEmail: 'test@khelopatna.in',
            customerPhone: '9999999999',
            date: '2026-07-25',
            timeSlots: ['10:00 AM - 11:00 AM'],
            totalAmount: 1000,
            paidAmount: 1000,
            discount: 0,
            paymentStatus: 'SUCCESS',
            paymentMethod: 'offline',
            orderId: testOrder,
            sport: 'cricket',
            participantsCount: 1,
            bookedBy: 'Staff (owner)'
        });
        await testB.save();
        console.log('✅ Offline booking created successfully! ID:', testB._id, 'BookedBy:', testB.bookedBy);
        process.exit(0);
    } catch (err) {
        console.error('❌ Offline booking failed:', err);
        process.exit(1);
    }
}

testOfflineBooking();
