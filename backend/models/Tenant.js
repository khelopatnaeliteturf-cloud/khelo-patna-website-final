'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }));
