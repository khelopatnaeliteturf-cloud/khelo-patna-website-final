const mongoose = require('mongoose');

const TurfClosureSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    recurringDay: { type: Number }, // 0 = Sunday, 6 = Saturday (optional)
    reason: { type: String }
});

TurfClosureSchema.index({ tenantId: 1, branchId: 1 });

module.exports = mongoose.model('TurfClosure', TurfClosureSchema);
