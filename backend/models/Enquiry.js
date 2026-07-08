'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('Enquiry', new mongoose.Schema({}, { strict: false }));
