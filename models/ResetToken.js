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

module.exports = mongoose.model("ResetToken", resetTokenSchema);
