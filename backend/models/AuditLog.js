'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('AuditLog', new mongoose.Schema({}, { strict: false }));
