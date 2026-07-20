const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const TurfSettings = require('../models/TurfSettings');
const TurfClosure = require('../models/TurfClosure');
const Tenant = require('../models/Tenant');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

const ALL_HOURLY_SLOTS = [
    { value: '00-01', text: '12:00 AM - 01:00 AM', startHour: 0, endHour: 1 },
    { value: '01-02', text: '01:00 AM - 02:00 AM', startHour: 1, endHour: 2 },
    { value: '02-03', text: '02:00 AM - 03:00 AM', startHour: 2, endHour: 3 },
    { value: '03-04', text: '03:00 AM - 04:00 AM', startHour: 3, endHour: 4 },
    { value: '04-05', text: '04:00 AM - 05:00 AM', startHour: 4, endHour: 5 },
    { value: '05-06', text: '05:00 AM - 06:00 AM', startHour: 5, endHour: 6 },
    { value: '06-07', text: '06:00 AM - 07:00 AM', startHour: 6, endHour: 7 },
    { value: '07-08', text: '07:00 AM - 08:00 AM', startHour: 7, endHour: 8 },
    { value: '08-09', text: '08:00 AM - 09:00 AM', startHour: 8, endHour: 9 },
    { value: '09-10', text: '09:00 AM - 10:00 AM', startHour: 9, endHour: 10 },
    { value: '10-11', text: '10:00 AM - 11:00 AM', startHour: 10, endHour: 11 },
    { value: '11-12', text: '11:00 AM - 12:00 PM', startHour: 11, endHour: 12 },
    { value: '12-13', text: '12:00 PM - 01:00 PM', startHour: 12, endHour: 13 },
    { value: '13-14', text: '01:00 PM - 02:00 PM', startHour: 13, endHour: 14 },
    { value: '14-15', text: '02:00 PM - 03:00 PM', startHour: 14, endHour: 15 },
    { value: '15-16', text: '03:00 PM - 04:00 PM', startHour: 15, endHour: 16 },
    { value: '16-17', text: '04:00 PM - 05:00 PM', startHour: 16, endHour: 17 },
    { value: '17-18', text: '05:00 PM - 06:00 PM', startHour: 17, endHour: 18 },
    { value: '18-19', text: '06:00 PM - 07:00 PM', startHour: 18, endHour: 19 },
    { value: '19-20', text: '07:00 PM - 08:00 PM', startHour: 19, endHour: 20 },
    { value: '20-21', text: '08:00 PM - 09:00 PM', startHour: 20, endHour: 21 },
    { value: '21-22', text: '09:00 PM - 10:00 PM', startHour: 21, endHour: 22 },
    { value: '22-23', text: '10:00 PM - 11:00 PM', startHour: 22, endHour: 23 },
    { value: '23-24', text: '11:00 PM - 12:00 AM', startHour: 23, endHour: 24 }
];

const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// GET /api/available-slots
router.get('/available-slots', async (req, res) => {
    const { sport, date, subdomain } = req.query;

    if (!sport || !date) {
        return res.status(400).json({ error: 'Sport and Date query params are required.' });
    }

    try {
        let tenantFilter = {};
        if (subdomain) {
            const tenant = await Tenant.findOne({ subdomain });
            if (tenant) {
                tenantFilter.tenantId = tenant._id;
            }
        }

        // Fetch settings
        let settings = await TurfSettings.findOne(tenantFilter);
        if (!settings) {
            // Find default settings or fallback
            settings = await TurfSettings.findOne();
            if (!settings) {
                settings = new TurfSettings({
                    cricketBaseRate: 1200,
                    footballBaseRate: 1500,
                    netsBaseRate: 800,
                    blackoutHours: { start: 15, end: 18 }
                });
            }
        }
        // Safely ensure nested parameters exist to prevent TypeError crashes
        if (!settings.blackoutHours) {
            settings.blackoutHours = { start: 15, end: 18 };
        }
        if (settings.cricketBaseRate === undefined || settings.cricketBaseRate === null) settings.cricketBaseRate = 1200;
        if (settings.footballBaseRate === undefined || settings.footballBaseRate === null) settings.footballBaseRate = 1500;
        if (settings.netsBaseRate === undefined || settings.netsBaseRate === null) settings.netsBaseRate = 800;

        // If query is for cricket or football turf, we check both since they share the same physical ground.
        const sportFilter = (sport === 'cricket' || sport === 'football') 
            ? { $in: ['cricket', 'football'] } 
            : sport;

        // Fetch successful bookings for this date and sport category
        const bookings = await Booking.find({
            ...tenantFilter,
            date: date,
            sport: sportFilter,
            paymentStatus: 'SUCCESS'
        });

        const bookedSlots = new Set();
        bookings.forEach(b => {
            b.timeSlots.forEach(slot => bookedSlots.add(slot));
        });

        // Fetch closures using UTC parsing to avoid timezone shifts on date boundaries
        const targetDate = new Date(date + 'T00:00:00Z');
        const dayOfWeek = targetDate.getUTCDay();

        const startOfDay = new Date(date + 'T00:00:00');
        const endOfDay = new Date(date + 'T23:59:59');

        const closures = await TurfClosure.find({
            ...tenantFilter,
            $or: [
                {
                    startDate: { $lte: endOfDay },
                    endDate: { $gte: startOfDay }
                },
                {
                    recurringDay: dayOfWeek
                }
            ]
        });

        let baseRate = sport === 'nets' ? (settings.netsBaseRate || 800) : (sport === 'cricket' ? settings.cricketBaseRate : settings.footballBaseRate);
        if (settings.weeklyRates && settings.weeklyRates[sport] && Array.isArray(settings.weeklyRates[sport])) {
            const dayRate = settings.weeklyRates[sport][dayOfWeek];
            if (dayRate !== undefined && dayRate !== null && dayRate > 0) {
                baseRate = dayRate;
            }
        }
        const dayName = getDayName(date);

        const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
        const todayISTStr = nowIST.toISOString().split('T')[0];
        const currentHourIST = nowIST.getUTCHours();

        if (date < todayISTStr) {
            return res.json({
                day_info: {
                    day_name: dayName,
                    date: date,
                    hourly_rate: baseRate,
                    blackout_hours: {
                        start: settings.blackoutHours.start,
                        end: settings.blackoutHours.end
                    }
                },
                slots: []
            });
        }

        const nowMs = Date.now();
        const leadTimeBufferMs = 60 * 60 * 1000; // 1-hour advance lead time buffer

        const slotsResponse = ALL_HOURLY_SLOTS.map(slot => {
            const startHourNum = parseInt(slot.value.split('-')[0], 10);
            const startHourStr = startHourNum < 10 ? `0${startHourNum}` : `${startHourNum}`;
            const slotStartISTStr = `${date}T${startHourStr}:00:00+05:30`;
            const slotStartMs = new Date(slotStartISTStr).getTime();

            // Slot is too late to book if it starts in less than 1 hour from current time
            const isTooLateToBook = !isNaN(slotStartMs) && (slotStartMs - nowMs) < leadTimeBufferMs;

            const isBooked = bookedSlots.has(slot.value) || (slot.value === '23-24' && bookedSlots.has('23-00'));
            const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
            const isBlackoutSetting = isWeekday && slot.startHour >= settings.blackoutHours.start && slot.startHour < settings.blackoutHours.end;

            let isCustomClosure = false;
            let closureReason = '';
            closures.forEach(closure => {
                if (closure.recurringDay === dayOfWeek) {
                    isCustomClosure = true;
                    closureReason = closure.reason || 'Closed';
                } else {
                    const slotStart = new Date(date + `T${startHourStr}:00:00`);
                    if (slotStart >= closure.startDate && slotStart < closure.endDate) {
                        isCustomClosure = true;
                        closureReason = closure.reason || 'Closed';
                    }
                }
            });

            const isClosed = isBlackoutSetting || isCustomClosure || isTooLateToBook;
            const isAvailable = !isBooked && !isClosed;

            let displayReason = '';
            if (isBooked) displayReason = 'Booked';
            else if (isTooLateToBook) displayReason = 'Too Late To Book';
            else if (isCustomClosure) displayReason = closureReason;
            else if (isBlackoutSetting) displayReason = 'Academy';

            return {
                value: slot.value,
                text: slot.text,
                price: baseRate,
                available: isAvailable,
                booked: isBooked,
                blackout: isClosed,
                tooLate: isTooLateToBook,
                reason: displayReason
            };
        });

        const filteredSlotsResponse = slotsResponse;

        res.json({
            day_info: {
                day_name: dayName,
                date: date,
                hourly_rate: baseRate,
                blackout_hours: {
                    start: settings.blackoutHours.start,
                    end: settings.blackoutHours.end
                },
                advance_percentage: settings.advancePercentage !== undefined && settings.advancePercentage !== null 
                    ? settings.advancePercentage 
                    : 100
            },
            slots: filteredSlotsResponse
        });

    } catch (err) {
        console.error('Error fetching slots:', err);
        res.status(500).json({ error: 'Server error fetching available slots.' });
    }
});

// Admin endpoints for Turf Settings
router.get('/admin/turf-settings', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'ADMIN'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        let settings = await TurfSettings.findOne({ tenantId });
        if (!settings) {
            settings = new TurfSettings({
                tenantId,
                branchId: req.user.branchId,
                cricketBaseRate: 1200,
                footballBaseRate: 1500,
                netsBaseRate: 800,
                blackoutHours: { start: 15, end: 18 },
                advancePercentage: 100
            });
            await settings.save();
        }
        // Ensure default fallback if exists but advancePercentage is not set
        if (settings.advancePercentage === undefined || settings.advancePercentage === null) {
            settings.advancePercentage = 100;
        }
        res.json(settings);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: 'Server error fetching settings.' });
    }
});

router.put('/admin/turf-settings', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'ADMIN'), async (req, res) => {
    const { cricketBaseRate, footballBaseRate, netsBaseRate, weeklyRates, blackoutStart, blackoutEnd, advancePercentage } = req.body;
    const tenantId = req.user.tenantId;
    try {
        let settings = await TurfSettings.findOne({ tenantId });
        if (!settings) {
            settings = new TurfSettings({
                tenantId,
                branchId: req.user.branchId,
                cricketBaseRate: 1200,
                footballBaseRate: 1500,
                netsBaseRate: 800,
                blackoutHours: { start: 15, end: 18 },
                advancePercentage: 100
            });
        }
        if (!settings.blackoutHours) {
            settings.blackoutHours = { start: 15, end: 18 };
        }
        if (cricketBaseRate !== undefined) settings.cricketBaseRate = cricketBaseRate;
        if (footballBaseRate !== undefined) settings.footballBaseRate = footballBaseRate;
        if (netsBaseRate !== undefined) settings.netsBaseRate = netsBaseRate;
        if (weeklyRates !== undefined) settings.weeklyRates = weeklyRates;
        if (blackoutStart !== undefined) settings.blackoutHours.start = blackoutStart;
        if (blackoutEnd !== undefined) settings.blackoutHours.end = blackoutEnd;
        if (advancePercentage !== undefined) {
            const pct = Number(advancePercentage);
            if (!isNaN(pct) && pct >= 0 && pct <= 100) {
                settings.advancePercentage = pct;
            }
        }
        await settings.save();
        res.json({ success: true, settings });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: 'Server error updating settings.' });
    }
});

// Admin endpoints for Turf Closures
router.get('/admin/closures', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'ADMIN'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const closures = await TurfClosure.find({ tenantId }).sort({ startDate: 1 });
        res.json(closures);
    } catch (err) {
        console.error('Error loading closures:', err);
        res.status(500).json({ error: 'Server error loading closures.' });
    }
});

router.post('/admin/closures', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'ADMIN'), async (req, res) => {
    const { startDate, endDate, recurringDay, reason } = req.body;
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required.' });
    }
    try {
        const closure = new TurfClosure({
            tenantId,
            branchId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            recurringDay: recurringDay !== undefined ? Number(recurringDay) : undefined,
            reason
        });
        await closure.save();
        res.json({ success: true, closure });
    } catch (err) {
        console.error('Error creating closure:', err);
        res.status(500).json({ error: 'Server error creating closure.' });
    }
});

router.delete('/admin/closures/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'ADMIN'), async (req, res) => {
    const tenantId = req.user.tenantId;
    try {
        const result = await TurfClosure.findOneAndDelete({ _id: req.params.id, tenantId });
        if (!result) {
            return res.status(404).json({ error: 'Closure not found.' });
        }
        res.json({ success: true, message: 'Closure successfully deleted.' });
    } catch (err) {
        console.error('Error deleting closure:', err);
        res.status(500).json({ error: 'Server error deleting closure.' });
    }
});

module.exports = router;
