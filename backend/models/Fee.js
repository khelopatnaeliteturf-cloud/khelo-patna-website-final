const mongoose = require('mongoose');

const FeeSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    amountDue: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    paymentDate: { type: Date },
    dueDate: { type: Date, required: true },
    monthFor: { type: String, required: true }, // e.g. "June 2026"
    status: { type: String, enum: ['PAID', 'PARTIAL', 'UNPAID'], default: 'UNPAID' },
    adjustmentReason: { type: String },
    paymentMethod: { type: String, default: 'Cash' },
    creditAccount: { type: String },
    referenceNo: { type: String },
    senderAccount: { type: String },
    discount: { type: Number, default: 0 },
    orderId: { type: String }, // Cashfree transaction order ID if paid online
    createdAt: { type: Date, default: Date.now }
});

FeeSchema.index({ tenantId: 1, studentId: 1, monthFor: 1 });
FeeSchema.index({ tenantId: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('Fee', FeeSchema);
