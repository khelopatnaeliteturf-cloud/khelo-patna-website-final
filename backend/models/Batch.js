'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Batch', new mongoose.Schema({}, { strict: false }));
