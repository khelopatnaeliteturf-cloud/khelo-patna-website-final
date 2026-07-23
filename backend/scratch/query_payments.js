const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('../lib/mongoose-pg-bridge');
const Booking = require('../models/Booking');

async function run() {
    console.log('Connecting to database...');
    await mongoose.connect();
    console.log('Connected!');
    
    const dateStr = '2026-07-19';
    console.log(`Querying all bookings for dateStr: ${dateStr}`);
    
    const bookings = await Booking.find({
        date: dateStr
    });
    
    console.log(`Found ${bookings.length} bookings:`);
    bookings.forEach(b => {
        console.log(`- ID: ${b._id}
  OrderId: ${b.orderId}
  Customer: ${b.customerName} (${b.customerPhone})
  Slots: ${b.timeSlots}
  Status: ${b.paymentStatus}
  Total: ${b.totalAmount}, Paid: ${b.paidAmount}
  Method: ${b.paymentMethod}
  TenantID: ${b.tenantId}
  BranchID: ${b.branchId}
  TransactionID: ${b.transactionId}
  Details: ${JSON.stringify(b.paymentDetails)}
`);
    });

    await mongoose.disconnect();
}
run().catch(console.error);
