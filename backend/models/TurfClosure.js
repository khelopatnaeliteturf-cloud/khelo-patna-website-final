'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('TurfClosure', new mongoose.Schema({}, { strict: false }));
