'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Scoreboard', new mongoose.Schema({}, { strict: false }));
