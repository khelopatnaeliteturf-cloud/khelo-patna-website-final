const mongoose = require('../lib/mongoose-pg-bridge');

const SessionSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true }, // e.g. "2025-2026", "Summer Camp 2026"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'], default: 'ACTIVE' }
}, { timestamps: true });

SessionSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Session', SessionSchema);
