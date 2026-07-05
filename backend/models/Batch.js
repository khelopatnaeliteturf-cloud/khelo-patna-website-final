const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true }, // e.g., "Morning Elite Under-16"
    sport: { type: String, required: true }, // e.g., "cricket", "football"
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },
    groundId: { type: String }, // e.g., "Turf A"
    capacity: { type: Number, default: 20 },
    startTime: { type: String, required: true }, // e.g., "06:00 AM"
    endTime: { type: String, required: true }, // e.g., "08:00 AM"
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }] // List of members assigned
}, { timestamps: true });

BatchSchema.index({ tenantId: 1, branchId: 1 });
BatchSchema.index({ sessionId: 1 });

module.exports = mongoose.model('Batch', BatchSchema);
