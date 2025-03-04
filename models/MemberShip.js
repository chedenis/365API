const mongoose = require("mongoose");

let modelName = "MemberShip";

const memberShipSchema = new mongoose.Schema(
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
    stripe_customer_id: String,
    stripe_subscription_id: String,
    status: {
      type: String,
      enum: ["inactive", "active", "canceled", "past_due"],
      default: "inactive",
    },
    start_date: Date,
    end_date: Date,
    auto_renew: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

memberShipSchema.index({ user: 1 });
memberShipSchema.index({ stripe_customer_id: 1 });
memberShipSchema.index({ stripe_subscription_id: 1 });

const Membership =
  mongoose.models[modelName] || mongoose.model(modelName, memberShipSchema);

module.exports = Membership;
