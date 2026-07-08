const ChatSession = require('../models/ChatSession');
const Booking = require('../models/Booking');
const TurfSettings = require('../models/TurfSettings');
const TurfClosure = require('../models/TurfClosure');
const { sendWhatsAppMessage, registerBotListener } = require('./whatsapp');
const { createPaymentLink } = require('./cashfree');

const ALL_HOURLY_SLOTS = [
    { value: '00-01', text: '12:00 AM - 01:00 AM', startHour: 0 },
    { value: '01-02', text: '01:00 AM - 02:00 AM', startHour: 1 },
    { value: '02-03', text: '02:00 AM - 03:00 AM', startHour: 2 },
    { value: '03-04', text: '03:00 AM - 04:00 AM', startHour: 3 },
    { value: '04-05', text: '04:00 AM - 05:00 AM', startHour: 4 },
    { value: '05-06', text: '05:00 AM - 06:00 AM', startHour: 5 },
    { value: '06-07', text: '06:00 AM - 07:00 AM', startHour: 6 },
    { value: '07-08', text: '07:00 AM - 08:00 AM', startHour: 7 },
    { value: '08-09', text: '08:00 AM - 09:00 AM', startHour: 8 },
    { value: '09-10', text: '09:00 AM - 10:00 AM', startHour: 9 },
    { value: '10-11', text: '10:00 AM - 11:00 AM', startHour: 10 },
    { value: '11-12', text: '11:00 AM - 12:00 PM', startHour: 11 },
    { value: '12-13', text: '12:00 PM - 01:00 PM', startHour: 12 },
    { value: '13-14', text: '01:00 PM - 02:00 PM', startHour: 13 },
    { value: '14-15', text: '02:00 PM - 03:00 PM', startHour: 14 },
    { value: '15-16', text: '03:00 PM - 04:00 PM', startHour: 15 },
    { value: '16-17', text: '04:00 PM - 05:00 PM', startHour: 16 },
    { value: '17-18', text: '05:00 PM - 06:00 PM', startHour: 17 },
    { value: '18-19', text: '06:00 PM - 07:00 PM', startHour: 18 },
    { value: '19-20', text: '07:00 PM - 08:00 PM', startHour: 19 },
    { value: '20-21', text: '08:00 PM - 09:00 PM', startHour: 20 },
    { value: '21-22', text: '09:00 PM - 10:00 PM', startHour: 21 },
    { value: '22-23', text: '10:00 PM - 11:00 PM', startHour: 22 },
    { value: '23-24', text: '11:00 PM - 12:00 AM', startHour: 23 }
];

// Helper to extract message text
const getMessageText = (m) => {
    return m.message?.conversation || 
           m.message?.extendedTextMessage?.text || 
           m.message?.imageMessage?.caption || 
           '';
};

// Date validation regex: DD-MM-YYYY
const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;

// Format Date object to YYYY-MM-DD
const formatDateStr = (date) => {
    return date.toISOString().split('T')[0];
};

/**
 * Main incoming message handler for WhatsApp Booking Bot.
 */
async function handleIncomingMessage(sock, m) {
    const phoneJid = m.key.remoteJid;
    const phone = phoneJid.split('@')[0]; // Extract phone number
    const text = getMessageText(m).trim();

    if (!text) return; // Skip empty messages

    // 1. Fetch or create user session
    let session = await ChatSession.findOne({ phone: phone });
    if (!session) {
        session = new ChatSession({ phone: phone });
        await session.save();
    }

    const lowerText = text.toLowerCase();

    // Global 'Cancel' trigger
    if (lowerText === 'cancel') {
        session.state = 'IDLE';
        session.bookingData = {};
        await session.save();
        await sendWhatsAppMessage(phone, '❌ Booking session cancelled. Send *Book* to start a new booking!');
        return;
    }

    switch (session.state) {
        case 'IDLE':
            if (['hi', 'hello', 'hey', 'book', 'booking', 'turf', 'khelo', 'play'].some(k => lowerText.includes(k))) {
                session.state = 'SELECTING_SPORT';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `👋 Welcome to *KheloPatna Elite Turf*! 🏏⚽\n\nPatna's premier smart indoor sports arena.\n\nPlease choose a sport to book:\n1️⃣ *Cricket*\n2️⃣ *Football*\n\nReply with *1* or *2* to choose.`
                );
            } else {
                await sendWhatsAppMessage(phone, `Hello! Welcome to *KheloPatna Elite Turf*. Reply with *Book* to start reserving a slot!`);
            }
            break;

        case 'SELECTING_SPORT':
            if (text === '1' || lowerText.includes('cricket')) {
                session.bookingData = { sport: 'cricket' };
                session.state = 'SELECTING_DATE';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `🏏 You selected *Cricket Turf*.\n\nPlease enter the booking date in *DD-MM-YYYY* format (e.g. 25-06-2026), or reply with *today* or *tomorrow*.`
                );
            } else if (text === '2' || lowerText.includes('football')) {
                session.bookingData = { sport: 'football' };
                session.state = 'SELECTING_DATE';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `⚽ You selected *Football Turf*.\n\nPlease enter the booking date in *DD-MM-YYYY* format (e.g. 25-06-2026), or reply with *today* or *tomorrow*.`
                );
            } else {
                await sendWhatsAppMessage(phone, `Invalid selection. Please reply with *1* for Cricket or *2* for Football.`);
            }
            break;

        case 'SELECTING_DATE':
            let targetDateStr = '';
            const today = new Date();

            if (lowerText === 'today') {
                targetDateStr = formatDateStr(today);
            } else if (lowerText === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(today.getDate() + 1);
                targetDateStr = formatDateStr(tomorrow);
            } else {
                const match = text.match(dateRegex);
                if (match) {
                    const day = match[1];
                    const month = match[2];
                    const year = match[3];
                    targetDateStr = `${year}-${month}-${day}`; // convert to YYYY-MM-DD
                }
            }

            if (!targetDateStr) {
                await sendWhatsAppMessage(phone, `⚠️ Invalid date format. Please reply with a valid date in *DD-MM-YYYY* format, or reply *today* / *tomorrow*.`);
                return;
            }

            const checkDate = new Date(targetDateStr + 'T00:00:00');
            const todayReset = new Date();
            todayReset.setHours(0, 0, 0, 0);

            if (checkDate < todayReset) {
                await sendWhatsAppMessage(phone, `⚠️ The date cannot be in the past. Please enter a valid date (today or in the future).`);
                return;
            }

            try {
                let settings = await TurfSettings.findOne();
                if (!settings) {
                    settings = new TurfSettings({
                        cricketBaseRate: 1200,
                        footballBaseRate: 1500,
                        netsBaseRate: 800,
                        blackoutHours: { start: 15, end: 18 }
                    });
                    await settings.save();
                }
                // Safely ensure properties exist
                if (!settings.blackoutHours) {
                    settings.blackoutHours = { start: 15, end: 18 };
                }
                if (settings.cricketBaseRate === undefined || settings.cricketBaseRate === null) settings.cricketBaseRate = 1200;
                if (settings.footballBaseRate === undefined || settings.footballBaseRate === null) settings.footballBaseRate = 1500;

                const bookings = await Booking.find({
                    date: targetDateStr,
                    sport: session.bookingData.sport,
                    paymentStatus: 'SUCCESS'
                });

                const bookedSlots = new Set();
                bookings.forEach(b => b.timeSlots.forEach(s => bookedSlots.add(s)));

                const dayOfWeek = checkDate.getDay();
                const startOfDay = new Date(targetDateStr + 'T00:00:00');
                const endOfDay = new Date(targetDateStr + 'T23:59:59');

                const closures = await TurfClosure.find({
                    $or: [
                        { startDate: { $lte: endOfDay }, endDate: { $gte: startOfDay } },
                        { recurringDay: dayOfWeek }
                    ]
                });

                const hourlyRate = session.bookingData.sport === 'cricket' ? settings.cricketBaseRate : settings.footballBaseRate;
                let availableList = [];
                let slotIndex = 1;

                // Temporary cache in session to store index mapping
                const indexToSlotValueMap = {};

                ALL_HOURLY_SLOTS.forEach(slot => {
                    const isBooked = bookedSlots.has(slot.value);
                    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
                    const isBlackout = isWeekday && slot.startHour >= settings.blackoutHours.start && slot.startHour < settings.blackoutHours.end;
                    
                    let isCustomClosure = false;
                    closures.forEach(c => {
                        if (c.recurringDay === dayOfWeek) {
                            isCustomClosure = true;
                        } else {
                            const slotStart = new Date(targetDateStr + `T${slot.value.split('-')[0]}:00:00`);
                            if (slotStart >= c.startDate && slotStart < c.endDate) {
                                isCustomClosure = true;
                            }
                        }
                    });

                    if (!isBooked && !isBlackout && !isCustomClosure) {
                        availableList.push(`*${slotIndex}*. ${slot.text} (₹${hourlyRate})`);
                        indexToSlotValueMap[slotIndex] = slot.value;
                        slotIndex++;
                    }
                });

                if (availableList.length === 0) {
                    await sendWhatsAppMessage(phone, `😔 Sorry, no slots are available for *${session.bookingData.sport.toUpperCase()}* on *${targetDateStr}*. Please try another date.`);
                    return;
                }

                // Save state data
                session.bookingData.date = targetDateStr;
                session.bookingData.totalAmount = hourlyRate; // temporary base rate placeholder
                session.state = 'SELECTING_SLOTS';
                // Store maps in session. Use mixed type schema support
                session.set('slotMap', indexToSlotValueMap);
                await session.save();

                await sendWhatsAppMessage(phone, 
                    `📅 Available slots for *${session.bookingData.sport.toUpperCase()}* on *${targetDateStr}*:\n\n${availableList.join('\n')}\n\nReply with the slot number(s) you wish to book.\n*Note*: If booking multiple slots, separate them with commas (e.g. *1,2*).`
                );

            } catch (err) {
                console.error('Error listing bot slots:', err);
                await sendWhatsAppMessage(phone, `⚠️ Error loading slots. Please type *Cancel* and try again.`);
            }
            break;

        case 'SELECTING_SLOTS':
            const selections = text.split(',').map(s => s.trim());
            const slotMap = session.get('slotMap');

            if (!slotMap || selections.some(s => !slotMap[s])) {
                await sendWhatsAppMessage(phone, `⚠️ Invalid selection. Please reply with the numbers of the slots you want to book (e.g. *1* or *1,2*).`);
                return;
            }

            const chosenSlotValues = selections.map(s => slotMap[s]);

            // Save slots and calculate total price
            try {
                let settings = await TurfSettings.findOne();
                const rate = session.bookingData.sport === 'cricket' ? settings.cricketBaseRate : settings.footballBaseRate;
                const totalAmount = rate * chosenSlotValues.length;

                session.bookingData.slots = chosenSlotValues;
                session.bookingData.totalAmount = totalAmount;
                session.state = 'ENTERING_NAME';
                await session.save();

                await sendWhatsAppMessage(phone, 
                    `✅ Selected slots: *${chosenSlotValues.join(', ')}*\n💰 Total Price: *₹${totalAmount}*.\n\nPlease reply with your *Full Name* to register this booking.`
                );
            } catch (err) {
                console.error('Error saving slots selection:', err);
                await sendWhatsAppMessage(phone, `⚠️ Server error. Please type *Cancel* to restart.`);
            }
            break;

        case 'ENTERING_NAME':
            session.bookingData.name = text;
            session.state = 'ENTERING_EMAIL';
            await session.save();
            await sendWhatsAppMessage(phone, `Thank you, *${text}*! Now reply with your *Email Address* for receipt verification.`);
            break;

        case 'ENTERING_EMAIL':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(lowerText)) {
                await sendWhatsAppMessage(phone, `⚠️ Invalid email format. Please reply with a valid email (e.g. name@domain.com).`);
                return;
            }

            session.bookingData.email = lowerText;
            const orderId = `KP-WA-${Date.now()}`;
            session.bookingData.orderId = orderId;

            try {
                // Generate Cashfree payment link
                const paymentLink = await createPaymentLink({
                    linkId: orderId,
                    amount: session.bookingData.totalAmount,
                    customerPhone: phone,
                    customerName: session.bookingData.name,
                    customerEmail: session.bookingData.email,
                    returnUrl: `${process.env.FRONTEND_URL || 'https://khelopatna.in'}/book?order_id=${orderId}`
                });

                session.state = 'AWAITING_PAYMENT';
                await session.save();

                await sendWhatsAppMessage(phone, 
                    `🎟️ * KheloPatna Booking Invoice* 🎟️\n\n*Customer*: ${session.bookingData.name}\n*Sport*: ${session.bookingData.sport.toUpperCase()}\n*Date*: ${session.bookingData.date}\n*Slots*: ${session.bookingData.slots.join(', ')}\n*Total Price*: ₹${session.bookingData.totalAmount}\n\nPlease pay using this secure link:\n🔗 ${paymentLink}\n\n*Note*: Once paid, your slots will lock and booking is confirmed automatically here on WhatsApp!`
                );

            } catch (err) {
                console.error('Error generating payment link:', err);
                await sendWhatsAppMessage(phone, `⚠️ Payment gateway connection failed. Please try again or type *Cancel*.`);
            }
            break;

        case 'AWAITING_PAYMENT':
            try {
                const reminderLink = await createPaymentLink({
                    linkId: session.bookingData.orderId,
                    amount: session.bookingData.totalAmount,
                    customerPhone: phone,
                    customerName: session.bookingData.name,
                    customerEmail: session.bookingData.email
                });
                await sendWhatsAppMessage(phone, 
                    `Awaiting online payment of *₹${session.bookingData.totalAmount}*.\n🔗 Payment Link: ${reminderLink}\n\nIf you want to start a new booking, type *Cancel*.`
                );
            } catch (err) {
                console.error('Error regenerating payment link:', err);
                await sendWhatsAppMessage(phone, `⚠️ Could not generate the payment link right now. Please try again in a few minutes, or type *Cancel* to restart.`);
            }
            break;
    }
}

// Register as the listener for WhatsApp messageupsert events
registerBotListener(handleIncomingMessage);

module.exports = {
    handleIncomingMessage
};
