const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
   address: { type: String, required: true}
  },
  { _id: false }
);

// Create a geospatial index on the location field
addressSchema.index({ location: "2dsphere" });

module.exports = addressSchema;
