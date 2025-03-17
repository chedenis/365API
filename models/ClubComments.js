const mongoose = require("mongoose");

let modelName = "ClubComments";

const clubCommentsSchema = new mongoose.Schema(
  {
    clubUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref:
        process.env.NODE_ENV === "production"
          ? "ClubAuthPROD"
          : process.env.NODE_ENV === "qa"
          ? "ClubAuthQA"
          : "ClubAuth",
      required: true,
    },
    userType: {
      type: String,
      enum: ["clubOwner", "admin"],
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref:
        process.env.NODE_ENV === "production"
          ? "ClubPROD"
          : process.env.NODE_ENV === "qa"
          ? "ClubQA"
          : "Club", // Explicit environment-based model name, // Use the model name string directly
      default: [],
    },
    message: String,
  },
  {
    timestamps: true,
  }
);

clubCommentsSchema.index({ user: 1 });
clubCommentsSchema.index({ membership: 1 });
clubCommentsSchema.index({ stripe_invoice_id: 1 });

const ClubComments =
  mongoose.models[modelName] || mongoose.model(modelName, clubCommentsSchema);

module.exports = ClubComments;
