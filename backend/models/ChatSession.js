const mongoose = require('../lib/mongoose-pg-bridge');

const ChatSessionSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    state: { type: String, default: 'IDLE' }, // IDLE, SELECTING_SPORT, SELECTING_DATE, SELECTING_SLOTS, ENTERING_NAME, ENTERING_EMAIL, AWAITING_PAYMENT
    bookingData: {
        sport: { type: String },
        date: { type: String },
        slots: [{ type: String }],
        name: { type: String },
        email: { type: String },
        totalAmount: { type: Number },
        orderId: { type: String }
    },
    updatedAt: { type: Date, default: Date.now, expires: 900 } // Session expires in 15 mins
});

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
