const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('../lib/mongoose-pg-bridge');
const Booking = require('../models/Booking');
const { TurfSettings } = require('../models/TurfSettings');

// Import slots logic or replicate it
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

async function run() {
    const date = '2026-07-19';
    const sport = 'football';
    
    const sportFilter = (sport === 'cricket' || sport === 'football') 
        ? { $in: ['cricket', 'football'] } 
        : sport;

    const bookings = await Booking.find({
        date: date,
        sport: sportFilter,
        paymentStatus: 'SUCCESS'
    });

    console.log(`Found ${bookings.length} bookings for ${sport} on ${date}`);
    const bookedSlots = new Set();
    bookings.forEach(b => {
        console.log(`Booking ID: ${b._id}, customer: ${b.customerName}, timeSlots:`, b.timeSlots, `type:`, typeof b.timeSlots, `isArray:`, Array.isArray(b.timeSlots));
        if (Array.isArray(b.timeSlots)) {
            b.timeSlots.forEach(slot => bookedSlots.add(slot));
        } else if (typeof b.timeSlots === 'string') {
            b.timeSlots.split(',').forEach(slot => bookedSlots.add(slot.trim()));
        }
    });

    console.log('bookedSlots set:', bookedSlots);

    const slotsResponse = ALL_HOURLY_SLOTS.map(slot => {
        const isBooked = bookedSlots.has(slot.value) || (slot.value === '23-24' && bookedSlots.has('23-00'));
        return {
            value: slot.value,
            text: slot.text,
            booked: isBooked
        };
    });

    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayISTStr = nowIST.toISOString().split('T')[0];
    const currentHourIST = 0; // Mock current hour as 0 (12 AM) to match the screenshot scenario
    console.log(`todayISTStr: ${todayISTStr}, currentHourIST: ${currentHourIST}`);

    let filteredSlotsResponse = slotsResponse;
    // Simulate same day filter
    filteredSlotsResponse = slotsResponse.filter(slot => {
        if (slot.booked) return true;
        const slotDef = ALL_HOURLY_SLOTS.find(s => s.value === slot.value);
        return slotDef && slotDef.startHour > currentHourIST;
    });

    console.log('Resulting slots list (first 5):');
    console.log(filteredSlotsResponse.slice(0, 5));
}

run().catch(console.error);
