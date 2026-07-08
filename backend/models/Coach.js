'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Coach', new mongoose.Schema({}, { strict: false }));
