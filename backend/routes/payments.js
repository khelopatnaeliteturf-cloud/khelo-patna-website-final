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
const Coupon = require('../models/Coupon');
const { createOrder, verifyPayment: verifyCFPayment } = require('../services/cashfree');
const { createPhonePeOrder, verifyPhonePePayment, verifyChecksum: verifyPPChecksum } = require('../services/phonepe');
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
async function hasSlotConflict({ tenantId, date, sport, timeSlots, excludeBookingId = null, onlySuccess = false, isAdmin = false }) {
    // Online customer 1-hour advance lead time check (blackout slots starting in < 60 mins)
    if (!isAdmin) {
        const nowMs = Date.now();
        const leadTimeBufferMs = 60 * 60 * 1000;
        for (const slotVal of (timeSlots || [])) {
            const startHourNum = parseInt(slotVal.split('-')[0], 10);
            const startHourStr = startHourNum < 10 ? `0${startHourNum}` : `${startHourNum}`;
            const slotStartISTStr = `${date}T${startHourStr}:00:00+05:30`;
            const slotStartMs = new Date(slotStartISTStr).getTime();
            if (!isNaN(slotStartMs) && (slotStartMs - nowMs) < leadTimeBufferMs) {
                return true; // Conflict for online users
            }
        }
    }

    const pendingCutoff = new Date(Date.now() - 15 * 60 * 1000); // 15-minute payment window
    const query = {
        tenantId,
        date,
        sport: getSportFilter(sport)
    };
    if (onlySuccess) {
        query.paymentStatus = 'SUCCESS';
    } else {
        query.$or = [
            { paymentStatus: 'SUCCESS' },
            { paymentStatus: 'PENDING', createdAt: { $gte: pendingCutoff } }
        ];
    }
    if (excludeBookingId) {
        if (typeof excludeBookingId === 'string' && excludeBookingId.startsWith('KP-')) {
            query.orderId = { $ne: excludeBookingId };
        } else {
            query._id = { $ne: excludeBookingId };
        }
    }

    const existing = await Booking.find(query).select('timeSlots');
    const bookedSlots = new Set();
    existing.forEach(b => b.timeSlots.forEach(slot => bookedSlots.add(slot)));
    return timeSlots.some(slot => {
        if (slot === '23-24' || slot === '23-00') {
            return bookedSlots.has('23-24') || bookedSlots.has('23-00');
        }
        return bookedSlots.has(slot);
    });
}

const formatSlotTo12Hr = (slotStr) => {
    if (!slotStr || !slotStr.includes('-')) return slotStr;
    const parts = slotStr.split('-');
    if (parts.length !== 2) return slotStr;
    
    const formatHour = (hStr) => {
        let h = parseInt(hStr, 10);
        if (isNaN(h)) return hStr;
        h = h % 24;
        const period = h >= 12 ? 'PM' : 'AM';
        let h12 = h % 12;
        if (h12 === 0) h12 = 12;
        const padHour = String(h12).padStart(2, '0');
        return `${padHour}:00 ${period}`;
    };
    
    return `${formatHour(parts[0])} - ${formatHour(parts[1])}`;
};

// Helper to send booking notifications
async function sendBookingNotifications(booking) {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    const totalAmount = Number(booking.totalAmount || 0);
    const discountAmount = Number(booking.discountAmount || 0);
    const advancePaid = Number(booking.paidAmount || 0);
    const balanceDue = Math.max(0, totalAmount - discountAmount - advancePaid);
    const formattedTiming = (booking.timeSlots || []).map(formatSlotTo12Hr).join(', ');
    const bookedByText = booking.bookedBy || (booking.paymentMethod === 'offline' ? 'Admin Staff' : `${booking.customerName} (Online)`);

    const waText = `⚽ *Booking Confirmation* ⚽

Dear ${booking.customerName}, your turf booking is confirmed!

*Booking Summary*:
*   Booked By: ${bookedByText}
*   Sport: ${booking.sport.toUpperCase()}
*   Date: ${booking.date}
*   Timing: ${formattedTiming}
*   Total Amount: ₹${totalAmount}
${discountAmount > 0 ? `*   Discount: -₹${discountAmount} (Code: ${booking.couponCode})\n` : ''}*   Advance Paid: ₹${advancePaid}
*   Balance Due: ₹${balanceDue}
*   Order ID: ${booking.orderId}

📍 *Location Map*:
https://maps.app.goo.gl/iF1kcgi6seEnsRfaA

Thank you for choosing KheloPatna! 🏆`;
    
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

// Helper to send booking failure notification
async function sendFailedBookingNotification(booking) {
    const formattedTiming = (booking.timeSlots || []).map(formatSlotTo12Hr).join(', ');
    const payLink = booking.paymentLink || `${FRONTEND_URL}/book?order_id=${booking.orderId}`;
    
    const waText = `⚠️ *Payment Failed* ⚠️

Dear ${booking.customerName}, your payment for the turf booking failed.

*Slot Details*:
*   Sport: ${booking.sport.toUpperCase()}
*   Date: ${booking.date}
*   Timing: ${formattedTiming}

Don't worry! The slots are still yours for a short period. You can complete your payment and secure your booking using the link below:

🔗 *Payment Link*: ${payLink}

Thank you! 🏆`;

    await sendWhatsAppMessage(booking.customerPhone, waText);
}

// Helper to send booking dropped notification
async function sendDroppedBookingNotification(booking) {
    const formattedTiming = (booking.timeSlots || []).map(formatSlotTo12Hr).join(', ');
    const payLink = booking.paymentLink || `${FRONTEND_URL}/book?order_id=${booking.orderId}`;

    const waText = `👋 *Booking Pending!* 👋

Dear ${booking.customerName}, we noticed you started booking a slot but didn't complete the payment.

*Selected Slots*:
*   Sport: ${booking.sport.toUpperCase()}
*   Date: ${booking.date}
*   Timing: ${formattedTiming}

The slots are still yours! You can secure them right now by completing the payment using the link below:

🔗 *Complete Payment*: ${payLink}

Thank you! 🏆`;

    await sendWhatsAppMessage(booking.customerPhone, waText);
}

// Helper to cancel conflicting pending bookings when one succeeds
async function cancelConflictingPendingBookings(successfulBooking) {
    try {
        const query = {
            tenantId: successfulBooking.tenantId,
            date: successfulBooking.date,
            sport: getSportFilter(successfulBooking.sport),
            paymentStatus: 'PENDING',
            orderId: { $ne: successfulBooking.orderId }
        };

        const pendingBookings = await Booking.find(query);
        for (const booking of pendingBookings) {
            // Check overlap
            const hasOverlap = booking.timeSlots.some(slot => {
                if (slot === '23-24' || slot === '23-00') {
                    return successfulBooking.timeSlots.includes('23-24') || successfulBooking.timeSlots.includes('23-00');
                }
                return successfulBooking.timeSlots.includes(slot);
            });

            if (hasOverlap) {
                booking.paymentStatus = 'CANCELLED';
                booking.paymentDetails = { 
                    ...booking.paymentDetails, 
                    cancelledReason: 'Slot successfully booked by another user' 
                };
                await booking.save();
                console.log(`[Cancel Pending] Cancelled conflicting pending booking ${booking.orderId} due to successful booking ${successfulBooking.orderId}`);
            }
        }
    } catch (err) {
        console.error('Error cancelling conflicting pending bookings:', err);
    }
}

// Background job to check for dropped bookings (every 5 minutes)
setInterval(async () => {
    try {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        
        // Find bookings created more than 15 minutes ago that are still PENDING
        const droppedBookings = await Booking.find({
            paymentStatus: 'PENDING',
            createdAt: { $lt: fifteenMinsAgo }
        });
        
        for (const booking of droppedBookings) {
            // Check if the slots are still free (not booked by a SUCCESS booking)
            const conflict = await hasSlotConflict({
                tenantId: booking.tenantId,
                date: booking.date,
                sport: booking.sport,
                timeSlots: booking.timeSlots,
                excludeBookingId: booking.orderId,
                onlySuccess: true // Check against success only
            });
            
            if (conflict) {
                // Slots taken. Cancel silently without WhatsApp!
                booking.paymentStatus = 'CANCELLED';
                booking.paymentDetails = { 
                    ...booking.paymentDetails, 
                    cancelledReason: 'Slot taken by another user' 
                };
                await booking.save();
                console.log(`[Drop Job] Silently cancelled booking ${booking.orderId} because slot is taken.`);
            } else {
                // Slots still available! Mark as DROPPED and send WhatsApp!
                booking.paymentStatus = 'DROPPED';
                await booking.save();
                
                console.log(`[Drop Job] Marked booking ${booking.orderId} as DROPPED.`);
                
                // Send dropped WhatsApp message
                try {
                    await sendDroppedBookingNotification(booking);
                } catch (err) {
                    console.error(`[Drop Job] Error sending notification for ${booking.orderId}:`, err);
                }
            }
        }
    } catch (err) {
        console.error('[Drop Job] Error checking dropped bookings:', err);
    }
}, 5 * 60 * 1000); // 5 minutes

// POST /api/payment/create-order
router.post('/payment/create-order', async (req, res) => {
    const { amount, customerName, customerEmail, customerPhone, bookingData, subdomain } = req.body;

    const chargeAmount = Number(amount);
    if (isNaN(chargeAmount) || chargeAmount < 0 || amount === undefined || amount === null || !customerName || !customerPhone || !bookingData) {
        return res.status(400).json({ error: 'Missing or invalid order details.' });
    }

    const orderId = `KP-${Date.now()}`;

    try {
        // Resolve tenant
        let tenantId = null;
        let branchId = null;
        const sub = subdomain || 'khelopatna';
        if (sub) {
            const tenant = await Tenant.findOne({ subdomain: sub });
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
            timeSlots: bookingData.time_slots,
            onlySuccess: true // Let new user book even if another order is pending
        });
        if (conflict) {
            return res.status(409).json({ error: 'One or more of the selected slots are no longer available. Please pick different slots.' });
        }

        if (chargeAmount === 0) {
            // Create a SUCCESS Booking record directly (bypass Cashfree)
            const newBooking = new Booking({
                tenantId,
                branchId,
                customerName,
                customerEmail: customerEmail || 'no-email@khelopatna.in',
                customerPhone,
                date: bookingData.booking_date,
                timeSlots: bookingData.time_slots,
                totalAmount: Number(bookingData.totalAmount),
                paidAmount: 0,
                paymentStatus: 'SUCCESS',
                paymentMethod: 'cashfree',
                orderId: orderId,
                sport: bookingData.sport,
                participantsCount: Number(bookingData.participantsCount || 1),
                couponCode: bookingData.couponCode || null,
                discountAmount: Number(bookingData.discountAmount || 0),
                bookedBy: customerName ? `${customerName} (Online)` : 'Online Customer'
            });

            await newBooking.save();

            // Cancel other conflicting pending bookings
            await cancelConflictingPendingBookings(newBooking);

            // Increment coupon usage count if used
            if (newBooking.couponCode) {
                try {
                    const couponObj = await Coupon.findOne({ code: newBooking.couponCode.toUpperCase() });
                    if (couponObj) {
                        couponObj.usageCount = (couponObj.usageCount || 0) + 1;
                        await couponObj.save();
                    }
                } catch (couponErr) {
                    console.error('Error updating coupon usage count:', couponErr);
                }
            }

            sendBookingNotifications(newBooking).catch(notifyErr => {
                console.error('Error sending zero amount booking notifications:', notifyErr);
            });

            return res.json({
                success: true,
                order_id: orderId,
                zero_amount: true,
                redirect_url: `${FRONTEND_URL}/book?order_id=${orderId}&payment_status=success`
            });
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
            participantsCount: Number(bookingData.participantsCount || 1),
            couponCode: bookingData.couponCode || null,
            discountAmount: Number(bookingData.discountAmount || 0),
            bookedBy: customerName ? `${customerName} (Online)` : 'Online Customer'
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

        // Determine redirect URL dynamically based on Cashfree credentials mode
        const backendOrigin = `${req.protocol}://${req.get('host')}`;
        const redirectUrl = cfOrder.mock 
            ? `${backendOrigin}/mock-payment.html?order_id=${orderId}&amount=${amount}`
            : `${backendOrigin}/checkout.html?session_id=${cfOrder.payment_session_id}&env=${process.env.CASHFREE_ENV || 'sandbox'}`;

        // Save payment link on booking
        newBooking.paymentLink = redirectUrl;
        await newBooking.save();

        res.json({
            success: true,
            order_id: orderId,
            payment_session_id: cfOrder.payment_session_id,
            redirect_url: redirectUrl
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
        // If already successful, return early without calling Cashfree verification
        if (order_id.startsWith('KP-')) {
            const booking = await Booking.findOne({ orderId: order_id });
            if (booking && booking.paymentStatus === 'SUCCESS') {
                const hasValidDetails = booking.paymentDetails && !booking.paymentDetails.error && booking.paymentDetails.amount;
                return res.json({
                    success: true,
                    payment_status: 'SUCCESS',
                    payment_details: hasValidDetails 
                        ? booking.paymentDetails 
                        : { amount: booking.paidAmount, payment_method: booking.paymentMethod || 'offline' },
                    booking_details: {
                        customerName: booking.customerName,
                        customerPhone: booking.customerPhone,
                        customerEmail: booking.customerEmail,
                        sport: booking.sport,
                        date: booking.date,
                        timeSlots: booking.timeSlots,
                        totalAmount: booking.totalAmount,
                        paidAmount: booking.paidAmount,
                        discountAmount: booking.discountAmount || booking.discount || 0,
                        couponCode: booking.couponCode,
                        orderId: booking.orderId
                    }
                });
            }
        } else if (order_id.startsWith('KPFEE-')) {
            const feeRecord = await Fee.findOne({ orderId: order_id });
            if (feeRecord && feeRecord.status === 'PAID') {
                const hasValidDetails = feeRecord.paymentDetails && !feeRecord.paymentDetails.error && feeRecord.paymentDetails.amount;
                return res.json({
                    success: true,
                    payment_status: 'SUCCESS',
                    payment_details: hasValidDetails
                        ? feeRecord.paymentDetails 
                        : { amount: feeRecord.amountDue, payment_method: 'CASHFREE' }
                });
            }
        }

        // Look up the record first so mock verification (dev only) can echo the
        // expected amount, keeping the amount-mismatch check consistent.
        let expectedAmount = null;
        if (order_id.startsWith('KP-')) {
            const b = await Booking.findOne({ orderId: order_id }).select('paidAmount');
            if (b) expectedAmount = b.paidAmount;
        } else if (order_id.startsWith('KPFEE-')) {
            const f = await Fee.findOne({ orderId: order_id }).select('amountDue');
            if (f) expectedAmount = f.amountDue;
        }

        const isPhonePeOrder = order_id.includes('-PP-') || order_id.includes('PHONEPE');
        const verifyResult = isPhonePeOrder 
            ? await verifyPhonePePayment(order_id, expectedAmount)
            : await verifyCFPayment(order_id, expectedAmount);

        if (verifyResult.success && verifyResult.payment_status === 'SUCCESS') {
            if (order_id.startsWith('KP-')) {
                const booking = await Booking.findOne({ orderId: order_id });
                if (booking && (booking.paymentStatus === 'PENDING' || booking.paymentStatus === 'DROPPED' || booking.paymentStatus === 'FAILED')) {
                    // Check slot conflicts before confirming
                    const conflict = await hasSlotConflict({
                        tenantId: booking.tenantId,
                        date: booking.date,
                        sport: booking.sport,
                        timeSlots: booking.timeSlots,
                        excludeBookingId: booking.orderId,
                        onlySuccess: true // Check against success only
                    });
                    if (conflict) {
                        booking.paymentStatus = 'FAILED';
                        booking.paymentDetails = { ...verifyResult.payment_details, error: 'Slot conflict after drop/fail' };
                        await booking.save();
                        return res.status(400).json({ error: 'Slots have already been booked by another user.' });
                    }

                    // Prevent price manipulation by comparing the gateway amount to the database amount
                    if (Math.abs(Number(verifyResult.payment_details.amount) - booking.paidAmount) > 0.01) {
                        console.error(`Price manipulation detected! Booking ID: ${booking._id}. Expected: ${booking.paidAmount}, Paid: ${verifyResult.payment_details.amount}`);
                        booking.paymentStatus = 'FAILED';
                        booking.paymentDetails = { ...verifyResult.payment_details, error: 'Price mismatch' };
                        await booking.save();
                        return res.status(400).json({ error: 'Payment amount mismatch. Security verification failed.' });
                    }
                    booking.paymentStatus = 'SUCCESS';
                    booking.transactionId = verifyResult.payment_details.transaction_id;
                    booking.paymentDetails = verifyResult.payment_details;
                    await booking.save();
                    
                    // Increment coupon usage count if used
                    if (booking.couponCode) {
                        try {
                            const couponObj = await Coupon.findOne({ code: booking.couponCode.toUpperCase() });
                            if (couponObj) {
                                couponObj.usageCount = (couponObj.usageCount || 0) + 1;
                                await couponObj.save();
                            }
                        } catch (couponErr) {
                            console.error('Error updating coupon usage count:', couponErr);
                        }
                    }

                    await cancelConflictingPendingBookings(booking);
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

            const booking = await Booking.findOne({ orderId: order_id });

            return res.json({
                success: true,
                payment_status: 'SUCCESS',
                payment_details: verifyResult.payment_details,
                booking_details: booking ? {
                    customerName: booking.customerName,
                    customerPhone: booking.customerPhone,
                    customerEmail: booking.customerEmail,
                    sport: booking.sport,
                    date: booking.date,
                    timeSlots: booking.timeSlots,
                    totalAmount: booking.totalAmount,
                    paidAmount: booking.paidAmount,
                    discountAmount: booking.discountAmount || booking.discount || 0,
                    couponCode: booking.couponCode,
                    orderId: booking.orderId
                } : null
            });
        }

        // If verification failed or status is not success
        const booking = await Booking.findOne({ orderId: order_id });
        if (booking && booking.paymentStatus === 'PENDING') {
            booking.paymentStatus = 'FAILED';
            await booking.save();
            try {
                await sendFailedBookingNotification(booking);
            } catch (err) {
                console.error('Error sending failed booking notification:', err);
            }
        }

        res.json({
            success: false,
            payment_status: verifyResult.payment_status || 'FAILED',
            payment_link: booking ? booking.paymentLink : null,
            booking_details: booking ? {
                sport: booking.sport,
                date: booking.date,
                timeSlots: booking.timeSlots,
                paidAmount: booking.paidAmount
            } : null
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

        const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY;

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
        } else {
            console.warn('WARNING: Cashfree webhook received but no verification key is configured (CASHFREE_WEBHOOK_SECRET / CASHFREE_SECRET_KEY). Signature check bypassed.');
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
                if (booking && (booking.paymentStatus === 'PENDING' || booking.paymentStatus === 'DROPPED' || booking.paymentStatus === 'FAILED')) {
                    // Check slot conflicts before confirming
                    const conflict = await hasSlotConflict({
                        tenantId: booking.tenantId,
                        date: booking.date,
                        sport: booking.sport,
                        timeSlots: booking.timeSlots,
                        excludeBookingId: booking.orderId,
                        onlySuccess: true
                    });
                    if (conflict) {
                        booking.paymentStatus = 'FAILED';
                        booking.paymentDetails = { ...booking.paymentDetails, error: 'Slot conflict after drop/fail' };
                        await booking.save();
                        return res.json({ processed: true, note: 'Slot already booked by another user. Admin action required.' });
                    }

                    // Validate the paid amount against what is owed (prevents
                    // confirming a booking with an underpaid/tampered order)
                    if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - booking.paidAmount) > 0.01) {
                        console.error(`Webhook amount mismatch! Order: ${orderId}. Expected: ${booking.paidAmount}, Paid: ${paidAmount}`);
                        booking.paymentStatus = 'FAILED';
                        booking.paymentDetails = { ...booking.paymentDetails, error: 'Webhook amount mismatch', webhookPaidAmount: paidAmount };
                        await booking.save();
                        return res.json({ processed: true, note: 'Amount mismatch. Booking not confirmed.' });
                    }
                    booking.paymentStatus = 'SUCCESS';
                    booking.transactionId = transactionId;
                    booking.paymentDetails = {
                        amount: paidAmount,
                        payment_method: (data && data.payment && data.payment.payment_method) || 'CASHFREE',
                        transaction_id: transactionId,
                        webhook: true
                    };
                    await booking.save();

                    // Increment coupon usage count if used
                    if (booking.couponCode) {
                        try {
                            const couponObj = await Coupon.findOne({ code: booking.couponCode.toUpperCase() });
                            if (couponObj) {
                                couponObj.usageCount = (couponObj.usageCount || 0) + 1;
                                await couponObj.save();
                            }
                        } catch (couponErr) {
                            console.error('Error updating coupon usage count:', couponErr);
                        }
                    }

                    await cancelConflictingPendingBookings(booking);
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
        } else if (paymentStatus === 'FAILED' || paymentStatus === 'USER_DROPPED') {
            if (orderId.startsWith('KP-')) {
                const booking = await Booking.findOne({ orderId: orderId });
                if (booking && booking.paymentStatus === 'PENDING') {
                    booking.paymentStatus = 'FAILED';
                    await booking.save();
                    try {
                        await sendFailedBookingNotification(booking);
                    } catch (err) {
                        console.error('Error sending failed booking notification via webhook:', err);
                    }
                }
            }
        }

        res.json({ processed: true });
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).send('Server error processing webhook.');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PhonePe Payment Gateway Integration Endpoints
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/payment/phonepe/initiate — Start PhonePe Checkout
router.post('/payment/phonepe/initiate', async (req, res) => {
    try {
        const { orderId, amount, customerName, customerEmail, customerPhone } = req.body;
        if (!orderId || !amount || !customerPhone) {
            return res.status(400).json({ error: 'orderId, amount, and customerPhone are required.' });
        }

        const backendSelfUrl = (process.env.BACKEND_SELF_URL || 'http://localhost:5001').replace(/\/+$/, '');
        const frontendUrl = (process.env.FRONTEND_URL || 'https://khelopatna.in').replace(/\/+$/, '');

        const redirectUrl = `${backendSelfUrl}/api/payment/phonepe/redirect?order_id=${encodeURIComponent(orderId)}`;
        const callbackUrl = `${backendSelfUrl}/api/payment/phonepe/callback`;

        const ppOrder = await createPhonePeOrder({
            amount: Number(amount),
            orderId,
            customerName: customerName || 'KheloPatna Customer',
            customerEmail: customerEmail || 'service@khelopatna.in',
            customerPhone,
            redirectUrl,
            callbackUrl
        });

        res.json({
            success: true,
            orderId: ppOrder.orderId,
            redirectUrl: ppOrder.redirectUrl,
            mock: ppOrder.mock || false
        });
    } catch (err) {
        console.error('PhonePe initiate error:', err);
        res.status(500).json({ error: err.message || 'Failed to initiate PhonePe payment.' });
    }
});

// ALL /api/payment/phonepe/redirect — Handle customer redirect from PhonePe
router.all('/payment/phonepe/redirect', async (req, res) => {
    try {
        const orderId = req.query.order_id || req.body?.merchantTransactionId || req.body?.order_id;
        const frontendUrl = (process.env.FRONTEND_URL || 'https://khelopatna.in').replace(/\/+$/, '');

        if (!orderId) {
            return res.redirect(`${frontendUrl}/book?payment_status=failed`);
        }

        // Verify PhonePe transaction status
        const verifyResult = await verifyPhonePePayment(orderId);
        const isSuccess = verifyResult.success && verifyResult.payment_status === 'SUCCESS';

        if (isSuccess) {
            if (orderId.startsWith('KP-')) {
                const booking = await Booking.findOne({ orderId });
                if (booking && (booking.paymentStatus === 'PENDING' || booking.paymentStatus === 'DROPPED' || booking.paymentStatus === 'FAILED')) {
                    booking.paymentStatus = 'SUCCESS';
                    booking.paymentMethod = 'phonepe';
                    booking.transactionId = verifyResult.payment_details?.transaction_id || orderId;
                    booking.paymentDetails = verifyResult.payment_details;
                    await booking.save();
                    await cancelConflictingPendingBookings(booking);
                    await sendBookingNotifications(booking);
                }
                return res.redirect(`${frontendUrl}/book?order_id=${encodeURIComponent(orderId)}&payment_status=success`);
            } else if (orderId.startsWith('KPFEE-')) {
                const feeRecord = await Fee.findOne({ orderId });
                if (feeRecord && feeRecord.status !== 'PAID') {
                    feeRecord.status = 'PAID';
                    feeRecord.paymentDate = new Date();
                    feeRecord.amountPaid = feeRecord.amountDue;
                    feeRecord.paymentDetails = verifyResult.payment_details;
                    await feeRecord.save();
                    await sendFeeNotifications(feeRecord);
                }
                return res.redirect(`${frontendUrl}/academy/pay-fees?order_id=${encodeURIComponent(orderId)}&payment_status=success`);
            }
        }

        // Default fallback redirect for failed/cancelled payment
        const targetPage = orderId.startsWith('KPFEE-') ? '/academy/pay-fees' : '/book';
        return res.redirect(`${frontendUrl}${targetPage}?order_id=${encodeURIComponent(orderId)}&payment_status=failed`);
    } catch (err) {
        console.error('PhonePe redirect error:', err);
        const frontendUrl = (process.env.FRONTEND_URL || 'https://khelopatna.in').replace(/\/+$/, '');
        return res.redirect(`${frontendUrl}/book?payment_status=failed`);
    }
});

// POST /api/payment/phonepe/callback — Handle server-to-server webhook
router.post('/payment/phonepe/callback', async (req, res) => {
    try {
        const xVerify = req.headers['x-verify'];
        const responseBase64 = req.body?.response;

        if (responseBase64 && !verifyPPChecksum(responseBase64, xVerify)) {
            console.error('Invalid PhonePe webhook checksum signature.');
            return res.status(400).json({ error: 'Invalid checksum signature.' });
        }

        let decodedData = {};
        if (responseBase64) {
            const decodedJson = Buffer.from(responseBase64, 'base64').toString('utf-8');
            decodedData = JSON.parse(decodedJson);
        }

        const dataObj = decodedData.data || {};
        const orderId = dataObj.merchantTransactionId;
        const code = decodedData.code || dataObj.state;
        const isSuccess = decodedData.success && (code === 'PAYMENT_SUCCESS' || code === 'COMPLETED');

        if (orderId && isSuccess) {
            if (orderId.startsWith('KP-')) {
                const booking = await Booking.findOne({ orderId });
                if (booking && (booking.paymentStatus === 'PENDING' || booking.paymentStatus === 'DROPPED' || booking.paymentStatus === 'FAILED')) {
                    booking.paymentStatus = 'SUCCESS';
                    booking.paymentMethod = 'phonepe';
                    booking.transactionId = dataObj.transactionId || orderId;
                    booking.paymentDetails = {
                        transaction_id: dataObj.transactionId,
                        amount: Number(dataObj.amount) / 100,
                        payment_method: dataObj.paymentInstrument?.type || 'PHONEPE_UPI'
                    };
                    await booking.save();
                    await cancelConflictingPendingBookings(booking);
                    await sendBookingNotifications(booking);
                }
            } else if (orderId.startsWith('KPFEE-')) {
                const feeRecord = await Fee.findOne({ orderId });
                if (feeRecord && feeRecord.status !== 'PAID') {
                    feeRecord.status = 'PAID';
                    feeRecord.paymentDate = new Date();
                    feeRecord.amountPaid = feeRecord.amountDue;
                    feeRecord.paymentDetails = {
                        transaction_id: dataObj.transactionId,
                        amount: Number(dataObj.amount) / 100,
                        payment_method: dataObj.paymentInstrument?.type || 'PHONEPE_UPI'
                    };
                    await feeRecord.save();
                    await sendFeeNotifications(feeRecord);
                }
            }
        }

        res.json({ success: true, processed: true });
    } catch (err) {
        console.error('PhonePe callback webhook error:', err);
        res.status(500).json({ error: 'Internal server error processing PhonePe callback.' });
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
        const AuditLogModel = require('../models/AuditLog');
        await new AuditLogModel({
            tenantId,
            userId: req.user.username,
            module: 'CUSTOMERS',
            action: 'MERGE_CUSTOMERS',
            newData: {
                sourcePhone: cleanSource,
                targetPhone: cleanTarget,
                targetName: targetName.trim(),
                targetEmail: (targetEmail || '').trim()
            }
        }).save();

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
        res.status(500).json({ error: err.message || 'Server error merging customer profiles.' });
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

        // Check slot availability for admin (onlySuccess: true, isAdmin: true)
        const conflict = await hasSlotConflict({ tenantId, date, sport, timeSlots, onlySuccess: true, isAdmin: true });
        if (conflict) {
            return res.status(409).json({ error: 'One or more of the selected slots are already booked.' });
        }

        const orderId = `KP-OFFLINE-${Date.now()}`;
        
        let newBooking;

        if (paymentType === 'link') {
            // Online Checkout Session Flow (bypasses care@cashfree.com link approval restriction)
            const { createOrder } = require('../services/cashfree');
            const returnUrl = `${FRONTEND_URL}/book?order_id=${orderId}&payment_status=success`;
            const cfOrder = await createOrder({
                amount: Number(paidAmount),
                orderId: orderId,
                customerPhone,
                customerName,
                customerEmail: customerEmail || 'no-email@khelopatna.in',
                returnUrl
            });

            const backendUrl = process.env.BACKEND_SELF_URL || 'https://api.khelopatna.in';
            const paymentLink = cfOrder.mock
                ? `${backendUrl.replace(/\/+$/, '')}/mock-payment.html?order_id=${orderId}&amount=${paidAmount}`
                : `${backendUrl.replace(/\/+$/, '')}/checkout.html?session_id=${cfOrder.payment_session_id}&env=${process.env.CASHFREE_ENV || 'sandbox'}`;

            const staffUser = req.user?.username || req.user?.role || 'Admin Staff';
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
                participantsCount: Number(participantsCount || 1),
                bookedBy: `Staff (${staffUser})`
            });

            await newBooking.save();

            // Share Payment Link on WhatsApp
            const totalAmt = Number(totalAmount || 0);
            const advanceDue = Number(paidAmount || 0);
            const balanceRemaining = Math.max(0, totalAmt - advanceDue);
            const formattedTiming = (timeSlots || []).map(formatSlotTo12Hr).join(', ');

            const waText = `💳 *KheloPatna Turf Payment Link* 💳

Dear ${customerName}, your turf booking has been initiated.

*Booking Summary*:
*   Booked By: Staff (${staffUser})
*   Sport: ${sport.toUpperCase()}
*   Date: ${date}
*   Timing: ${formattedTiming}
*   Total Amount: ₹${totalAmt}
*   Advance Due: ₹${advanceDue}
*   Balance Remaining: ₹${balanceRemaining}

To confirm your booking, please pay using this secure link:
🔗 ${paymentLink}

Thank you! 🏆`;
            // Share Payment Link on WhatsApp asynchronously (non-blocking)
            sendWhatsAppMessage(customerPhone, waText).catch(waErr => {
                console.error('Error sending payment link WhatsApp:', waErr);
            });

        } else {
            // Direct / Offline Booking flow
            const staffUser = req.user?.username || req.user?.role || 'Admin Staff';
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
                participantsCount: Number(participantsCount || 1),
                bookedBy: `Staff (${staffUser})`
            });

            await newBooking.save();

            // Cancel other conflicting pending bookings
            await cancelConflictingPendingBookings(newBooking);

            // Trigger standard confirmation alerts asynchronously in background (instant admin response)
            sendBookingNotifications(newBooking).catch(notifyErr => {
                console.error('Error sending offline booking notifications in background:', notifyErr);
            });
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
        res.status(500).json({ error: err.message || 'Server error creating booking.' });
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
            excludeBookingId: booking._id,
            onlySuccess: true // Check against success only
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
                
                // If it is a transaction/amount mismatch or mock error, allow booking cancellation but flag the refund details.
                const isMismatchError = refundErr.message.includes('greater than') || 
                                        refundErr.message.includes('transaction amount') ||
                                        refundErr.message.includes('not paid') ||
                                        refundErr.message.includes('no transaction') ||
                                        refundErr.message.includes('mismatch') ||
                                        refundErr.message.includes('authentication') ||
                                        refundErr.message.includes('Failed to initiate');
                                        
                if (isMismatchError) {
                    refundDetails = {
                        status: 'FAILED_GATEWAY',
                        amount: booking.paidAmount,
                        error: refundErr.message,
                        note: 'Gateway refund failed (mismatch/already refunded). Cancellation completed.',
                        failedAt: new Date()
                    };
                } else {
                    return res.status(502).json({ error: `Cashfree refund failed: ${refundErr.message}` });
                }
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
            message: refundDetails && refundDetails.status === 'FAILED_GATEWAY'
                ? `Booking cancelled successfully, but gateway refund failed: ${refundDetails.error}. Please handle the refund manually if needed.`
                : (refundDetails 
                    ? 'Booking cancelled and refund initiated successfully.' 
                    : 'Booking cancelled successfully (no refund).'), 
            booking 
        });
    } catch (err) {
        console.error('Cancel-refund booking error:', err);
        res.status(500).json({ error: err.message || 'Server error cancelling booking.' });
    }
});

// ── Coupons Routes ────────────────────────────────────────────────

// POST /api/payment/validate-coupon
router.post('/payment/validate-coupon', async (req, res) => {
    const { code, amount } = req.body;

    if (!code || !amount) {
        return res.status(400).json({ error: 'Coupon code and order amount are required.' });
    }

    try {
        const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

        if (!coupon) {
            return res.status(404).json({ error: 'Invalid coupon code.' });
        }

        if (!coupon.isActive) {
            return res.status(400).json({ error: 'This coupon is no longer active.' });
        }

        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ error: 'This coupon has expired.' });
        }

        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ error: 'This coupon has reached its usage limit.' });
        }

        const minAmount = Number(coupon.minOrderAmount || 0);
        if (Number(amount) < minAmount) {
            return res.status(400).json({ error: `Minimum order amount of ₹${minAmount} is required to apply this coupon.` });
        }

        let discount = 0;
        if (coupon.discountType === 'PERCENT') {
            discount = (Number(amount) * Number(coupon.discountValue)) / 100;
            if (coupon.maxDiscountAmount !== null) {
                discount = Math.min(discount, Number(coupon.maxDiscountAmount));
            }
        } else if (coupon.discountType === 'FLAT') {
            discount = Number(coupon.discountValue);
        }

        discount = Math.min(discount, Number(amount));
        const finalAmount = Math.max(0, Number(amount) - discount);

        res.json({
            success: true,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount: discount,
            finalAmount
        });

    } catch (err) {
        console.error('Validate coupon error:', err);
        res.status(500).json({ error: 'Server error validating coupon.' });
    }
});

// GET /api/admin/coupons
router.get('/admin/coupons', authenticateToken, authorizeRoles('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const coupons = await Coupon.find({}).sort('-createdAt');
        res.json(coupons);
    } catch (err) {
        console.error('List coupons error:', err);
        res.status(500).json({ error: 'Server error listing coupons.' });
    }
});

// POST /api/admin/coupons
router.post('/admin/coupons', authenticateToken, authorizeRoles('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const { code, discountType, discountValue, minOrderAmount, maxDiscountAmount, expiryDate, isActive, usageLimit } = req.body;

    if (!code || !discountType || discountValue === undefined) {
        return res.status(400).json({ error: 'Code, discount type, and value are required.' });
    }

    try {
        const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
        if (existing) {
            return res.status(400).json({ error: 'A coupon with this code already exists.' });
        }

        const coupon = new Coupon({
            code: code.toUpperCase().trim(),
            discountType,
            discountValue: Number(discountValue),
            minOrderAmount: Number(minOrderAmount || 0),
            maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
            expiryDate: expiryDate || null,
            isActive: isActive !== false,
            usageLimit: usageLimit ? Number(usageLimit) : null,
            usageCount: 0
        });

        await coupon.save();

        await new AuditLog({
            tenantId: req.user.tenantId,
            userId: req.user.username,
            module: 'Payments',
            action: 'CREATE_COUPON',
            newData: coupon
        }).save();

        res.json({ success: true, coupon });
    } catch (err) {
        console.error('Create coupon error:', err);
        res.status(500).json({ error: err.message || 'Server error creating coupon.' });
    }
});

// DELETE /api/admin/coupons/:id
router.delete('/admin/coupons/:id', authenticateToken, authorizeRoles('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found.' });
        }

        await Coupon.findByIdAndDelete(req.params.id);

        await new AuditLog({
            tenantId: req.user.tenantId,
            userId: req.user.username,
            module: 'Payments',
            action: 'DELETE_COUPON',
            newData: { id: req.params.id, code: coupon.code }
        }).save();

        res.json({ success: true, message: 'Coupon deleted successfully.' });
    } catch (err) {
        console.error('Delete coupon error:', err);
        res.status(500).json({ error: 'Server error deleting coupon.' });
    }
});

// GET /api/admin/test-smtp
// Diagnostic endpoint to test Hostinger SMTP ports and servers
router.get('/admin/test-smtp', authenticateToken, async (req, res) => {
    const nodemailer = require('nodemailer');
    const results = [];

    const configsToTest = [
        { name: 'Hostinger Standard (Port 465 SSL)', host: process.env.SMTP_HOST || 'smtp.hostinger.com', port: 465, secure: true },
        { name: 'Hostinger Standard (Port 587 STARTTLS)', host: process.env.SMTP_HOST || 'smtp.hostinger.com', port: 587, secure: false },
        { name: 'Hostinger Titan Mail (Port 465 SSL)', host: 'smtp.titan.email', port: 465, secure: true },
        { name: 'Hostinger Titan Mail (Port 587 TLS)', host: 'smtp.titan.email', port: 587, secure: false },
        { name: 'Direct Domain Mail (Port 465 SSL)', host: 'mail.khelopatna.in', port: 465, secure: true },
        { name: 'Direct Domain Mail (Port 587 TLS)', host: 'mail.khelopatna.in', port: 587, secure: false }
    ];

    for (const cfg of configsToTest) {
        try {
            const tp = nodemailer.createTransport({
                host: cfg.host,
                port: cfg.port,
                secure: cfg.secure,
                auth: {
                    user: process.env.SMTP_USER || 'service@khelopatna.in',
                    pass: process.env.SMTP_PASS || ''
                },
                connectionTimeout: 6000,
                greetingTimeout: 6000,
                socketTimeout: 6000,
                tls: { rejectUnauthorized: false }
            });
            await tp.verify();
            results.push({ config: cfg.name, host: cfg.host, port: cfg.port, status: 'CONNECTED_SUCCESSFULLY' });
        } catch (err) {
            results.push({ config: cfg.name, host: cfg.host, port: cfg.port, status: 'FAILED', error: err.message });
        }
    }

    res.json({
        smtpUser: process.env.SMTP_USER || 'service@khelopatna.in',
        hasPasswordSet: !!(process.env.SMTP_PASS && process.env.SMTP_PASS !== 'YOUR_HOSTINGER_MAIL_PASSWORD'),
        diagnosticResults: results
    });
});

// GET /api/admin/bookings-lookup
// Lookup booking by date and slot for interactive slot details modal
router.get('/admin/bookings-lookup', authenticateToken, async (req, res) => {
    const { date, slot } = req.query;
    if (!date || !slot) {
        return res.status(400).json({ error: 'Date and slot parameters are required.' });
    }
    try {
        const booking = await Booking.findOne({
            date: date,
            timeSlots: slot,
            paymentStatus: { $ne: 'CANCELLED' }
        }).sort({ createdAt: -1 });
        res.json({ booking });
    } catch (err) {
        console.error('Bookings lookup error:', err);
        res.status(500).json({ error: 'Server error looking up booking.' });
    }
});

module.exports = router;
