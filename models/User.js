// models/User.js
const mongoose = require("mongoose");
const addressSchema = require("./Address");
const skillLevelSchema = require("./SkillLevel");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  address: addressSchema,
  membershipStatus: {
    type: String,
    enum: ["Active", "Inactive", "Expired"],
    required: true,
    default: "Inactive",
  },
  skillLevel: skillLevelSchema,
});

module.exports = mongoose.model("User", userSchema);
