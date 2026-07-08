const mongoose = require('../lib/mongoose-pg-bridge');

const MapsReviewUsedSchema = new mongoose.Schema({
    text: { type: String, required: true },
    rating: { type: Number, required: true },
    ip: { type: String },
    userAgent: { type: String },
    device: { type: String },
    browser: { type: String },
    os: { type: String },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: false
});

module.exports = mongoose.model('MapsReviewUsed', MapsReviewUsedSchema);
