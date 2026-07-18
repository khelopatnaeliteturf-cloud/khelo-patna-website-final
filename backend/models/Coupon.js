'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Coupon', new mongoose.Schema({}, { strict: false }));
