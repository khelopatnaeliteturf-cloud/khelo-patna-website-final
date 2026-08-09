'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('PushSubscription', new mongoose.Schema({}, { strict: false }));
