const axios = require('axios');
const ChatSession = require('../models/ChatSession');
const Booking = require('../models/Booking');
const TurfSettings = require('../models/TurfSettings');
const TurfClosure = require('../models/TurfClosure');
const { sendWhatsAppMessage, registerBotListener, getBotEnabled } = require('./whatsapp');
const { createPaymentLink } = require('./cashfree');
const { processAIChat } = require('./aiChatbot');

// Groq / Grok / Gemini AI NLU Intent Parser for WhatsApp Auto-Booking
async function getAIBotIntent(userMessage) {
    return await processAIChat({ userMessage });
}

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

// Helper to extract message text from any Baileys message wrapper
const getMessageText = (m) => {
    if (!m || !m.message) return '';
    const msg = m.message.ephemeralMessage?.message 
             || m.message.viewOnceMessage?.message 
             || m.message.viewOnceMessageV2?.message 
             || m.message;

    return msg.conversation || 
           msg.extendedTextMessage?.text || 
           msg.imageMessage?.caption || 
           msg.videoMessage?.caption ||
           msg.buttonsResponseMessage?.selectedButtonId ||
           msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
           '';
};

// Date validation regex: DD-MM-YYYY
const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;

// Format Date object to YYYY-MM-DD
const formatDateStr = (date) => {
    return date.toISOString().split('T')[0];
};

// Compute dynamic time-based greeting for IST (UTC+5:30)
const getTimeBasedGreeting = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset);
    const hour = istDate.getHours();

    if (hour >= 5 && hour < 12) {
        return 'Good Morning ☀️';
    } else if (hour >= 12 && hour < 17) {
        return 'Good Afternoon 🌤️';
    } else {
        return 'Good Evening 🌙';
    }
};

// Send Main Interactive Menu
const sendMainMenu = async (phone) => {
    const greeting = getTimeBasedGreeting();
    const menuText = `Hello! 👋 *${greeting}*

Welcome to *KheloPatna Elite Turf* 🏆
Patna's premier indoor sports arena & academy.

How may I help you today? Please reply with a number:

1️⃣ *Turf Slot Booking & Rates* 🏟️
2️⃣ *Training Academy (Cricket & Football)* 🎓
3️⃣ *Talk to Human Agent / Support* 📞

_Reply with *1*, *2*, or *3* to choose, or reply *Cancel* anytime._`;

    await sendWhatsAppMessage(phone, menuText);
};

// Send Turf Submenu with live rates
const sendTurfSubmenu = async (phone) => {
    let cricketRate = 1000;
    let footballRate = 1000;
    let netsRate = 100;
    try {
        const settings = await TurfSettings.findOne();
        if (settings) {
            cricketRate = settings.cricketBaseRate || 1000;
            footballRate = settings.footballBaseRate || 1000;
            netsRate = settings.weeklyRates?.nets?.[0] || settings.netsBaseRate || 100;
        }
    } catch (e) {
        console.error('Error fetching turf settings for submenu:', e);
    }

    const text = `🏟️ *KheloPatna Turf Bookings & Rates*

*Live Rates*:
🏏 *Cricket*: ₹${cricketRate} / hr (Weekdays) | ₹1,200 / hr (Weekends)
⚽ *Football*: ₹${footballRate} / hr (Weekdays) | ₹1,200 / hr (Weekends)
🎯 *Nets*: ₹${netsRate} / hr per head

Please choose an option:
1️⃣ *Book Turf Slot Online* (Instant Reservation)
2️⃣ *View Rates & Operating Hours*
3️⃣ *Arena Location & Directions*
4️⃣ 🔙 *Return to Main Menu*

_Reply with *1*, *2*, *3*, or *4*._`;
    await sendWhatsAppMessage(phone, text);
};

// Send Academy Submenu
const sendAcademySubmenu = async (phone) => {
    const text = `🎓 *KheloPatna Training Academy*

Please choose an option:
1️⃣ *Coaching Batches & Programs*
2️⃣ *Pay Academy Fees Online*
3️⃣ *Submit Admission Enquiry*
4️⃣ 🔙 *Return to Main Menu*

_Reply with *1*, *2*, *3*, or *4*._`;
    await sendWhatsAppMessage(phone, text);
};

// Send Support / Human Agent Details
const sendSupportInfo = async (phone) => {
    const text = `📞 *KheloPatna Customer Support*

Our staff and reception desk are available daily from *6:00 AM to 11:00 PM*.

📱 *Phone Hotline*: (+91) 970 970 1400
✉️ *Email Support*: service@khelopatna.in
📍 *Location*: Near ICICI Bank, Kumhrar, Sandalpur Road, Patna – 800007
🌐 *Website*: https://khelopatna.in

Our reception desk has been notified. A team member will assist you shortly!

_Reply *Menu* to return to the main menu._`;
    await sendWhatsAppMessage(phone, text);
};

/**
 * Main incoming message handler for WhatsApp Booking Bot.
 * Supports both local Baileys socket events and external microservice webhooks.
 */
async function handleIncomingMessage(sockOrPayload, m) {
    if (!getBotEnabled()) {
        console.log('🤖 [WhatsApp Bot] Bot is currently DISABLED by Admin toggle. Skipping auto-reply.');
        return;
    }

    let phone = '';
    let text = '';

    if (sockOrPayload && typeof sockOrPayload === 'object' && sockOrPayload.phone && sockOrPayload.text) {
        // External microservice webhook payload
        phone = String(sockOrPayload.phone).replace(/\D/g, '');
        text = String(sockOrPayload.text).trim();
    } else if (m && m.key) {
        // Local Baileys socket message
        const phoneJid = m.key.remoteJid;
        if (!phoneJid || phoneJid.endsWith('@g.us') || phoneJid === 'status@broadcast') return;
        phone = phoneJid.split('@')[0];
        text = getMessageText(m).trim();
    }

    if (!phone || !text) return; // Skip invalid or empty messages

    // In-memory session fallback cache to prevent database bottlenecks
    if (!globalThis.__botMemorySessions) {
        globalThis.__botMemorySessions = new Map();
    }
    const memorySessions = globalThis.__botMemorySessions;

    // 1. Fetch or create user session
    let session = null;
    try {
        session = await ChatSession.findOne({ phone: phone });
    } catch (dbErr) {
        console.warn('ChatSession DB lookup warning, falling back to memory session:', dbErr.message);
    }

    if (!session) {
        let memData = memorySessions.get(phone) || { state: 'MAIN_MENU', bookingData: {} };
        session = {
            phone,
            state: memData.state || 'MAIN_MENU',
            bookingData: memData.bookingData || {},
            save: async function() {
                memorySessions.set(phone, { state: this.state, bookingData: this.bookingData });
                try {
                    const existing = await ChatSession.findOne({ phone: phone });
                    if (existing) {
                        existing.state = this.state;
                        existing.bookingData = this.bookingData;
                        await existing.save();
                    } else {
                        await new ChatSession({ phone: phone, state: this.state, bookingData: this.bookingData }).save();
                    }
                } catch (e) {
                    // Ignore background DB save error, memory session holds state
                }
            }
        };
    }

    const lowerText = text.toLowerCase();

    // Global 'Cancel', 'Menu', or 'Agent' triggers (always active)
    if (lowerText === 'cancel' || lowerText === 'menu' || lowerText === 'main menu' || lowerText === 'home' || lowerText === 'hi' || lowerText === 'hello' || lowerText === 'hey') {
        session.state = 'MAIN_MENU';
        session.bookingData = {};
        await session.save();
        await sendMainMenu(phone);
        return;
    }

    if (lowerText.includes('agent') || lowerText.includes('human') || lowerText.includes('support') || lowerText.includes('owner') || lowerText.includes('manager')) {
        session.state = 'AGENT_SUPPORT';
        await session.save();
        await sendWhatsAppMessage(phone, 'Aapko humare support manager se connect kar rahe hain (+91 970 970 1400) 📞.');
        return;
    }

    // AI Multilingual NLU Chatbot & Intent Dispatcher (ONLY for IDLE or MAIN_MENU states)
    if (session.state === 'IDLE' || session.state === 'MAIN_MENU') {
        const aiIntent = await getAIBotIntent(text);
        if (aiIntent) {
            if (aiIntent.requiresHuman) {
                session.state = 'AGENT_SUPPORT';
                await session.save();
                await sendWhatsAppMessage(phone, aiIntent.reply || 'Aapko humare support manager se connect kar rahe hain (+91 970 970 1400).');
                return;
            }

            if (aiIntent.intent === 'BOOK_CRICKET' || (aiIntent.extractedData?.sport === 'cricket')) {
                session.state = 'SELECTING_DATE';
                session.bookingData = { sport: 'cricket' };
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `${aiIntent.reply || 'Haan bhaiya! Cricket Turf book kar dete hain.'}\n\n📅 Date select kijiye in *DD-MM-YYYY* format, ya type kijiye *today* / *tomorrow*.`
                );
                return;
            } else if (aiIntent.intent === 'BOOK_FOOTBALL' || (aiIntent.extractedData?.sport === 'football')) {
                session.state = 'SELECTING_DATE';
                session.bookingData = { sport: 'football' };
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `${aiIntent.reply || 'Haan bhaiya! Football Turf book kar dete hain.'}\n\n📅 Date select kijiye in *DD-MM-YYYY* format, ya type kijiye *today* / *tomorrow*.`
                );
                return;
            } else if (aiIntent.intent === 'BOOKING' || (lowerText.includes('book') && lowerText.includes('turf'))) {
                session.state = 'SELECTING_SPORT';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `${aiIntent.reply || 'Haan bhaiya! Konsa turf book karna hai?'}\n\n1️⃣ *Cricket Turf*\n2️⃣ *Football Turf*\n\nReply kijiye *1* ya *2*.`
                );
                return;
            } else if (aiIntent.reply) {
                await sendWhatsAppMessage(phone, aiIntent.reply);
                return;
            }
        }
    }

    // Smart keyword shortcuts for direct booking / rates / location
    if (lowerText.includes('cricket') && (lowerText.includes('book') || lowerText.includes('reserve') || lowerText.includes('slot'))) {
        session.state = 'ENTER_DATE';
        session.bookingData = { sport: 'cricket' };
        await session.save();
        await sendWhatsAppMessage(phone, 
            `🏏 *Cricket Turf Reservation*\n\nPlease reply with your desired date in *DD-MM-YYYY* format (e.g. *${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}*), or reply *today* / *tomorrow*.`
        );
        return;
    }

    if (lowerText.includes('football') && (lowerText.includes('book') || lowerText.includes('reserve') || lowerText.includes('slot'))) {
        session.state = 'ENTER_DATE';
        session.bookingData = { sport: 'football' };
        await session.save();
        await sendWhatsAppMessage(phone, 
            `⚽ *Football Turf Reservation*\n\nPlease reply with your desired date in *DD-MM-YYYY* format (e.g. *${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}*), or reply *today* / *tomorrow*.`
        );
        return;
    }

    switch (session.state) {
        case 'IDLE':
        case 'MAIN_MENU':
            if (text === '1' || lowerText.includes('turf') || lowerText.includes('book') || lowerText.includes('slot')) {
                session.state = 'TURF_SUBMENU';
                await session.save();
                await sendTurfSubmenu(phone);
            } else if (text === '2' || lowerText.includes('academy') || lowerText.includes('coach')) {
                session.state = 'ACADEMY_SUBMENU';
                await session.save();
                await sendAcademySubmenu(phone);
            } else if (text === '3' || lowerText.includes('agent') || lowerText.includes('support') || lowerText.includes('help') || lowerText.includes('call')) {
                session.state = 'AGENT_SUPPORT';
                await session.save();
                await sendSupportInfo(phone);
            } else {
                session.state = 'MAIN_MENU';
                await session.save();
                await sendMainMenu(phone);
            }
            break;

        case 'TURF_SUBMENU':
            if (text === '1' || lowerText.includes('book') || lowerText.includes('reserve')) {
                session.state = 'SELECTING_SPORT';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `🏏⚽ *Select Sport to Reserve*:\n\n1️⃣ *Cricket Turf*\n2️⃣ *Football Turf*\n\nReply with *1* or *2*.`
                );
            } else if (text === '2' || lowerText.includes('rate') || lowerText.includes('price')) {
                let settings = await TurfSettings.findOne();
                let cricketRate = settings?.cricketBaseRate || 1000;
                let footballRate = settings?.footballBaseRate || 1000;
                let netsRate = settings?.weeklyRates?.nets?.[0] || settings?.netsBaseRate || 100;
                let cricketWknd = settings?.weeklyRates?.cricket?.[0] || 1200;
                let footballWknd = settings?.weeklyRates?.football?.[0] || 1200;

                await sendWhatsAppMessage(phone, 
                    `💰 *KheloPatna Official Turf Rates (Live API)*:\n\n🏏 *Cricket Turf*: ₹${cricketRate} / hr (Weekdays) | ₹${cricketWknd} / hr (Weekends)\n⚽ *Football Turf*: ₹${footballRate} / hr (Weekdays) | ₹${footballWknd} / hr (Weekends)\n🎯 *Batting Nets*: ₹${netsRate} / hr per head\n\n⏰ *Operating Hours*: 6:00 AM – 11:00 PM (365 Days Open)\n🌐 *Book Online*: https://khelopatna.in/book\n\n_Reply *1* to book a slot now, or *Menu* for main menu._`
                );
            } else if (text === '3' || lowerText.includes('location') || lowerText.includes('direction') || lowerText.includes('map')) {
                await sendWhatsAppMessage(phone, 
                    `📍 *KheloPatna Elite Turf Location*:\n\nNear ICICI Bank, Kumhrar, Sandalpur Road, Patna – 800007\n\n🗺️ *Google Maps Link*:\nhttps://maps.app.goo.gl/iF1kcgi6seEnsRfaA\n\n_Reply *1* to book a slot now, or *Menu* for main menu._`
                );
            } else if (text === '4' || lowerText === 'back') {
                session.state = 'MAIN_MENU';
                await session.save();
                await sendMainMenu(phone);
            } else {
                await sendWhatsAppMessage(phone, `Please reply with *1* (Book Slot), *2* (Rates), *3* (Location), or *4* (Main Menu).`);
            }
            break;

        case 'ACADEMY_SUBMENU':
            if (text === '1' || lowerText.includes('program') || lowerText.includes('batch')) {
                await sendWhatsAppMessage(phone, 
                    `🎓 *KheloPatna Training Academy*\n\nProfessional Cricket & Football Coaching in Patna:\n\n🌅 *Morning Batch*: 06:00 AM – 08:00 AM\n🌤️ *Afternoon Batch*: 03:00 PM – 05:00 PM\n🌆 *Evening Batch*: 05:00 PM – 07:00 PM\n\n✓ Certified Expert Coaches\n✓ Indoor Turf Facilities\n✓ Regular Assessments & Tournaments\n\n_Reply *2* to Pay Fees, *3* to Enquire, or *Menu* for main menu._`
                );
            } else if (text === '2' || lowerText.includes('pay') || lowerText.includes('fee')) {
                await sendWhatsAppMessage(phone, 
                    `💳 *Pay Academy Monthly Fees Online*:\n\nYou can securely pay tuition fees for Cricket or Football coaching online using UPI, Cards, or Netbanking:\n\n🔗 *Pay Fees*: https://khelopatna.in/academy/pay-fees\n\n_Reply *Menu* to return to the main menu._`
                );
            } else if (text === '3' || lowerText.includes('enquiry') || lowerText.includes('join')) {
                await sendWhatsAppMessage(phone, 
                    `📝 *Academy Admission Enquiry*:\n\nTo enroll or book a trial class, please fill out our quick online enquiry form:\n\n🔗 *Enquiry Form*: https://khelopatna.in/enquiry\n\nOr call our academy coordinator directly at: *(+91) 970 970 1400*\n\n_Reply *Menu* to return to the main menu._`
                );
            } else if (text === '4' || lowerText === 'back') {
                session.state = 'MAIN_MENU';
                await session.save();
                await sendMainMenu(phone);
            } else {
                await sendWhatsAppMessage(phone, `Please reply with *1* (Programs), *2* (Pay Fees), *3* (Enquiry), or *4* (Main Menu).`);
            }
            break;

        case 'AGENT_SUPPORT':
            if (lowerText === 'menu' || lowerText === 'back') {
                session.state = 'MAIN_MENU';
                await session.save();
                await sendMainMenu(phone);
            } else {
                await sendWhatsAppMessage(phone, 
                    `📞 *KheloPatna Support*\n\nOur team is reviewing your message. For urgent enquiries, please call us at *(+91) 970 970 1400*.\n\n_Reply *Menu* to return to the main menu._`
                );
            }
            break;

        case 'SELECTING_SPORT':
            if (text === '1' || lowerText.includes('cricket')) {
                session.bookingData = { sport: 'cricket' };
                session.state = 'SELECTING_DATE';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `🏏 You selected *Cricket Turf*.\n\nPlease enter the booking date in *DD-MM-YYYY* format (e.g. 25-07-2026), or reply with *today* or *tomorrow*.`
                );
            } else if (text === '2' || lowerText.includes('football')) {
                session.bookingData = { sport: 'football' };
                session.state = 'SELECTING_DATE';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `⚽ You selected *Football Turf*.\n\nPlease enter the booking date in *DD-MM-YYYY* format (e.g. 25-07-2026), or reply with *today* or *tomorrow*.`
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
                        cricketBaseRate: 2000,
                        footballBaseRate: 2500,
                        netsBaseRate: 800,
                        blackoutHours: { start: 15, end: 18 }
                    });
                    await settings.save();
                }
                if (!settings.blackoutHours) {
                    settings.blackoutHours = { start: 15, end: 18 };
                }
                if (settings.cricketBaseRate === undefined || settings.cricketBaseRate === null) settings.cricketBaseRate = 2000;
                if (settings.footballBaseRate === undefined || settings.footballBaseRate === null) settings.footballBaseRate = 2500;

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

                let hourlyRate = session.bookingData.sport === 'nets'
                    ? (settings?.netsBaseRate || 100)
                    : (session.bookingData.sport === 'cricket' ? (settings?.cricketBaseRate || 1000) : (settings?.footballBaseRate || 1000));

                if (settings?.weeklyRates?.[session.bookingData.sport] && Array.isArray(settings.weeklyRates[session.bookingData.sport])) {
                    const dayRate = settings.weeklyRates[session.bookingData.sport][dayOfWeek];
                    if (dayRate !== undefined && dayRate !== null && dayRate > 0) {
                        hourlyRate = dayRate;
                    }
                }
                // Calculate IST (UTC+5:30) current date and hour for accurate past slot filtering
                const nowUtc = new Date();
                const istDate = new Date(nowUtc.getTime() + (5.5 * 60 * 60 * 1000));
                const istTodayStr = istDate.toISOString().split('T')[0];
                const istCurrentHour = istDate.getUTCHours();
                const isTodayDate = (targetDateStr === istTodayStr);

                let availableList = [];
                let slotIndex = 1;
                const indexToSlotValueMap = {};

                ALL_HOURLY_SLOTS.forEach(slot => {
                    const isPast = isTodayDate && (slot.startHour <= istCurrentHour);
                    const isBooked = bookedSlots.has(slot.value) || (slot.value === '23-24' && bookedSlots.has('23-00'));
                    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
                    const isBlackout = isWeekday && slot.startHour >= (settings?.blackoutHours?.start ?? 18) && slot.startHour < (settings?.blackoutHours?.end ?? 20);
                    
                    let isCustomClosure = false;
                    closures.forEach(c => {
                        if (c.recurringDay === dayOfWeek) {
                            isCustomClosure = true;
                        } else {
                            const slotStart = new Date(targetDateStr + `T${String(slot.startHour).padStart(2, '0')}:00:00`);
                            if (slotStart >= c.startDate && slotStart < c.endDate) {
                                isCustomClosure = true;
                            }
                        }
                    });

                    if (!isPast && !isBooked && !isBlackout && !isCustomClosure) {
                        availableList.push(`*${slotIndex}*. ${slot.text} (₹${hourlyRate})`);
                        indexToSlotValueMap[slotIndex] = slot.value;
                        slotIndex++;
                    }
                });

                if (availableList.length === 0) {
                    await sendWhatsAppMessage(phone, `😔 Sorry, no slots are available for *${session.bookingData.sport.toUpperCase()}* on *${targetDateStr}*. Please try another date, or reply *Menu* for main menu.`);
                    return;
                }

                // Save state data
                session.bookingData.date = targetDateStr;
                session.bookingData.totalAmount = hourlyRate;
                session.bookingData.slotMap = indexToSlotValueMap;
                session.state = 'SELECTING_SLOTS';
                await session.save();

                await sendWhatsAppMessage(phone, 
                    `📅 Available slots for *${session.bookingData.sport.toUpperCase()}* on *${targetDateStr}*:\n\n${availableList.join('\n')}\n\nReply with slot number(s) to book (e.g. *1* or *1,2*).`
                );

            } catch (err) {
                console.error('Error listing bot slots:', err);
                await sendWhatsAppMessage(phone, `⚠️ Error loading slots. Please type *Cancel* and try again.`);
            }
            break;

        case 'SELECTING_SLOTS':
            const selections = text.split(',').map(s => s.trim());
            const slotMap = session.bookingData?.slotMap || session.slotMap || {};

            if (!slotMap || selections.some(s => !slotMap[s])) {
                await sendWhatsAppMessage(phone, `⚠️ Invalid selection. Please reply with slot number(s) (e.g. *1* or *1,2*).`);
                return;
            }

            const chosenSlotValues = selections.map(s => slotMap[s]);

            try {
                const perSlotRate = session.bookingData.totalAmount || 1000;
                const totalAmount = perSlotRate * chosenSlotValues.length;
                // Calculate minimum Rs 300 advance deposit or 50%
                const advanceAmount = Math.max(300, Math.round(totalAmount * 0.5));

                session.bookingData.slots = chosenSlotValues;
                session.bookingData.totalAmount = totalAmount;
                session.bookingData.advanceAmount = advanceAmount;
                session.state = 'SELECTING_PAYMENT_MODE';
                await session.save();

                await sendWhatsAppMessage(phone, 
                    `✅ Selected slots: *${chosenSlotValues.join(', ')}*\n💰 Total Slot Price: *₹${totalAmount}*\n\n💳 *Choose Payment Option*:\n\n1️⃣ *Advance Deposit (₹${advanceAmount})* — Lock your slot now, pay balance ₹${totalAmount - advanceAmount} at venue!\n2️⃣ *Full Payment (₹${totalAmount})* — Pay 100% online now.\n\n_Reply *1* for Advance (₹${advanceAmount}) or *2* for Full Payment (₹${totalAmount})._`
                );
            } catch (err) {
                console.error('Error saving slots selection:', err);
                await sendWhatsAppMessage(phone, `⚠️ Server error. Please type *Cancel* to restart.`);
            }
            break;

        case 'SELECTING_PAYMENT_MODE':
            if (text === '1' || lowerText.includes('advance') || lowerText.includes('part')) {
                session.state = 'ENTERING_ADVANCE_AMOUNT';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `💵 *Enter Advance Deposit Amount*:\n\nPlease reply with the amount in ₹ you wish to pay as advance (e.g. *300* or *500*).\n\n💡 *Note*: To lock and confirm your slot booking, you should pay *₹300* advance deposit.`
                );
                return;
            } else if (text === '2' || lowerText.includes('full') || lowerText.includes('100%')) {
                session.bookingData.paymentAmount = session.bookingData.totalAmount;
                session.bookingData.paymentType = 'FULL';
            } else {
                // Check if user directly typed an advance number (e.g. 100, 300, 500)
                const typedNum = parseInt(text.replace(/\D/g, ''), 10);
                if (!isNaN(typedNum) && typedNum > 0) {
                    if (typedNum < 300) {
                        await sendWhatsAppMessage(phone, 
                            `⚠️ You should pay *₹300* for the slot booking. Please enter *₹300* or a higher amount (or reply *2* for Full Payment of ₹${session.bookingData.totalAmount}).`
                        );
                        return;
                    }
                    session.bookingData.paymentAmount = Math.min(typedNum, session.bookingData.totalAmount);
                    session.bookingData.paymentType = (session.bookingData.paymentAmount >= session.bookingData.totalAmount) ? 'FULL' : 'ADVANCE';
                } else {
                    await sendWhatsAppMessage(phone, `Please reply with *1* for Advance Deposit or *2* for Full Payment (₹${session.bookingData.totalAmount}).`);
                    return;
                }
            }

            // Check if phone string is already a clean 10-digit Indian phone number
            const extractedPhone = String(phone).replace(/\D/g, '').slice(-10);
            if (extractedPhone.length === 10 && !extractedPhone.startsWith('19') && !extractedPhone.startsWith('10')) {
                session.bookingData.realPhone = extractedPhone;
                session.state = 'ENTERING_NAME';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `✅ Selected: *${session.bookingData.paymentType === 'ADVANCE' ? `Advance Deposit (₹${session.bookingData.paymentAmount})` : `Full Payment (₹${session.bookingData.paymentAmount})`}*\n\nPlease reply with your *Full Name* to proceed with this booking.`
                );
            } else {
                session.state = 'ENTERING_PHONE';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `✅ Selected: *${session.bookingData.paymentType === 'ADVANCE' ? `Advance Deposit (₹${session.bookingData.paymentAmount})` : `Full Payment (₹${session.bookingData.paymentAmount})`}*\n\n📱 Please enter your *10-digit Mobile Number* for SMS booking confirmation & payment receipt.`
                );
            }
            break;

        case 'ENTERING_ADVANCE_AMOUNT':
            const typedAmt = parseInt(text.replace(/\D/g, ''), 10);
            if (isNaN(typedAmt) || typedAmt <= 0) {
                await sendWhatsAppMessage(phone, `⚠️ Invalid amount. Please enter a valid number in ₹ (e.g. *300* or *500*).`);
                return;
            }

            if (typedAmt < 300) {
                await sendWhatsAppMessage(phone, 
                    `⚠️ You should pay *₹300* for the slot booking. Please enter *₹300* or a higher amount (or reply *2* for Full Payment of ₹${session.bookingData.totalAmount}).`
                );
                return;
            }

            const finalAdvance = Math.min(typedAmt, session.bookingData.totalAmount);
            session.bookingData.paymentAmount = finalAdvance;
            session.bookingData.paymentType = (finalAdvance >= session.bookingData.totalAmount) ? 'FULL' : 'ADVANCE';

            // Check if phone string is already a clean 10-digit Indian phone number
            const phoneCheck = String(phone).replace(/\D/g, '').slice(-10);
            if (phoneCheck.length === 10 && !phoneCheck.startsWith('19') && !phoneCheck.startsWith('10')) {
                session.bookingData.realPhone = phoneCheck;
                session.state = 'ENTERING_NAME';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `✅ Selected: *${session.bookingData.paymentType === 'ADVANCE' ? `Advance Deposit (₹${finalAdvance})` : `Full Payment (₹${finalAdvance})`}*\n\nPlease reply with your *Full Name* to proceed with this booking.`
                );
            } else {
                session.state = 'ENTERING_PHONE';
                await session.save();
                await sendWhatsAppMessage(phone, 
                    `✅ Selected: *${session.bookingData.paymentType === 'ADVANCE' ? `Advance Deposit (₹${finalAdvance})` : `Full Payment (₹${finalAdvance})`}*\n\n📱 Please enter your *10-digit Mobile Number* for SMS booking confirmation & payment receipt.`
                );
            }
            break;

        case 'ENTERING_PHONE':
            const phoneDigits = text.replace(/\D/g, '').slice(-10);
            if (phoneDigits.length !== 10) {
                await sendWhatsAppMessage(phone, `⚠️ Invalid phone number. Please enter a valid *10-digit Mobile Number* (e.g. 9709701400).`);
                return;
            }

            session.bookingData.realPhone = phoneDigits;
            session.state = 'ENTERING_NAME';
            await session.save();
            await sendWhatsAppMessage(phone, `Thank you! Now please reply with your *Full Name* to proceed.`);
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
            const customerPhone = session.bookingData.realPhone || String(phone).replace(/\D/g, '').slice(-10);
            const payableNow = session.bookingData.paymentAmount || session.bookingData.totalAmount;
            const restDue = session.bookingData.totalAmount - payableNow;

            try {
                const paymentLink = await createPaymentLink({
                    linkId: orderId,
                    amount: payableNow,
                    customerPhone: customerPhone,
                    customerName: session.bookingData.name,
                    customerEmail: session.bookingData.email,
                    returnUrl: `${process.env.FRONTEND_URL || 'https://khelopatna.in'}/book?order_id=${orderId}`
                });

                session.state = 'AWAITING_PAYMENT';
                await session.save();

                await sendWhatsAppMessage(phone, 
                    `🎟️ *KheloPatna Booking Invoice* 🎟️\n\n*Customer*: ${session.bookingData.name}\n*Phone*: ${customerPhone}\n*Sport*: ${session.bookingData.sport.toUpperCase()}\n*Date*: ${session.bookingData.date}\n*Slots*: ${session.bookingData.slots.join(', ')}\n*Total Slot Value*: ₹${session.bookingData.totalAmount}\n*Payable Now*: *₹${payableNow}* (${session.bookingData.paymentType === 'ADVANCE' ? 'Advance Deposit' : 'Full Payment'})\n${restDue > 0 ? `*Rest Due at Venue*: ₹${restDue}\n` : ''}\nPlease pay using this secure link:\n🔗 ${paymentLink}\n\n*Note*: Once paid, your slot is instantly locked and confirmed!`
                );

            } catch (err) {
                console.error('Error generating payment link:', err);
                await sendWhatsAppMessage(phone, `⚠️ Payment gateway connection failed. Please try again or type *Cancel*.`);
            }
            break;

        case 'AWAITING_PAYMENT':
            try {
                const customerPhone = session.bookingData.realPhone || String(phone).replace(/\D/g, '').slice(-10);
                const payableNow = session.bookingData.paymentAmount || session.bookingData.totalAmount;
                const reminderLink = await createPaymentLink({
                    linkId: session.bookingData.orderId,
                    amount: payableNow,
                    customerPhone: customerPhone,
                    customerName: session.bookingData.name,
                    customerEmail: session.bookingData.email
                });
                await sendWhatsAppMessage(phone, 
                    `Awaiting online payment of *₹${payableNow}*.\n🔗 Payment Link: ${reminderLink}\n\nIf you want to start over, type *Cancel*.`
                );
            } catch (err) {
                console.error('Error regenerating payment link:', err);
                await sendWhatsAppMessage(phone, `⚠️ Could not generate the payment link right now. Please try again in a few minutes, or type *Cancel* to restart.`);
            }
            break;
    }
}

// Register as the listener for WhatsApp message upsert events
registerBotListener(handleIncomingMessage);

module.exports = {
    handleIncomingMessage,
    handleIncomingWebhook: handleIncomingMessage
};
