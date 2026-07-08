'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
