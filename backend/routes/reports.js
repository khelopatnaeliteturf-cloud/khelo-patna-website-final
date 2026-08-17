const express = require('express');
const router = express.Router();
const mongoose = require('../lib/mongoose-pg-bridge');
const Booking = require('../models/Booking');
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const POSSale = require('../models/POSSale');
const InventoryItem = require('../models/InventoryItem');
const CheckInLog = require('../models/CheckInLog');
const Attendance = require('../models/Attendance');
const TurfClosure = require('../models/TurfClosure');
const Enquiry = require('../models/Enquiry');
const Tenant = require('../models/Tenant');
const Coach = require('../models/Coach');
const { getStatus, getBotEnabled, getQR, setBotEnabled, forceReconnect, sendWhatsAppMessage } = require('../services/whatsapp');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Helper: Get start & end dates of today
const getTodayRange = () => {
    const start = new Date();
    start.setHours(0,0,0,0);
    const end = new Date();
    end.setHours(23,59,59,999);
    return { start, end };
};

// 1. Admin Dashboard Summary Statistics (Multi-tenant isolated)
router.get('/reports/dashboard', authenticateToken, authorizeRoles('RECEPTIONIST', 'FINANCE_MANAGER', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const branchId = req.user.branchId;
        const { start: todayStart, end: todayEnd } = getTodayRange();
        const todayStr = new Date().toISOString().split('T')[0];
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            todayBookingsCount,
            checkedInCount,
            activeStudentsCount,
            criticalItems,
            bookingsRevenue,
            feesRevenue,
            posRevenue,
            todayBookings
        ] = await Promise.all([
            Booking.countDocuments({ tenantId, date: todayStr, paymentStatus: 'SUCCESS' }),
            CheckInLog.countDocuments({ tenantId, checkInTime: { $gte: todayStart, $lte: todayEnd } }),
            Student.countDocuments({ tenantId, status: 'ACTIVE' }),
            InventoryItem.find({ tenantId, availableQuantity: { $lte: 3 } }).select('itemName availableQuantity'),
            Booking.aggregate([
                { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: startOfMonth }, paymentStatus: 'SUCCESS' } },
                { $group: { _id: null, total: { $sum: '$paidAmount' } } }
            ]),
            Fee.aggregate([
                { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), paymentDate: { $gte: startOfMonth }, status: 'PAID' } },
                { $group: { _id: null, total: { $sum: '$amountPaid' } } }
            ]),
            POSSale.aggregate([
                { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), soldAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$totalPrice' } } }
            ]),
            Booking.find({ tenantId, date: todayStr, paymentStatus: 'SUCCESS' }).sort({ timeSlots: 1 })
        ]);

        const monthlyBookingTotal = bookingsRevenue[0]?.total || 0;
        const monthlyFeeTotal = feesRevenue[0]?.total || 0;
        const monthlyPosTotal = posRevenue[0]?.total || 0;
        const totalRevenueThisMonth = monthlyBookingTotal + monthlyFeeTotal + monthlyPosTotal;

        // Today's Revenue Calculations
        const todayBookingsRevenue = await Booking.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: todayStart, $lte: todayEnd }, paymentStatus: 'SUCCESS' } },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } }
        ]);

        const todayFeesRevenue = await Fee.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), paymentDate: { $gte: todayStart, $lte: todayEnd }, status: 'PAID' } },
            { $group: { _id: null, total: { $sum: '$amountPaid' } } }
        ]);

        const todayPosRevenue = await POSSale.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), soldAt: { $gte: todayStart, $lte: todayEnd } } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);

        const todayBookingTotal = todayBookingsRevenue[0]?.total || 0;
        const todayFeeTotal = todayFeesRevenue[0]?.total || 0;
        const todayPosTotal = todayPosRevenue[0]?.total || 0;
        const totalRevenueToday = todayBookingTotal + todayFeeTotal + todayPosTotal;

        // 1. Attendance stats
        const todayPresent = await Attendance.countDocuments({ tenantId, date: todayStr, status: 'PRESENT' });
        const todayAbsent = await Attendance.countDocuments({ tenantId, date: todayStr, status: 'ABSENT' });
        const totalMarked = todayPresent + todayAbsent;
        const todayAttendancePercent = totalMarked > 0 ? Math.round((todayPresent / totalMarked) * 100) : 0;

        // 2. New Admissions Today
        const newAdmissionsToday = await Student.countDocuments({
            tenantId,
            admissionDate: { $gte: todayStart, $lte: todayEnd }
        });

        // 3. Birthdays Today
        const todayMonthDay = new Date().toISOString().substring(5, 10); // "MM-DD"
        const birthdayRegex = new RegExp(`-${todayMonthDay}$`);
        const birthdayStudentsList = await Student.find({
            tenantId,
            dateOfBirth: { $regex: birthdayRegex },
            status: 'ACTIVE'
        }).select('name sport dateOfBirth age');

        // 4. Upcoming Turf Closures
        const upcomingClosures = await TurfClosure.find({
            tenantId,
            endDate: { $gte: todayStart }
        }).sort({ startDate: 1 }).limit(5);

        // 5. Upcoming Bookings List
        const upcomingBookingsList = await Booking.find({
            tenantId,
            date: { $gte: todayStr },
            paymentStatus: 'SUCCESS'
        }).sort({ date: 1, timeSlots: 1 }).limit(5);

        // 6. Latest Enquiries List
        const latestEnquiriesList = await Enquiry.find({ tenantId })
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            today_bookings: todayBookingsCount,
            today_checkins: checkedInCount,
            active_students: activeStudentsCount,
            whatsapp_status: getStatus(),
            whatsapp_bot_enabled: getBotEnabled(),
            critical_stock_count: criticalItems.length,
            critical_stock_items: criticalItems,
            today_revenue: totalRevenueToday,
            total_students: activeStudentsCount,
            today_attendance_percent: todayAttendancePercent,
            today_present: todayPresent,
            today_absent: todayAbsent,
            today_summary: {
                fees_collected: todayFeeTotal,
                new_admissions: newAdmissionsToday,
                birthdays_count: birthdayStudentsList.length
            },
            birthdays_today: birthdayStudentsList,
            upcoming_events: upcomingClosures.map(c => ({
                id: c._id,
                reason: c.reason || 'Maintenance Closure',
                startDate: c.startDate,
                endDate: c.endDate
            })),
            upcoming_bookings: upcomingBookingsList.map(b => ({
                id: b._id,
                customerName: b.customerName,
                customerPhone: b.customerPhone,
                date: b.date,
                timeSlots: b.timeSlots,
                sport: b.sport
            })),
            latest_enquiries: latestEnquiriesList.map(e => ({
                id: e._id,
                studentName: e.studentName,
                interestedIn: e.interestedIn,
                mobileNumber: e.mobileNumber,
                source: e.source,
                createdAt: e.createdAt
            })),
            finances: {
                bookings: monthlyBookingTotal,
                fees: monthlyFeeTotal,
                pos: monthlyPosTotal,
                total: totalRevenueThisMonth
            }
        });

    } catch (err) {
        console.error('Error compiling dashboard stats:', err);
        res.status(500).json({ error: 'Server error loading stats.' });
    }
});

// 2. Bookings Log Report
router.get('/reports/bookings', authenticateToken, authorizeRoles('BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { startDate, endDate, sport, paymentStatus } = req.query;
    const query = { tenantId: req.user.tenantId };

    if (sport) query.sport = sport;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate || endDate) {
        const startStr = startDate ? startDate : '1970-01-01';
        const endStr = endDate ? endDate : '2099-12-31';

        query.$or = [
            {
                date: {
                    ...(startDate ? { $gte: startStr } : {}),
                    ...(endDate ? { $lte: endStr } : {})
                }
            },
            {
                createdAt: {
                    ...(startDate ? { $gte: new Date(startDate) } : {}),
                    ...(endDate ? { $lte: new Date(endDate + 'T23:59:59') } : {})
                }
            }
        ];
    }

    try {
        const bookings = await Booking.find(query).sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        console.error('Error fetching bookings report:', err);
        res.status(500).json({ error: 'Server error loading bookings report.' });
    }
});

// 3. Inventory Sales Report
router.get('/reports/sales', authenticateToken, authorizeRoles('BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { startDate, endDate, itemId } = req.query;
    const query = { tenantId: req.user.tenantId };

    if (itemId) query.itemId = itemId;

    if (startDate || endDate) {
        query.soldAt = {};
        if (startDate) query.soldAt.$gte = new Date(startDate);
        if (endDate) query.soldAt.$lte = new Date(endDate + 'T23:59:59');
    }

    try {
        const sales = await POSSale.find(query)
            .populate('itemId', 'itemName category')
            .sort({ soldAt: -1 });
        res.json(sales);
    } catch (err) {
        console.error('Error loading inventory sales report:', err);
        res.status(500).json({ error: 'Server error loading sales report.' });
    }
});

// 4. Academy Fees Report
router.get('/reports/fees', authenticateToken, authorizeRoles('RECEPTIONIST', 'FINANCE_MANAGER', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { status, monthFor } = req.query;
    const query = { tenantId: req.user.tenantId };

    if (status) query.status = status;
    if (monthFor) query.monthFor = monthFor;

    try {
        const feeRecords = await Fee.find(query)
            .populate('studentId', 'name sport phone parentName')
            .sort({ dueDate: 1 });

        let totalPaid = 0;
        let totalDue = 0;

        feeRecords.forEach(record => {
            totalPaid += record.amountPaid;
            totalDue += (record.amountDue - record.amountPaid);
        });

        res.json({
            totals: {
                paid: totalPaid,
                due: totalDue,
                grand_total: totalPaid + totalDue
            },
            invoices: feeRecords
        });

    } catch (err) {
        console.error('Error compiling fee reports:', err);
        res.status(500).json({ error: 'Server error loading fee reports.' });
    }
});

// 5. Month-wise Revenue Aggregation Chart Data
router.get('/reports/revenue-analytics', authenticateToken, authorizeRoles('FINANCE_MANAGER', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0,0,0,0);

        const bookingsGrouped = await Booking.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: sixMonthsAgo }, paymentStatus: 'SUCCESS' } },
            { 
                $group: { 
                    _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, 
                    total: { $sum: '$paidAmount' } 
                } 
            }
        ]);

        const feesGrouped = await Fee.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), paymentDate: { $gte: sixMonthsAgo }, status: 'PAID' } },
            { 
                $group: { 
                    _id: { month: { $month: '$paymentDate' }, year: { $year: '$paymentDate' } }, 
                    total: { $sum: '$amountPaid' } 
                } 
            }
        ]);

        const posGrouped = await POSSale.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), soldAt: { $gte: sixMonthsAgo } } },
            { 
                $group: { 
                    _id: { month: { $month: '$soldAt' }, year: { $year: '$soldAt' } }, 
                    total: { $sum: '$totalPrice' } 
                } 
            }
        ]);

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const mergedData = [];

        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const m = date.getMonth() + 1;
            const y = date.getFullYear();
            const monthLabel = `${monthNames[m - 1]} ${y}`;

            const bookingItem = bookingsGrouped.find(b => b._id.month === m && b._id.year === y);
            const feeItem = feesGrouped.find(f => f._id.month === m && f._id.year === y);
            const posItem = posGrouped.find(p => p._id.month === m && p._id.year === y);

            const bRev = bookingItem?.total || 0;
            const fRev = feeItem?.total || 0;
            const pRev = posItem?.total || 0;

            // Calculate active coaches' salary sum for this specific month
            const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
            const activeCoaches = await Coach.find({
                tenantId: new mongoose.Types.ObjectId(tenantId),
                joiningDate: { $lte: monthEnd },
                status: 'ACTIVE'
            });
            const monthlyCoachExpense = activeCoaches.reduce((sum, c) => sum + (c.salary || 0), 0);

            mergedData.unshift({
                month: monthLabel,
                bookings: bRev,
                fees: fRev,
                pos: pRev,
                coachExpense: monthlyCoachExpense,
                total: bRev + fRev + pRev
            });
        }

        res.json(mergedData);

    } catch (err) {
        console.error('Error generating revenue analytics:', err);
        res.status(500).json({ error: 'Server error calculating revenue analytics.' });
    }
});

// 5b. WhatsApp Gateway Management Endpoints
router.get('/admin/whatsapp/status', authenticateToken, (req, res) => {
    res.json({
        status: getStatus(), // 'CONNECTED', 'DISCONNECTED', 'CONNECTING', 'DISABLED'
        qr: getQR(),
        bot_enabled: getBotEnabled()
    });
});

router.post('/admin/whatsapp/toggle-bot', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), (req, res) => {
    const { enabled } = req.body;
    setBotEnabled(Boolean(enabled));
    res.json({ success: true, bot_enabled: getBotEnabled() });
});

router.post('/admin/whatsapp/reconnect', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), (req, res) => {
    forceReconnect();
    res.json({ success: true, message: 'Reconnection initiated.' });
});

// Incoming Webhook for external Baileys microservice
const { handleIncomingWebhook } = require('../services/botStates');

router.post('/whatsapp/webhook', (req, res) => {
    const { phone, text, secret } = req.body;
    const apiSecret = process.env.WA_API_SECRET;
    if (apiSecret && secret !== apiSecret && req.headers['x-wa-secret'] !== apiSecret) {
        return res.status(403).json({ error: 'Unauthorized webhook call.' });
    }
    const incomingText = text || req.body.message;
    if (!phone || !incomingText) {
        return res.status(400).json({ error: 'phone and text/message are required.' });
    }

    // Immediately respond 200 OK to microservice to avoid 502/500 gateway timeouts
    res.json({ success: true, status: 'QUEUED' });

    // Process bot logic asynchronously in background
    setImmediate(async () => {
        try {
            await handleIncomingWebhook({ phone, text: incomingText });
        } catch (err) {
            console.error('[WhatsApp Webhook Async Error]:', err.message || err);
        }
    });
});

// 6. Send Single WhatsApp Message
router.post('/admin/communicate/send-whatsapp', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone number and message are required.' });
    }
    try {
        const success = await sendWhatsAppMessage(phone, message);
        if (success) {
            res.json({ success: true, message: 'Message sent successfully.' });
        } else {
            res.status(500).json({ error: 'Failed to send WhatsApp message. Ensure bot is connected.' });
        }
    } catch (err) {
        console.error('WhatsApp send error:', err);
        res.status(500).json({ error: 'Server error sending message.' });
    }
});

// 7. Send Group WhatsApp Message
router.post('/admin/communicate/send-group-whatsapp', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { groupType, message } = req.body;
    const tenantId = req.user.tenantId;

    if (!groupType || !message) {
        return res.status(400).json({ error: 'Group type and message are required.' });
    }
    try {
        let phones = [];
        if (groupType === 'cricket' || groupType === 'football') {
            const students = await Student.find({ tenantId, sport: groupType, status: 'ACTIVE' }).select('phone fatherMobile motherMobile');
            students.forEach(s => {
                const phone = s.fatherMobile || s.motherMobile || s.phone;
                if (phone) phones.push(phone);
            });
        } else if (groupType === 'all_students') {
            const students = await Student.find({ tenantId, status: 'ACTIVE' }).select('phone fatherMobile motherMobile');
            students.forEach(s => {
                const phone = s.fatherMobile || s.motherMobile || s.phone;
                if (phone) phones.push(phone);
            });
        }

        phones = [...new Set(phones)];

        if (phones.length === 0) {
            return res.status(404).json({ error: 'No phone numbers found for the selected group.' });
        }

        let successCount = 0;
        for (const phone of phones) {
            const success = await sendWhatsAppMessage(phone, message);
            if (success) successCount++;
        }

        res.json({ success: true, total: phones.length, sent: successCount });
    } catch (err) {
        console.error('WhatsApp group send error:', err);
        res.status(500).json({ error: 'Server error sending group message.' });
    }
});

// 7b. Get Communication Logs (Email & WhatsApp logs)
router.get('/admin/communicate/logs', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const tenantId = req.user.tenantId;
    const { type, status, search, limit = 100, page = 1 } = req.query;

    try {
        const CommunicationLog = require('../models/CommunicationLog');
        const query = {};

        if (tenantId) {
            query.$or = [
                { tenantId: tenantId },
                { tenantId: tenantId.toString() },
                { tenantId: null },
                { tenantId: { $exists: false } }
            ];
        }

        if (type) {
            query.type = type; // EMAIL or WHATSAPP
        }
        if (status) {
            query.status = status; // SENT or FAILED
        }
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            const searchOr = [
                { recipient: searchRegex },
                { subject: searchRegex },
                { content: searchRegex }
            ];
            if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: searchOr }
                ];
                delete query.$or;
            } else {
                query.$or = searchOr;
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const logs = await CommunicationLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await CommunicationLog.countDocuments(query);

        res.json({
            success: true,
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Error fetching communication logs:', err);
        res.status(500).json({ error: 'Server error fetching communication logs.' });
    }
});

// 8. Public Enquiry submission
router.post('/public/enquiries', async (req, res) => {
    try {
        const {
            studentName,
            dateOfBirth,
            age,
            gender,
            schoolName,
            classGrade,
            fatherName,
            mobileNumber,
            interestedIn,
            previousExperience,
            experienceDetails,
            expectedJoiningMonth,
            heardAbout,
            heardAboutOther,
            questions,
            subdomain
        } = req.body;

        if (!studentName || !mobileNumber) {
            return res.status(400).json({ error: 'Student Name and Mobile Number are required.' });
        }

        let tenantId = null;
        if (subdomain) {
            const tenant = await Tenant.findOne({ subdomain });
            if (tenant) tenantId = tenant._id;
        }

        const newEnquiry = new Enquiry({
            tenantId,
            studentName,
            dateOfBirth,
            age,
            gender: gender || '',
            schoolName,
            classGrade,
            fatherName,
            mobileNumber,
            interestedIn: interestedIn || '',
            previousExperience: previousExperience || '',
            experienceDetails,
            expectedJoiningMonth,
            heardAbout,
            heardAboutOther,
            questions,
            source: 'Public Website'
        });

        await newEnquiry.save();
        res.status(201).json({ success: true, message: 'Enquiry submitted successfully!' });
    } catch (err) {
        console.error('Error saving public enquiry:', err);
        res.status(500).json({ error: 'Server error saving enquiry.' });
    }
});

// 9. Internal Enquiry submission
router.post('/admin/enquiries', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const {
            studentName,
            dateOfBirth,
            age,
            gender,
            schoolName,
            classGrade,
            fatherName,
            mobileNumber,
            interestedIn,
            previousExperience,
            experienceDetails,
            expectedJoiningMonth,
            heardAbout,
            heardAboutOther,
            questions
        } = req.body;

        if (!studentName || !mobileNumber) {
            return res.status(400).json({ error: 'Student Name and Mobile Number are required.' });
        }

        const tenantId = req.user.tenantId;
        const branchId = req.user.branchId;
        const username = req.user.username || 'Counsellor';

        const newEnquiry = new Enquiry({
            tenantId,
            branchId,
            studentName,
            dateOfBirth,
            age,
            gender: gender || '',
            schoolName,
            classGrade,
            fatherName,
            mobileNumber,
            interestedIn: interestedIn || '',
            previousExperience: previousExperience || '',
            experienceDetails,
            expectedJoiningMonth,
            heardAbout,
            heardAboutOther,
            questions,
            source: `Internal - ${username}`
        });

        await newEnquiry.save();
        res.status(201).json({ success: true, message: 'Enquiry logged successfully!' });
    } catch (err) {
        console.error('Error saving internal enquiry:', err);
        res.status(500).json({ error: 'Server error saving enquiry.' });
    }
});

// 10. Get all enquiries
router.get('/admin/enquiries', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const enquiries = await Enquiry.find({ tenantId }).sort({ createdAt: -1 });
        res.json(enquiries);
    } catch (err) {
        console.error('Error fetching enquiries:', err);
        res.status(500).json({ error: 'Server error loading enquiries.' });
    }
});

// GET /api/reports/integrations (diagnostic tool to monitor external service connections status)
router.get('/reports/integrations', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER'), async (req, res) => {
    try {
        const statuses = [];

        // 1. MongoDB Database
        const dbState = mongoose.connection.readyState;
        statuses.push({
            name: 'MongoDB Database',
            status: dbState === 1 ? 'HEALTHY' : 'ERROR',
            details: dbState === 1 ? 'Connected to local/cloud instance' : 'Disconnected',
            badge: dbState === 1 ? 'success' : 'danger',
            mock: false
        });

        // 2. Cashfree Payment Gateway
        const cfConfigured = !!(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
        statuses.push({
            name: 'Cashfree PG',
            status: cfConfigured ? 'HEALTHY' : 'WARNING',
            details: cfConfigured ? `Configured in ${process.env.CASHFREE_ENV || 'sandbox'} environment` : 'Sandbox Mock Mode (credentials missing)',
            badge: cfConfigured ? 'success' : 'warning',
            mock: !cfConfigured
        });

        // 2b. PhonePe Payment Gateway
        const ppConfigured = !!(process.env.PHONEPE_MERCHANT_ID && process.env.PHONEPE_SALT_KEY);
        statuses.push({
            name: 'PhonePe PG',
            status: ppConfigured ? 'HEALTHY' : 'WARNING',
            details: ppConfigured ? `Configured in ${process.env.PHONEPE_ENV || 'sandbox'} environment` : 'Sandbox Mock Mode (Merchant ID missing)',
            badge: ppConfigured ? 'success' : 'warning',
            mock: !ppConfigured
        });

        // 3. Cloudinary Asset Storage
        const clConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
        statuses.push({
            name: 'Cloudinary CDN',
            status: clConfigured ? 'HEALTHY' : 'WARNING',
            details: clConfigured ? 'Configured for document attachments' : 'Mock Upload Mode (assets stored as simulation links)',
            badge: clConfigured ? 'success' : 'warning',
            mock: !clConfigured
        });

        // 4. Brevo Email Engine
        const brevoConfigured = !!process.env.BREVO_API_KEY;
        statuses.push({
            name: 'Brevo Email',
            status: brevoConfigured ? 'HEALTHY' : 'WARNING',
            details: brevoConfigured ? 'Brevo HTTPS API connection configured & active' : 'Mock Mode (emails print to console logs). Add BREVO_API_KEY to go live.',
            badge: brevoConfigured ? 'success' : 'warning',
            mock: !brevoConfigured
        });

        // 5. WhatsApp Client (via Baileys)
        const waStatus = getStatus(); // CONNECTED, CONNECTING, DISCONNECTED, DISABLED
        let waBadge = 'danger';
        let waDetails = 'Disconnected';
        if (waStatus === 'CONNECTED') {
            waBadge = 'success';
            waDetails = 'Connected and listening for messages';
        } else if (waStatus === 'CONNECTING') {
            waBadge = 'warning';
            waDetails = 'Re-establishing session connection...';
        } else if (waStatus === 'DISABLED') {
            waBadge = 'warning';
            waDetails = 'Disabled via environment flag (WHATSAPP_ENABLED=false)';
        }

        statuses.push({
            name: 'WhatsApp Service (Baileys)',
            status: waStatus,
            details: waDetails,
            badge: waBadge,
            mock: false,
            botEnabled: getBotEnabled()
        });

        res.json({ success: true, integrations: statuses });
    } catch (err) {
        console.error('Integrations diagnostic error:', err);
        res.status(500).json({ error: 'Failed to run integrations diagnostic.' });
    }
});

module.exports = router;
