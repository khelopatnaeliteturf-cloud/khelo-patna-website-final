'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }));
