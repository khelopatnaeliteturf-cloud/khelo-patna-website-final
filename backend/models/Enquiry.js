const mongoose = require('mongoose');

const EnquirySchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    studentName: { type: String, required: true },
    dateOfBirth: { type: String },
    age: { type: Number },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    schoolName: { type: String },
    classGrade: { type: String },
    fatherName: { type: String },
    mobileNumber: { type: String, required: true },
    interestedIn: { type: String, enum: ['cricket', 'football', ''], default: '' },
    previousExperience: { type: String, enum: ['Yes', 'No', ''], default: '' },
    experienceDetails: { type: String },
    expectedJoiningMonth: { type: String },
    heardAbout: { type: String },
    heardAboutOther: { type: String },
    questions: { type: String },
    source: { type: String, required: true }, // "Public Website" or "Internal - [username]"
    status: { type: String, enum: ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'], default: 'NEW' },
    convertedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
});

EnquirySchema.index({ tenantId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Enquiry', EnquirySchema);
