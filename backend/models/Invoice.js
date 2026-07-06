const mongoose = require('../lib/mongoose-pg-bridge');

const InvoiceSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, // ref to Student (Member)
    orderId: { type: String, required: true, unique: true }, // Cashfree order ID matching
    amount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    status: { type: String, enum: ['PAID', 'UNPAID', 'PARTIAL', 'CANCELLED'], default: 'UNPAID' },
    dueDate: { type: Date, required: true },
    monthFor: { type: String }, // e.g. "June 2026"
    paymentDate: { type: Date },
    paymentMethod: { type: String, enum: ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'ONLINE'], default: 'ONLINE' },
    feeComponents: {
        registrationFee: { type: Number, default: 0 },
        membershipFee: { type: Number, default: 0 },
        trainingFee: { type: Number, default: 0 },
        tournamentFee: { type: Number, default: 0 },
        kitFee: { type: Number, default: 0 },
        groundFee: { type: Number, default: 0 }
    },
    remarks: { type: String }
}, { timestamps: true });

InvoiceSchema.index({ tenantId: 1, branchId: 1 });
InvoiceSchema.index({ memberId: 1 });
InvoiceSchema.index({ orderId: 1 });

module.exports = mongoose.model('Invoice', InvoiceSchema);
