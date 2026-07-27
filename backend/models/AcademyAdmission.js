'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('AcademyAdmission', new mongoose.Schema({}, { strict: false }));
