const mongoose = require('../lib/mongoose-pg-bridge');

/**
 * Per-tenant finance configuration and records.
 *
 * This replaces the browser-localStorage persistence previously used by the
 * admin Fee Management module (kp_fee_terms, kp_fee_payments, etc.), which
 * silently lost business data across devices and browser resets.
 *
 * Sections mirror the admin UI state shapes exactly so the frontend can
 * load/save them without transformation.
 */
const FinanceConfigSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },

    // Academic/billing terms: [{ id, name, startDate, endDate, status }]
    feeTerms: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // Fee types: [{ id, name, amount, frequency, description }]
    feeTypes: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // Rebates/discounts: [{ id, name, type, value, description }]
    feeRebates: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // Fee groups: [{ id, name, feeTypeIds, description }]
    feeGroups: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // Map: studentId -> feeGroupId
    studentFeeGroups: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Map: studentId -> back dues amount
    studentBackDues: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Recorded payments: [{ id, studentId, amount, date, ... }]
    feePayments: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // Adjustment requests: [{ id, studentId, studentName, amount, reason, status }]
    adjustmentRequests: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // Reminder log: [{ id, studentId, sentAt, ... }]
    feeRemindersLog: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true, minimize: false });

module.exports = mongoose.model('FinanceConfig', FinanceConfigSchema);
