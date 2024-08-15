// models/FacilityAuth.js
const mongoose = require('mongoose');

const facilityAuthSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true }
});

module.exports = mongoose.model('FacilityAuth', facilityAuthSchema);
