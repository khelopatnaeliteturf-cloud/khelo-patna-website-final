'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('POSSale', new mongoose.Schema({}, { strict: false }));
