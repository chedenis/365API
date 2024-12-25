const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema({
  country_code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
});

const Country = mongoose.model("Country", countrySchema);

module.exports = Country;
