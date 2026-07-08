'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false }));
