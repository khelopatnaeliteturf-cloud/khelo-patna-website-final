'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
