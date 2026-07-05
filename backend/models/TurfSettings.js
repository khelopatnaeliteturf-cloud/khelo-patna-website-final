const mongoose = require('mongoose');

const TurfSettingsSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    cricketBaseRate: { type: Number, default: 1000 },
    footballBaseRate: { type: Number, default: 1200 },
    netsBaseRate: { type: Number, default: 800 },
    blackoutHours: {
        start: { type: Number, default: 15 }, // 3 PM
        end: { type: Number, default: 19 }    // 7 PM
    },
    weeklyRates: {
        cricket: { type: [Number], default: [1000, 1000, 1000, 1000, 1000, 1000, 1000] },
        football: { type: [Number], default: [1200, 1200, 1200, 1200, 1200, 1200, 1200] },
        nets: { type: [Number], default: [800, 800, 800, 800, 800, 800, 800] }
    }
});

TurfSettingsSchema.index({ tenantId: 1, branchId: 1 });

module.exports = mongoose.model('TurfSettings', TurfSettingsSchema);
