const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    membershipId: { type: String },
    name: { type: String, required: true },
    parentName: { type: String }, // legacy field compatibility
    email: { type: String },
    phone: { type: String }, // legacy field compatibility
    dateOfBirth: { type: String, required: true },
    age: { type: Number },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
    bloodGroup: { type: String },
    schoolName: { type: String },
    classGrade: { type: String },
    residentialAddress: { type: String },
    city: { type: String },
    pinCode: { type: String },
    fatherName: { type: String },
    motherName: { type: String },
    fatherMobile: { type: String },
    motherMobile: { type: String },
    guardianName: { type: String },
    guardianMobile: { type: String },
    previousExperience: { type: String, enum: ['Yes', 'No'], default: 'No' },
    experienceDetails: { type: String },
    medicalConditions: { type: String },
    sport: { type: String, required: true },
    admissionDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'DROPOUT'], default: 'ACTIVE' },
    batchTime: { type: String, required: true }, // e.g. "06:00-08:00 AM"
    oneTimeAdmissionFee: { type: Number, default: 1500 },
    monthlyFee: { type: Number, default: 2000 },
    adjustedFee: { type: Number },
    currentSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    documents: {
        photoUrl: { type: String },
        aadhaarUrl: { type: String },
        birthCertUrl: { type: String },
        medicalCertUrl: { type: String }
    }
}, { timestamps: true });

// Multi-tenant indexes
StudentSchema.index({ tenantId: 1, branchId: 1 });
StudentSchema.index({ tenantId: 1, membershipId: 1 }, { unique: true, sparse: true });
StudentSchema.index({ name: 'text', membershipId: 'text', phone: 'text' });

module.exports = mongoose.model('Student', StudentSchema);

