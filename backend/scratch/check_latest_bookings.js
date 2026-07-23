const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('../lib/mongoose-pg-bridge');
const Booking = require('../models/Booking');

async function check() {
    const bookings = await Booking.find().sort({ createdAt: -1 }).limit(5);
    bookings.forEach(b => {
        console.log(`- OrderId: ${b.orderId}, Name: ${b.customerName}, Status: ${b.paymentStatus}, Paid: ${b.paidAmount}, CreatedAt: ${b.createdAt}, Details:`, b.paymentDetails);
    });
    process.exit(0);
}
check();
