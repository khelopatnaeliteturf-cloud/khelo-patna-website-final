'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Tournament', new mongoose.Schema({}, { strict: false }));
