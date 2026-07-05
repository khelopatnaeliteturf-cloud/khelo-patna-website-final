const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const StaffSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    username: { type: String, required: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'FINANCE_MANAGER', 'RECEPTIONIST', 'COACH', 'GROUND_MANAGER', 'HR_MANAGER', 'PARENT', 'MEMBER'], 
        required: true 
    },
    createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to hash password
StaffSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
StaffSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Multi-tenant indexes
StaffSchema.index({ tenantId: 1, branchId: 1 });
StaffSchema.index({ tenantId: 1, username: 1 }, { unique: true });

module.exports = mongoose.model('Staff', StaffSchema);
