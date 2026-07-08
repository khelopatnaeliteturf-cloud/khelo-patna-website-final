'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Branch', new mongoose.Schema({}, { strict: false }));
