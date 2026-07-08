'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('ChatSession', new mongoose.Schema({}, { strict: false }));
