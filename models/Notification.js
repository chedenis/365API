const mongoose = require("mongoose");

let modelName = "Notification";

const notificationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref:
        process.env.NODE_ENV === "production"
          ? "UserPROD"
          : process.env.NODE_ENV === "qa"
          ? "UserQA"
          : "User",
      required: true,
    },
    senderType: {
      type: String,
      enum: ["admin", "clubOwner"],
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref:
        process.env.NODE_ENV === "production"
          ? "UserPROD"
          : process.env.NODE_ENV === "qa"
          ? "UserQA"
          : "User",
      required: true,
    },
    receiverType: {
      type: String,
      enum: ["admin", "clubOwner"],
      required: true,
    },
    title: {
      type: String,
      default: "",
    },
    body: {
      type: String,
      default: "",
    },
    notificationType: {
      type: String,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    redirectTo: {
      type: String,
      default: "",
    },
    redirectId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ sender: 1 });
notificationSchema.index({ receiver: 1 });

const Notification =
  mongoose.models[modelName] || mongoose.model(modelName, notificationSchema);

module.exports = Notification;
