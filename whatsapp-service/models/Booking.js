const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    timeSlots: [{ type: String, required: true }], // e.g. ["06:00-07:00", "07:00-08:00"]
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
    paymentMethod: { type: String, enum: ['cashfree', 'upi', 'cash', 'offline', 'card'], required: true },
    discount: { type: Number, default: 0 },
    orderId: { type: String, required: true, unique: true },
    transactionId: { type: String },
    sport: { type: String, required: true },
    paymentDetails: { type: Object },
    createdAt: { type: Date, default: Date.now }
});

// Multi-tenant indexes
BookingSchema.index({ tenantId: 1, branchId: 1 });
BookingSchema.index({ tenantId: 1, date: 1 });
BookingSchema.index({ tenantId: 1, groundId: 1, date: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
