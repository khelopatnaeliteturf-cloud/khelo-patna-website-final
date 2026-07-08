'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('TurfSettings', new mongoose.Schema({}, { strict: false }));
