// models/User.js
const mongoose = require("mongoose");
const addressSchema = require("./Address");
const skillLevelSchema = require("./SkillLevel");

const userSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true },
  address: addressSchema,
  membershipStatus: {
    type: String,
    enum: ["Active", "Inactive", "Expired"],
    required: true,
    default: "Inactive",
  },
  skillLevel: skillLevelSchema,
  phone: { type: String, required: false },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: false },
  memberBenefit: {
  email: { type: String, required: false },
  phone: { type: String, required: false },
  },
});

// Determine the model name based on the environment
let modelName = "User";
if (process.env.NODE_ENV === "qa") {
  modelName = "UserQA";
} else if (process.env.NODE_ENV === "production") {
  modelName = "UserPROD";
}

// Export the model with the dynamic name
module.exports =
  mongoose.models[modelName] || mongoose.model(modelName, userSchema);
