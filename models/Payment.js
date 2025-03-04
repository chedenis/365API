const mongoose = require("mongoose");

let modelName = "Payment";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref:
        process.env.NODE_ENV === "production"
          ? "UserPROD"
          : process.env.NODE_ENV === "qa"
          ? "UserQA"
          : "User",
      required: true,
    },
    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      required: true,
    },
    stripe_payment_intent_id: String,
    stripe_invoice_id: String,
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "usd",
    },
    status: {
      type: String,
      enum: ["succeeded", "pending", "failed"],
      required: true,
    },
    payment_date: Date,
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ user: 1 });
paymentSchema.index({ membership: 1 });
paymentSchema.index({ stripe_invoice_id: 1 });

const Payment =
  mongoose.models[modelName] || mongoose.model(modelName, paymentSchema);

module.exports = Payment;
