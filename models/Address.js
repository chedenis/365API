const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true, default: "USA" },
    suite: { type: String }, // Optional field for suite/apartment numbers
    location: {
      type: {
        type: String,
        enum: ["Point"], // GeoJSON Point type
        required: true,
      },
      coordinates: {
        type: [Number], // Array of coordinates: [longitude, latitude]
        required: true,
      },
    },
  },
  { _id: false }
);

// Create a geospatial index on the location field
addressSchema.index({ location: "2dsphere" });

module.exports = addressSchema;
