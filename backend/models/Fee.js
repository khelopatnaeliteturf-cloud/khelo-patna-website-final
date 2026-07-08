'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Fee', new mongoose.Schema({}, { strict: false }));
