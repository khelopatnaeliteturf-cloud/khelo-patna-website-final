const mongoose = require('../lib/mongoose-pg-bridge');

const CheckInLogSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    playerName: { type: String, required: true },
    type: { type: String, enum: ['TURF_BOOKING', 'ACADEMY_STUDENT'], required: true },
    checkInTime: { type: Date, default: Date.now },
    checkOutTime: { type: Date }
});

CheckInLogSchema.index({ tenantId: 1, branchId: 1 });

module.exports = mongoose.model('CheckInLog', CheckInLogSchema);
