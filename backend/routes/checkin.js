const express = require('express');
const router = express.Router();
const CheckInLog = require('../models/CheckInLog');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// 1. Check-In Player
router.post('/checkin', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), async (req, res) => {
    const { bookingId, studentId, playerName, type } = req.body;
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;

    if (!playerName || !type) {
        return res.status(400).json({ error: 'Player name and type (TURF_BOOKING / ACADEMY_STUDENT) are required.' });
    }

    try {
        const log = new CheckInLog({
            tenantId,
            branchId,
            bookingId: bookingId || undefined,
            studentId: studentId || undefined,
            playerName,
            type,
            checkInTime: new Date()
        });

        await log.save();

        // If it's an academy student check-in, automatically log their daily attendance as PRESENT
        if (type === 'ACADEMY_STUDENT' && studentId) {
            const todayStr = new Date().toISOString().split('T')[0];
            const existingAttendance = await Attendance.findOne({ tenantId, studentId, date: todayStr });
            if (!existingAttendance) {
                const attendance = new Attendance({
                    tenantId,
                    branchId,
                    studentId,
                    date: todayStr,
                    status: 'PRESENT'
                });
                await attendance.save();
            }
        }

        res.status(201).json({
            success: true,
            message: `${playerName} successfully checked in.`,
            log
        });

    } catch (err) {
        console.error('Error logging check-in:', err);
        res.status(500).json({ error: 'Server error during check-in.' });
    }
});

// 2. Check-Out Player
router.post('/checkout', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), async (req, res) => {
    const { logId } = req.body;
    const tenantId = req.user.tenantId;

    if (!logId) {
        return res.status(400).json({ error: 'Check-in Log ID is required.' });
    }

    try {
        const log = await CheckInLog.findOne({ _id: logId, tenantId });
        if (!log) {
            return res.status(404).json({ error: 'Check-in record not found.' });
        }

        if (log.checkOutTime) {
            return res.status(400).json({ error: 'Player has already checked out.' });
        }

        log.checkOutTime = new Date();
        await log.save();

        res.json({
            success: true,
            message: `${log.playerName} successfully checked out.`,
            log
        });

    } catch (err) {
        console.error('Error logging check-out:', err);
        res.status(500).json({ error: 'Server error during check-out.' });
    }
});

// 3. List Active Players inside Arena (staff only — not PARENT/MEMBER tokens)
router.get('/checkin/active', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST', 'GROUND_MANAGER', 'COACH'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const activeLogs = await CheckInLog.find({ tenantId, checkOutTime: null })
            .populate('bookingId', 'sport timeSlots')
            .populate('studentId', 'sport batchTime')
            .sort({ checkInTime: -1 });
        
        res.json(activeLogs);
    } catch (err) {
        console.error('Error listing active check-ins:', err);
        res.status(500).json({ error: 'Server error loading active players.' });
    }
});

module.exports = router;
