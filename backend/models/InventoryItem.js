const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    itemName: { type: String, required: true },
    category: { type: String, required: true }, // allow custom categories as requested
    totalQuantity: { type: Number, required: true },
    availableQuantity: { type: Number, required: true },
    condition: { type: String, enum: ['GOOD', 'DAMAGED', 'LOST'], default: 'GOOD' }
}, { timestamps: true });

InventoryItemSchema.index({ tenantId: 1, branchId: 1 });

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
