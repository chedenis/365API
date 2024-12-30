const mongoose = require("mongoose");

const resetTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClubAuth",
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  accessed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Token will automatically expire after 1 hour (3600 seconds)
  },
});

let modelName = "ResetToken";
if (process.env.NODE_ENV === "qa") {
  modelName = "ResetTokenQA";
} else if (process.env.NODE_ENV === "production") {
  modelName = "ResetTokenPROD";
}

// Export the model with the dynamic name
module.exports =
  mongoose.models[modelName] || mongoose.model(modelName, resetTokenSchema);
