const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    address: { type: String },
    city: { type: String, default: 'Patna' },
    state: { type: String, default: 'Bihar' },
    contactNumber: { type: String }
}, { timestamps: true });

BranchSchema.index({ tenantId: 1 });

module.exports = mongoose.model('Branch', BranchSchema);
