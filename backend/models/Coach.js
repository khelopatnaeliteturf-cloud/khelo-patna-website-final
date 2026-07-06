const mongoose = require('../lib/mongoose-pg-bridge');

const CoachSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    sports: [{ type: String }], // Array of sports they coach (e.g. Football, Cricket)
    salary: { type: Number, default: 0 },
    schedule: { type: String }, // e.g. "Mon-Fri 06:00-08:00 AM"
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    rating: { type: Number, default: 5 },
    joiningDate: { type: Date, default: Date.now }
}, { timestamps: true });

CoachSchema.index({ tenantId: 1, branchId: 1 });

module.exports = mongoose.model('Coach', CoachSchema);
