'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
