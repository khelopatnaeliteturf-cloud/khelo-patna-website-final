const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subdomain: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    config: {
        theme: { type: String, enum: ['light', 'dark'], default: 'light' },
        currency: { type: String, default: 'INR' },
        logoUrl: { type: String }
    },
    subscription: {
        plan: { type: String, enum: ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'], default: 'FREE' },
        expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // 30 days default
    }
}, { timestamps: true });

module.exports = mongoose.model('Tenant', TenantSchema);
