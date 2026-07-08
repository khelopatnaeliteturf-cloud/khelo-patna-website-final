'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('FinanceConfig', new mongoose.Schema({}, { strict: false }));
