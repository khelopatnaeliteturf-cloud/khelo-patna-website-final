const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: String, required: true }, // Username or user ID
    module: { type: String, required: true }, // e.g. "Members", "Turf", "Finance"
    action: { type: String, required: true }, // e.g. "CREATE_MEMBER", "UPDATE_BOOKING"
    oldData: { type: mongoose.Schema.Types.Mixed },
    newData: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

AuditLogSchema.index({ tenantId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
