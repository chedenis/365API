// models/User.js
const mongoose = require("mongoose");
const addressSchema = require("./Address");
const skillLevelSchema = require("./SkillLevel");

const userSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true },
  address: { type: addressSchema, required: false },
  profile_picture: { type: String },
  memberId: {
    type: String,
  },
  membershipStatus: {
    type: String,
    enum: ["Active", "Inactive", "Expired"],
    required: true,
    default: "Inactive",
  },
  membershipExpiry: { type: Date },
  skillLevel: skillLevelSchema,
  phone: { type: String, required: false },
  stripeCustomerId: { type: String, required: false },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: false },
  memberBenefit: new mongoose.Schema(
    {
      email: { type: String, required: false },
      phone: { type: String, required: false },
    },
    { _id: false }
  ),
});

// Pre-save middleware to generate memberId
userSchema.pre("save", async function (next) {
  // Skip if memberId is already set
  if (this.memberId) {
    return next();
  }

  try {
    // Determine the model name based on the environment
    const modelName =
      process.env.NODE_ENV === "qa"
        ? "UserQA"
        : process.env.NODE_ENV === "production"
        ? "UserPROD"
        : "User";

    const Model = mongoose.model(modelName);

    // Find highest memberId
    const highestUser = await Model.findOne({}).sort({ memberId: -1 }).limit(1);

    let newMemberId;
    if (highestUser.memberId) {
      // Parse memberId as number and increment
      const currentNum = parseInt(highestUser.memberId);
      if (!isNaN(currentNum)) {
        // Format with leading zeros
        newMemberId = (currentNum + 1).toString().padStart(6, "0");
      } else {
        // If parsing failed, start with 0001
        newMemberId = "0001";
      }
    } else {
      // First document or no valid memberId found
      newMemberId = "0001";
    }

    this.memberId = newMemberId;
    next();
  } catch (error) {
    next(error);
  }
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
