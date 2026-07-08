'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Session', new mongoose.Schema({}, { strict: false }));
