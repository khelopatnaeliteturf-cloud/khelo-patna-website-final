'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('CheckInLog', new mongoose.Schema({}, { strict: false }));
