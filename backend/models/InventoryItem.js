'use strict';
const mongoose = require('../lib/mongoose-pg-bridge');
module.exports = mongoose.model('InventoryItem', new mongoose.Schema({}, { strict: false }));
