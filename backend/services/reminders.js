'use strict';

const Booking = require('../models/Booking');
const whatsappService = require('./whatsapp');

/**
 * Checks for upcoming turf bookings today and sends a WhatsApp reminder 2 hours before the slot.
 */
async function checkAndSendBookingReminders() {
    try {
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
        const now = new Date();
        const currentHour = now.getHours();

        // Fetch today's active bookings that haven't received a reminder yet
        let upcomingBookings = [];
        try {
            upcomingBookings = await Booking.find({
                date: todayStr,
                paymentStatus: { $in: ['SUCCESS', 'COMPLETED'] },
                reminderSent: { $ne: true }
            });
        } catch (queryErr) {
            // Fallback if reminderSent column doesn't exist yet on PostgreSQL table
            const allTodayBookings = await Booking.find({
                date: todayStr,
                paymentStatus: { $in: ['SUCCESS', 'COMPLETED'] }
            });
            upcomingBookings = (allTodayBookings || []).filter(b => !b.reminderSent && !b.paymentDetails?.reminderSent);
        }

        for (const b of upcomingBookings) {
            if (!b || !b.timeSlots || b.timeSlots.length === 0 || !b.customerPhone) continue;
            if (b.reminderSent || b.paymentDetails?.reminderSent) continue;

            // Parse earliest slot starting hour (e.g. "20-21" -> 20)
            const firstSlot = b.timeSlots[0];
            const startHour = parseInt(String(firstSlot).split('-')[0], 10);
            if (isNaN(startHour)) continue;

            const hoursUntilSlot = startHour - currentHour;

            // Send reminder if slot is 1 to 2 hours away
            if (hoursUntilSlot >= 1 && hoursUntilSlot <= 2) {
                const customerName = b.customerName || 'Sports Fan';
                const sportName = (b.sport || 'Turf').charAt(0).toUpperCase() + (b.sport || 'turf').slice(1);
                
                // Format slots to human readable
                const slotText = (b.timeSlots || []).map(s => {
                    const parts = String(s).split('-');
                    const start = parseInt(parts[0], 10);
                    const end = parseInt(parts[1], 10);
                    const formatH = (h) => {
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 || 12;
                        return `${String(h12).padStart(2, '0')}:00 ${ampm}`;
                    };
                    return `${formatH(start)} - ${formatH(end)}`;
                }).join(', ');

                const msg = `⚽ *KheloPatna Elite Turf — Slot Reminder* 🏏\n\n` +
                            `Hi *${customerName}*, this is a friendly reminder for your upcoming turf booking today!\n\n` +
                            `🏟️ *Arena*: ${sportName} Turf\n` +
                            `⏰ *Slot Time*: ${slotText}\n` +
                            `📅 *Date*: Today (${b.date})\n` +
                            `📍 *Location*: S.D. Public School Campus, Near ICICI Bank, Kumhrar, Patna\n` +
                            `📞 *Helpline*: (+91) 970 970 1400\n\n` +
                            `Please reach 10 minutes prior to your slot time. Have a great match! 🏆`;

                await whatsappService.sendMessage(b.customerPhone, msg);
                try {
                    b.reminderSent = true;
                    b.paymentDetails = { ...(b.paymentDetails || {}), reminderSent: true };
                    await b.save();
                } catch (saveErr) {
                    console.warn('[Reminder Service] Flag set note:', saveErr.message);
                }
                console.log(`[Reminder Service] Sent 2-hour WhatsApp reminder to ${b.customerName} (${b.customerPhone}) for slot ${slotText}.`);
            }
        }
    } catch (err) {
        console.error('[Reminder Service] Error running reminder check:', err.message || err);
    }
}

function startReminderCron() {
    // Run reminder check every 5 minutes
    setInterval(checkAndSendBookingReminders, 5 * 60 * 1000);
    // Initial check on boot
    setTimeout(checkAndSendBookingReminders, 10000);
}

module.exports = {
    checkAndSendBookingReminders,
    startReminderCron
};
