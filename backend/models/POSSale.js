const mongoose = require('../lib/mongoose-pg-bridge');

const POSSaleSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    soldAt: { type: Date, default: Date.now }
});

POSSaleSchema.index({ tenantId: 1, branchId: 1 });

module.exports = mongoose.model('POSSale', POSSaleSchema);
