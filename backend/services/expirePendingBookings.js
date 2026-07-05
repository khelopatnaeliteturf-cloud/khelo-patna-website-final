const Booking = require('../models/Booking');

// Must match the pending-payment window used by hasSlotConflict in
// routes/payments.js: PENDING bookings block slots for 15 minutes.
const PENDING_EXPIRY_MS = 15 * 60 * 1000;

/**
 * Marks stale PENDING bookings as FAILED so they stop appearing in
 * dashboards and their slots are definitively released. Slot-conflict
 * checks already ignore PENDING bookings older than the window, so this
 * sweep is cleanup/consistency rather than the release mechanism itself.
 */
async function expireStalePendingBookings() {
    const cutoff = new Date(Date.now() - PENDING_EXPIRY_MS);
    try {
        const result = await Booking.updateMany(
            { paymentStatus: 'PENDING', createdAt: { $lt: cutoff } },
            {
                $set: {
                    paymentStatus: 'FAILED',
                    paymentDetails: { error: 'Payment window expired', expiredAt: new Date() }
                }
            }
        );
        if (result.modifiedCount > 0) {
            console.log(`[Booking Expiry] Marked ${result.modifiedCount} stale PENDING booking(s) as FAILED.`);
        }
        return result.modifiedCount;
    } catch (err) {
        console.error('[Booking Expiry] Sweep failed:', err.message);
        return 0;
    }
}

/**
 * Starts the periodic sweep. Runs every 5 minutes by default.
 */
function startBookingExpirySweep(intervalMs = 5 * 60 * 1000) {
    // Run once shortly after boot to clean up anything left from downtime
    setTimeout(expireStalePendingBookings, 30 * 1000);
    const timer = setInterval(expireStalePendingBookings, intervalMs);
    // Don't keep the process alive just for the sweep
    if (timer.unref) timer.unref();
    return timer;
}

module.exports = { expireStalePendingBookings, startBookingExpirySweep };
