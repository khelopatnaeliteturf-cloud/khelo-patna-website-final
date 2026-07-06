const express = require('express');
const mongoose = require('../lib/mongoose-pg-bridge');
const router = express.Router();
const Booking = require('../models/Booking');
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const ChatSession = require('../models/ChatSession');
const Tenant = require('../models/Tenant');
const Branch = require('../models/Branch');
const AuditLog = require('../models/AuditLog');
const { createOrder, verifyPayment } = require('../services/cashfree');
const { sendWhatsAppMessage } = require('../services/whatsapp');
const { sendBookingInvoiceEmail, sendFeeInvoiceEmail } = require('../services/mailercloud');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const crypto = require('crypto');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://khelopatna.in';

// Shared physical ground: cricket & football occupy the same turf
const getSportFilter = (sport) => (
    (sport === 'cricket' || sport === 'football')
        ? { $in: ['cricket', 'football'] }
        : sport
);

/**
 * Checks whether any of the requested slots collide with existing bookings.
 * Considers confirmed (SUCCESS) bookings and recent PENDING ones (payment in
 * flight) to reduce double-booking races between concurrent checkouts.
 */
async function hasSlotConflict({ tenantId, date, sport, timeSlots, excludeBookingId = null }) {
    const pendingCutoff = new Date(Date.now() - 15 * 60 * 1000); // 15-minute payment window
    const query = {
        tenantId,
        date,
        sport: getSportFilter(sport),
        $or: [
            { paymentStatus: 'SUCCESS' },
            { paymentStatus: 'PENDING', createdAt: { $gte: pendingCutoff } }
        ]
    };
    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    const existing = await Booking.find(query).select('timeSlots');
    const bookedSlots = new Set();
    existing.forEach(b => b.timeSlots.forEach(slot => bookedSlots.add(slot)));
    return timeSlots.some(slot => bookedSlots.has(slot));
}

// Helper to send booking notifications
async function sendBookingNotifications(booking) {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const waText = `⚽ *Booking Confirmation* ⚽\n\nDear ${booking.customerName}, your turf booking is confirmed!\n\n*Intake Details*:\n*   Sport: ${booking.sport.toUpperCase()}\n*   Date: ${booking.date}\n*   Slots: ${booking.timeSlots.join(', ')}\n*   Total Paid: ₹${booking.paidAmount}\n*   Order ID: ${booking.orderId}\n\nThank you for choosing KheloPatna! 🏆`;
    
    await sendWhatsAppMessage(booking.customerPhone, waText);
    try {
        await sendBookingInvoiceEmail(booking);
    } catch (e) {
        console.error('Error sending booking email:', e);
    }
}

// Helper to send fee notifications
async function sendFeeNotifications(feeRecord) {
    const student = await Student.findById(feeRecord.studentId);
    if (!student) return;

    const waText = `💳 *KheloPatna Academy Fee Receipt* 💳\n\nDear parent, we have successfully received monthly tuition fees for *${student.name}*.\n\n*Invoice Summary*:\n*   Sport: ${student.sport.toUpperCase()}\n*   Month: ${feeRecord.monthFor}\n*   Amount Paid: ₹${feeRecord.amountPaid}\n*   Receipt ID: ${feeRecord._id}\n\nThank you for choosing KheloPatna! 🏆`;
    
    await sendWhatsAppMessage(student.phone, waText);
    try {
        await sendFeeInvoiceEmail(student, feeRecord);
    } catch (e) {
        console.error('Error sending fee email:', e);
    }
}

// POST /api/payment/create-order
router.post('/payment/create-order', async (req, res) => {
    const { amount, customerName, customerEmail, customerPhone, bookingData, subdomain } = req.body;

    if (!amount || !customerName || !customerPhone || !bookingData) {
        return res.status(400).json({ error: 'Missing required order details.' });
    }

    const orderId = `KP-${Date.now()}`;

    try {
        // Resolve tenant
        let tenantId = null;
        let branchId = null;
        if (subdomain) {
            const tenant = await Tenant.findOne({ subdomain });
            if (tenant) {
                tenantId = tenant._id;
                const br = await Branch.findOne({ tenantId });
                if (br) branchId = br._id;
            }
        }

        // Reject orders for slots that are already booked (or mid-payment)
        const conflict = await hasSlotConflict({
            tenantId,
            date: bookingData.booking_date,
            sport: bookingData.sport,
            timeSlots: bookingData.time_slots
        });
        if (conflict) {
            return res.status(409).json({ error: 'One or more of the selected slots are no longer available. Please pick different slots.' });
        }

        // Create a PENDING Booking record
        const newBooking = new Booking({
            tenantId,
            branchId,
            customerName,
            customerEmail: customerEmail || 'no-email@khelopatna.in',
            customerPhone,
            date: bookingData.booking_date,
            timeSlots: bookingData.time_slots,
            totalAmount: Number(bookingData.totalAmount),
            paidAmount: Number(amount),
            paymentStatus: 'PENDING',
            paymentMethod: 'cashfree',
            orderId: orderId,
            sport: bookingData.sport,
            participantsCount: Number(bookingData.participantsCount || 1)
        });

        await newBooking.save();

        // Create checkout session on Cashfree
        const cfOrder = await createOrder({
            amount: amount,
            orderId: orderId,
            customerName,
            customerEmail: customerEmail || 'no-email@khelopatna.in',
            customerPhone,
            returnUrl: `${FRONTEND_URL}/book?order_id=${orderId}&payment_status=success`
        });

        res.json({
            success: true,
            order_id: orderId,
            payment_session_id: cfOrder.payment_session_id
        });

    } catch (err) {
        console.error('Error creating payment order:', err);
        res.status(500).json({ error: err.message || 'Server error creating order.' });
    }
});

// POST /api/payment/verify
router.post('/payment/verify', async (req, res) => {
    const { order_id } = req.body;

    if (!order_id) {
        return res.status(400).json({ error: 'Order ID is required.' });
    }

    try {
        // Look up the record first so mock verification (dev only) can echo the
        // expected amount, keeping the amount-mismatch check consistent.
        let expectedAmount = null;
        if (order_id.startsWith('KP-')) {
            const b = await Booking.findOne({ orderId: order_id }).select('totalAmount');
            if (b) expectedAmount = b.totalAmount;
        } else if (order_id.startsWith('KPFEE-')) {
            const f = await Fee.findOne({ orderId: order_id }).select('amountDue');
            if (f) expectedAmount = f.amountDue;
        }

        const verifyResult = await verifyPayment(order_id, expectedAmount);

        if (verifyResult.success && verifyResult.payment_status === 'SUCCESS') {
            if (order_id.startsWith('KP-')) {
                const booking = await Booking.findOne({ orderId: order_id });
                if (booking && booking.paymentStatus === 'PENDING') {
                    // Prevent price manipulation by comparing the gateway amount to the database amount
                    if (Math.abs(Number(verifyResult.payment_details.amount) - booking.totalAmount) > 0.01) {
                        console.error(`Price manipulation detected! Booking ID: ${booking._id}. Expected: ${booking.totalAmount}, Paid: ${verifyResult.payment_details.amount}`);
                        booking.paymentStatus = 'FAILED';
                        booking.paymentDetails = { ...verifyResult.payment_details, error: 'Price mismatch' };
                        await booking.save();
                        return res.status(400).json({ error: 'Payment amount mismatch. Security verification failed.' });
                    }
                    booking.paymentStatus = 'SUCCESS';
                    booking.transactionId = verifyResult.payment_details.transaction_id;
                    booking.paymentDetails = verifyResult.payment_details;
                    await booking.save();
                    await sendBookingNotifications(booking);
                }
            } else if (order_id.startsWith('KPFEE-')) {
                const feeRecord = await Fee.findOne({ orderId: order_id });
                if (feeRecord && feeRecord.status !== 'PAID') {
                    // Prevent fee amount manipulation
                    if (Math.abs(Number(verifyResult.payment_details.amount) - feeRecord.amountDue) > 0.01) {
                        console.error(`Price manipulation detected on Fees! Expected: ${feeRecord.amountDue}, Paid: ${verifyResult.payment_details.amount}`);
                        return res.status(400).json({ error: 'Payment amount mismatch. Security verification failed.' });
                    }
                    feeRecord.status = 'PAID';
                    feeRecord.paymentDate = new Date();
                    feeRecord.amountPaid = feeRecord.amountDue;
                    feeRecord.paymentDetails = verifyResult.payment_details;
                    await feeRecord.save();
                    await sendFeeNotifications(feeRecord);
                }
            }

            return res.json({
                success: true,
                payment_status: 'SUCCESS',
                payment_details: verifyResult.payment_details
            });
        }

        res.json({
            success: false,
            payment_status: verifyResult.payment_status || 'PENDING'
        });

    } catch (err) {
        console.error('Error verifying payment:', err);
        res.status(500).json({ error: 'Server error during verification.' });
    }
});

// POST /api/payment/webhook (Handles Cashfree cryptographic webhook signature validation)
router.post('/payment/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-webhook-signature'];
        const timestamp = req.headers['x-webhook-timestamp'];
        const rawBody = req.rawBody || JSON.stringify(req.body); // Fallback if no rawBody parsed

        const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;

        if (process.env.NODE_ENV === 'production' && !webhookSecret) {
            console.error('CRITICAL: CASHFREE_WEBHOOK_SECRET is missing in production environment. Webhook rejected for security.');
            return res.status(500).send('Internal configuration error.');
        }

        if (webhookSecret) {
            if (!signature || !timestamp) {
                console.error('Missing signature or timestamp headers on Cashfree Webhook.');
                return res.status(400).send('Missing verification headers.');
            }
            const dataToSign = timestamp + rawBody;
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(dataToSign)
                .digest('base64');

            const receivedSignature = Buffer.from(signature);
            const expectedSignatureBuffer = Buffer.from(expectedSignature);
            const validSignature = receivedSignature.length === expectedSignatureBuffer.length
                && crypto.timingSafeEqual(receivedSignature, expectedSignatureBuffer);

            if (!validSignature) {
                console.error('Invalid signature on Cashfree Webhook.');
                return res.status(400).send('Invalid signature.');
            }
        }

        const payload = req.body;
        const { data } = payload;
        
        if (!data || !data.order || !data.payment) {
            return res.status(400).send('Invalid webhook payload.');
        }

        const orderId = data.order.order_id;
        const paymentStatus = data.payment.payment_status;
        const transactionId = data.payment.cf_payment_id;
        const paidAmount = Number(data.payment.payment_amount ?? data.order.order_amount);

        console.log(`Received Webhook for Order: ${orderId}, Status: ${paymentStatus}`);

        if (paymentStatus === 'SUCCESS') {
            if (orderId.startsWith('KP-')) {
                const booking = await Booking.findOne({ orderId: orderId });
                if (booking && booking.paymentStatus === 'PENDING') {
                    // Validate the paid amount against what is owed (prevents
                    // confirming a booking with an underpaid/tampered order)
                    if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - booking.totalAmount) > 0.01) {
                        console.error(`Webhook amount mismatch! Order: ${orderId}. Expected: ${booking.totalAmount}, Paid: ${paidAmount}`);
                        booking.paymentStatus = 'FAILED';
                        booking.paymentDetails = { ...booking.paymentDetails, error: 'Webhook amount mismatch', webhookPaidAmount: paidAmount };
                        await booking.save();
                        return res.json({ processed: true, note: 'Amount mismatch. Booking not confirmed.' });
                    }
                    booking.paymentStatus = 'SUCCESS';
                    booking.transactionId = transactionId;
                    await booking.save();
                    await sendBookingNotifications(booking);

                    const cleanPhone = booking.customerPhone;
                    await ChatSession.deleteOne({ phone: cleanPhone });
                }
            } else if (orderId.startsWith('KPFEE-')) {
                const feeRecord = await Fee.findOne({ orderId: orderId });
                if (feeRecord && feeRecord.status !== 'PAID') {
                    if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - feeRecord.amountDue) > 0.01) {
                        console.error(`Webhook fee amount mismatch! Order: ${orderId}. Expected: ${feeRecord.amountDue}, Paid: ${paidAmount}`);
                        return res.json({ processed: true, note: 'Amount mismatch. Fee not confirmed.' });
                    }
                    feeRecord.status = 'PAID';
                    feeRecord.paymentDate = new Date();
                    feeRecord.amountPaid = feeRecord.amountDue;
                    await feeRecord.save();
                    await sendFeeNotifications(feeRecord);
                }
            }
        }

        res.json({ processed: true });
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).send('Server error processing webhook.');
    }
});

// GET /api/admin/customers/lookup
router.get('/admin/customers/lookup', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required.' });
        }

        // Find all bookings for this customer
        const bookings = await Booking.find({ 
            tenantId: req.user.tenantId, 
            customerPhone: phone 
        }).sort({ date: -1, createdAt: -1 });

        // Search in Student database
        const student = await Student.findOne({ 
            tenantId: req.user.tenantId, 
            phone: phone 
        });

        if (bookings.length === 0 && !student) {
            return res.json({ exists: false });
        }

        let customerName = '';
        let customerEmail = '';

        if (bookings.length > 0) {
            customerName = bookings[0].customerName;
            customerEmail = bookings[0].customerEmail || '';
        } else if (student) {
            customerName = student.name;
            customerEmail = student.email || '';
        }

        res.json({
            exists: true,
            customerName,
            customerEmail,
            bookings: bookings.map(b => ({
                id: b._id,
                orderId: b.orderId,
                sport: b.sport,
                date: b.date,
                timeSlots: b.timeSlots,
                totalAmount: b.totalAmount,
                paidAmount: b.paidAmount,
                paymentStatus: b.paymentStatus,
                paymentMethod: b.paymentMethod,
                createdAt: b.createdAt
            })),
            student: student ? {
                id: student._id,
                name: student.name,
                sport: student.sport,
                status: student.status
            } : null
        });
    } catch (err) {
        console.error('Customer lookup error:', err);
        res.status(500).json({ error: 'Server error looking up customer.' });
    }
});

// GET /api/admin/customers
router.get('/admin/customers', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // Group bookings by phone number
        const bookingsGrouped = await Booking.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
            { $group: {
                _id: "$customerPhone",
                name: { $first: "$customerName" },
                email: { $first: "$customerEmail" },
                totalBookings: { $sum: 1 },
                successfulBookings: { $sum: { $cond: [{ $eq: ["$paymentStatus", "SUCCESS"] }, 1, 0] } },
                totalSpent: { $sum: { $cond: [{ $eq: ["$paymentStatus", "SUCCESS"] }, "$paidAmount", 0] } },
                lastBookingDate: { $max: "$date" }
            } }
        ]);

        // Find all students
        const students = await Student.find({ tenantId });

        const customerMap = {};

        // Process bookings
        bookingsGrouped.forEach(bg => {
            const phone = bg._id ? bg._id.trim() : 'unknown';
            if (phone === 'unknown' || !phone) return;

            customerMap[phone] = {
                phone,
                name: bg.name || 'Anonymous',
                email: bg.email || '',
                totalBookings: bg.totalBookings || 0,
                successfulBookings: bg.successfulBookings || 0,
                totalSpent: bg.totalSpent || 0,
                lastBookingDate: bg.lastBookingDate || '',
                isStudent: false,
                studentDetails: null
            };
        });

        // Process students
        students.forEach(st => {
            const phone = st.phone ? st.phone.trim() : '';
            if (!phone) return;

            if (customerMap[phone]) {
                customerMap[phone].isStudent = true;
                customerMap[phone].studentDetails = {
                    id: st._id,
                    name: st.name,
                    sport: st.sport,
                    status: st.status
                };
                if (!customerMap[phone].name || customerMap[phone].name === 'Anonymous') {
                    customerMap[phone].name = st.name;
                }
                if (!customerMap[phone].email) {
                    customerMap[phone].email = st.email || '';
                }
            } else {
                customerMap[phone] = {
                    phone,
                    name: st.name,
                    email: st.email || '',
                    totalBookings: 0,
                    successfulBookings: 0,
                    totalSpent: 0,
                    lastBookingDate: '',
                    isStudent: true,
                    studentDetails: {
                        id: st._id,
                        name: st.name,
                        sport: st.sport,
                        status: st.status
                    }
                };
            }
        });

        const customersList = Object.values(customerMap).sort((a, b) => {
            if (a.lastBookingDate && b.lastBookingDate) {
                return b.lastBookingDate.localeCompare(a.lastBookingDate);
            }
            if (a.lastBookingDate) return -1;
            if (b.lastBookingDate) return 1;
            return b.totalBookings - a.totalBookings;
        });

        res.json({ success: true, customers: customersList });
    } catch (err) {
        console.error('Error fetching customer database:', err);
        res.status(500).json({ error: 'Server error retrieving customers list.' });
    }
});

// POST /api/admin/customers/merge
router.post('/admin/customers/merge', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER'), async (req, res) => {
    try {
        const { sourcePhone, targetPhone, targetName, targetEmail } = req.body;
        const tenantId = req.user.tenantId;

        if (!sourcePhone || !targetPhone || !targetName) {
            return res.status(400).json({ error: 'Source Phone, Target Phone, and target name are required.' });
        }

        const cleanSource = sourcePhone.trim();
        const cleanTarget = targetPhone.trim();

        if (cleanSource === cleanTarget) {
            return res.status(400).json({ error: 'Source phone and target phone must be different.' });
        }

        // 1. Update source bookings
        const bookingUpdateSource = await Booking.updateMany(
            { tenantId, customerPhone: cleanSource },
            { $set: { customerPhone: cleanTarget, customerName: targetName.trim(), customerEmail: (targetEmail || '').trim() } }
        );

        // 2. Update target bookings
        const bookingUpdateTarget = await Booking.updateMany(
            { tenantId, customerPhone: cleanTarget },
            { $set: { customerName: targetName.trim(), customerEmail: (targetEmail || '').trim() } }
        );

        // 3. Update source students
        const studentUpdateSource = await Student.updateMany(
            { tenantId, phone: cleanSource },
            { $set: { phone: cleanTarget, name: targetName.trim(), email: (targetEmail || '').trim() } }
        );

        // 4. Update target students
        const studentUpdateTarget = await Student.updateMany(
            { tenantId, phone: cleanTarget },
            { $set: { name: targetName.trim(), email: (targetEmail || '').trim() } }
        );

        // 5. Log event in system AuditLog
        await AuditLog.create({
            userId: req.user.id,
            username: req.user.username,
            role: req.user.role,
            action: `Merged customer profile ${cleanSource} into ${cleanTarget} (Spelling: ${targetName.trim()}, Email: ${(targetEmail || '').trim()})`,
            module: 'CUSTOMERS',
            tenantId
        });

        res.json({
            success: true,
            message: 'Customer profiles merged successfully.',
            details: {
                bookingsUpdated: (bookingUpdateSource.modifiedCount || 0),
                studentsUpdated: (studentUpdateSource.modifiedCount || 0)
            }
        });
    } catch (err) {
        console.error('Error merging customer profiles:', err);
        res.status(500).json({ error: 'Server error merging customer profiles.' });
    }
});

// POST /api/admin/bookings (Create Offline or Payment Link Booking)
router.post('/admin/bookings', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST'), async (req, res) => {
    const { 
        customerName, 
        customerEmail, 
        customerPhone, 
        sport, 
        date, 
        timeSlots, 
        totalAmount, 
        paidAmount, 
        discount, 
        paymentMethod,
        paymentType, // 'offline' or 'link'
        participantsCount
    } = req.body;

    if (!customerName || !customerPhone || !sport || !date || !timeSlots || !timeSlots.length) {
        return res.status(400).json({ error: 'Missing required booking details.' });
    }

    try {
        const tenantId = req.user.tenantId || null;
        const branchId = req.user.branchId || null;

        // Check slot availability (conflict check on the shared physical ground,
        // including in-flight PENDING payments to avoid double-booking races)
        const conflict = await hasSlotConflict({ tenantId, date, sport, timeSlots });
        if (conflict) {
            return res.status(409).json({ error: 'One or more of the selected slots are already booked.' });
        }

        const orderId = `KP-OFFLINE-${Date.now()}`;
        
        let newBooking;

        if (paymentType === 'link') {
            // Online Payment Link flow
            const { createPaymentLink } = require('../services/cashfree');
            const returnUrl = `${FRONTEND_URL}/book?order_id=${orderId}&payment_status=success`;
            const paymentLink = await createPaymentLink({
                linkId: orderId,
                amount: Number(paidAmount),
                customerPhone,
                customerName,
                customerEmail: customerEmail || 'no-email@khelopatna.in',
                returnUrl
            });

            newBooking = new Booking({
                tenantId,
                branchId,
                customerName,
                customerEmail: customerEmail || 'no-email@khelopatna.in',
                customerPhone,
                date,
                timeSlots,
                totalAmount: Number(totalAmount),
                paidAmount: Number(paidAmount),
                discount: Number(discount || 0),
                paymentStatus: 'PENDING',
                paymentMethod: 'cashfree',
                orderId: orderId,
                sport: sport,
                participantsCount: Number(participantsCount || 1)
            });

            await newBooking.save();

            // Share Payment Link on WhatsApp
            const waText = `💳 *KheloPatna Turf Payment Link* 💳\n\nDear ${customerName}, a turf booking has been initiated from the admin desk.\n\n*Booking Summary*:\n*   Sport: ${sport.toUpperCase()}\n*   Date: ${date}\n*   Slots: ${timeSlots.join(', ')}\n*   Amount Due: ₹${paidAmount}\n\nTo confirm your booking, please pay using this secure link:\n🔗 ${paymentLink}\n\nThank you! 🏆`;
            try {
                await sendWhatsAppMessage(customerPhone, waText);
            } catch (waErr) {
                console.error('Error sending payment link WhatsApp:', waErr);
            }

        } else {
            // Direct / Offline Booking flow
            newBooking = new Booking({
                tenantId,
                branchId,
                customerName,
                customerEmail: customerEmail || 'no-email@khelopatna.in',
                customerPhone,
                date,
                timeSlots,
                totalAmount: Number(totalAmount),
                paidAmount: Number(paidAmount),
                discount: Number(discount || 0),
                paymentStatus: 'SUCCESS', // Offline bookings are directly SUCCESS
                paymentMethod: paymentMethod || 'offline',
                orderId: orderId,
                sport: sport,
                participantsCount: Number(participantsCount || 1)
            });

            await newBooking.save();

            // Trigger standard confirmation alerts
            try {
                await sendBookingNotifications(newBooking);
            } catch (notifyErr) {
                console.error('Error sending offline booking notifications:', notifyErr);
            }
        }

        // Record Audit Log record
        try {
            let logTenantId = tenantId || req.user.tenantId;
            if (!logTenantId) {
                const defaultTenant = await Tenant.findOne();
                if (defaultTenant) {
                    logTenantId = defaultTenant._id;
                }
            }
            const AuditLog = require('../models/AuditLog');
            await new AuditLog({
                tenantId: logTenantId,
                userId: req.user.username,
                module: 'Turf',
                action: 'CREATE_OFFLINE_BOOKING',
                newData: {
                    orderId,
                    customerName,
                    sport,
                    date,
                    timeSlots,
                    paidAmount,
                    discount,
                    paymentType
                }
            }).save();
        } catch (auditErr) {
            console.error('Error writing audit log:', auditErr);
        }

        res.status(201).json({
            success: true,
            booking: newBooking
        });
    } catch (err) {
        console.error('Create offline booking error:', err);
        res.status(500).json({ error: 'Server error creating booking.' });
    }
});

// PUT /api/admin/bookings/:id/reschedule
router.put('/admin/bookings/:id/reschedule', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'ADMIN', 'RECEPTIONIST'), async (req, res) => {
    const { date, timeSlots } = req.body;
    const bookingId = req.params.id;

    if (!date || !timeSlots || !timeSlots.length) {
        return res.status(400).json({ error: 'Date and time slots are required.' });
    }

    try {
        // Scope lookup to the caller's tenant to prevent cross-tenant access
        const booking = await Booking.findOne({ _id: bookingId, tenantId: req.user.tenantId });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        // Check slot availability (tenant-scoped, excluding this booking)
        const conflict = await hasSlotConflict({
            tenantId: booking.tenantId,
            date,
            sport: booking.sport,
            timeSlots,
            excludeBookingId: booking._id
        });
        if (conflict) {
            return res.status(409).json({ error: 'One or more of the requested slots are already booked.' });
        }

        const oldDate = booking.date;
        const oldSlots = booking.timeSlots;

        booking.date = date;
        booking.timeSlots = timeSlots;
        await booking.save();

        // Write Audit Log
        try {
            const AuditLog = require('../models/AuditLog');
            await new AuditLog({
                tenantId: booking.tenantId || req.user.tenantId,
                userId: req.user.username,
                module: 'Turf',
                action: 'RESCHEDULE_BOOKING',
                newData: {
                    bookingId: booking._id,
                    orderId: booking.orderId,
                    oldDate,
                    oldSlots,
                    newDate: date,
                    newSlots: timeSlots
                }
            }).save();
        } catch (auditErr) {
            console.error('Error logging audit for reschedule:', auditErr);
        }

        res.json({ success: true, message: 'Booking rescheduled successfully.', booking });
    } catch (err) {
        console.error('Reschedule booking error:', err);
        res.status(500).json({ error: 'Server error rescheduling booking.' });
    }
});

// POST /api/admin/bookings/:id/cancel-refund
// Refunds move real money — restricted to management roles (not RECEPTIONIST).
router.post('/admin/bookings/:id/cancel-refund', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'ADMIN'), async (req, res) => {
    const bookingId = req.params.id;
    const { initiateRefund } = req.body; // true/false flag

    try {
        // Scope lookup to the caller's tenant to prevent cross-tenant refunds
        const booking = await Booking.findOne({ _id: bookingId, tenantId: req.user.tenantId });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        if (booking.paymentStatus === 'CANCELLED' || booking.paymentStatus === 'FAILED') {
            return res.status(400).json({ error: 'Booking is already cancelled.' });
        }

        let refundDetails = null;
        const shouldRefund = initiateRefund !== false; // default to true if not provided

        if (shouldRefund && booking.paymentStatus === 'SUCCESS' && booking.paymentMethod === 'cashfree') {
            const { refundPayment } = require('../services/cashfree');
            try {
                const refundRes = await refundPayment(booking.orderId, booking.paidAmount);
                if (refundRes.success) {
                    refundDetails = {
                        refundId: refundRes.refund_id,
                        status: refundRes.status,
                        amount: booking.paidAmount,
                        refundedAt: new Date()
                    };
                }
            } catch (refundErr) {
                console.error('Cashfree refund failed:', refundErr);
                return res.status(502).json({ error: `Cashfree refund failed: ${refundErr.message}` });
            }
        }

        booking.paymentStatus = 'CANCELLED'; // Release the slots (distinct from payment FAILED)
        if (refundDetails) {
            booking.paymentDetails = {
                ...booking.paymentDetails,
                refund: refundDetails
            };
        } else if (!shouldRefund) {
            booking.paymentDetails = {
                ...booking.paymentDetails,
                refund: {
                    status: 'SKIPPED',
                    note: 'Cancelled by Admin without refund request',
                    refundedAt: new Date()
                }
            };
        }
        await booking.save();

        // Write Audit Log
        try {
            const AuditLog = require('../models/AuditLog');
            await new AuditLog({
                tenantId: booking.tenantId || req.user.tenantId,
                userId: req.user.username,
                module: 'Turf',
                action: 'CANCEL_REFUND_BOOKING',
                newData: {
                    bookingId: booking._id,
                    orderId: booking.orderId,
                    refundInitiated: !!refundDetails,
                    refundRequested: shouldRefund,
                    refundDetails
                }
            }).save();
        } catch (auditErr) {
            console.error('Error logging audit for cancel-refund:', auditErr);
        }

        res.json({ 
            success: true, 
            message: refundDetails 
                ? 'Booking cancelled and refund initiated successfully.' 
                : 'Booking cancelled successfully (no refund).', 
            booking 
        });
    } catch (err) {
        console.error('Cancel-refund booking error:', err);
        res.status(500).json({ error: 'Server error cancelling booking.' });
    }
});

module.exports = router;
