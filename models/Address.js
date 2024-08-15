// models/Address.js
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  country: { type: String, required: true, default: 'USA' },
  suite: { type: String }, // Optional field for suite/apartment numbers
  latitude: { type: Number }, // Optional field for geolocation
  longitude: { type: Number } // Optional field for geolocation
}, { _id: false });

module.exports = addressSchema;
