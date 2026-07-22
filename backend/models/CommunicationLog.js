'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('CommunicationLog', new mongoose.Schema({}, { strict: false }));
