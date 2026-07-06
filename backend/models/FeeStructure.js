const mongoose = require('../lib/mongoose-pg-bridge');

const FeeStructureSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    sport: { type: String, enum: ['cricket', 'football', 'all'], default: 'all' },
    oneTimeAdmissionFee: { type: Number, default: 1500 },
    monthlyFee: { type: Number, required: true },
    lateFeePenalty: { type: Number, default: 0 },
    dueDayOfMonth: { type: Number, default: 5, min: 1, max: 28 },
    isActive: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});

FeeStructureSchema.index({ tenantId: 1, sport: 1, isActive: 1 });

module.exports = mongoose.model('FeeStructure', FeeStructureSchema);
