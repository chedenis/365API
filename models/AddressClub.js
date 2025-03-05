const mongoose = require("mongoose");

const addressSchemaClub = new mongoose.Schema(
  {
    street: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    zip: { type: String, required: false },
    country: { type: String, required: false },
    suite: { type: String, required: false },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // GeoJSON format [longitude, latitude]
    },
  },
  { _id: false }
);

// Create a geospatial index on the location field
addressSchemaClub.index({ location: "2dsphere" });

module.exports = addressSchemaClub;
