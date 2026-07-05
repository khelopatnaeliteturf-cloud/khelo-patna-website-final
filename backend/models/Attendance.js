const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, enum: ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'], required: true },
    markedAt: { type: Date, default: Date.now }
});

AttendanceSchema.index({ tenantId: 1, branchId: 1 });
AttendanceSchema.index({ tenantId: 1, date: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
