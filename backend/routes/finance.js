const express = require('express');
const router = express.Router();
const FinanceConfig = require('../models/FinanceConfig');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Roles allowed to read/write finance configuration and records
const FINANCE_READ = authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'FINANCE_MANAGER', 'RECEPTIONIST');
const FINANCE_WRITE = authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'FINANCE_MANAGER');

// Whitelist of sections the client may read/update
const SECTIONS = [
    'feeTerms',
    'feeTypes',
    'feeRebates',
    'feeGroups',
    'studentFeeGroups',
    'studentBackDues',
    'feePayments',
    'adjustmentRequests',
    'feeRemindersLog'
];

// GET /api/finance/config — full finance config for the caller's tenant
router.get('/finance/config', authenticateToken, FINANCE_READ, async (req, res) => {
    try {
        const config = await FinanceConfig.findOne({ tenantId: req.user.tenantId });
        if (!config) {
            // No document yet: return empty sections so the client can
            // initialize (and optionally migrate legacy localStorage data)
            return res.json({ exists: false, config: null });
        }

        const payload = {};
        SECTIONS.forEach(key => { payload[key] = config[key]; });
        res.json({ exists: true, config: payload });
    } catch (err) {
        console.error('Error fetching finance config:', err);
        res.status(500).json({ error: 'Server error fetching finance configuration.' });
    }
});

// PUT /api/finance/config — upsert one or more sections
router.put('/finance/config', authenticateToken, FINANCE_WRITE, async (req, res) => {
    try {
        const updates = {};
        for (const key of SECTIONS) {
            if (req.body[key] !== undefined) {
                const value = req.body[key];
                const isMap = key === 'studentFeeGroups' || key === 'studentBackDues';
                if (isMap) {
                    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                        return res.status(400).json({ error: `${key} must be an object map.` });
                    }
                } else if (!Array.isArray(value)) {
                    return res.status(400).json({ error: `${key} must be an array.` });
                }
                updates[key] = value;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid finance sections provided.' });
        }

        const config = await FinanceConfig.findOneAndUpdate(
            { tenantId: req.user.tenantId },
            { $set: updates, $setOnInsert: { tenantId: req.user.tenantId } },
            { new: true, upsert: true }
        );

        res.json({ success: true, updated: Object.keys(updates), updatedAt: config.updatedAt });
    } catch (err) {
        console.error('Error saving finance config:', err);
        res.status(500).json({ error: 'Server error saving finance configuration.' });
    }
});

module.exports = router;
