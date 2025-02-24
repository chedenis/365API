// controllers/userController.js
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../config/s3Client");
const { User } = require("../models");
const flattenUpdates = require("../utils/flattenUpdates");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Webhook handler to track completed sessions
exports.stripeWebhookHandler = async (req, res) => {
  console.log("Webhook received.");

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // Verify the event by constructing it with the raw body and Stripe secret
    event = stripe.webhooks.constructEvent(
      req.body, // Raw body is necessary for signature verification
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  console.log("Received event type:", event.type);
  console.log("Event data object:", event.data.object); // Log the event data for debugging

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      const userId = session.client_reference_id;

      if (userId) {
        try {
          // Update user's membership status in the database
          await User.findOneAndUpdate(
            { _id: userId },
            { membershipStatus: "Active" }
          );
          console.log(`User ${userId} membership status updated to Active.`);
        } catch (dbError) {
          console.error("Database update error:", dbError.message);
          return res.status(500).send("Database error");
        }
      } else {
        console.log("No client_reference_id found in session.");
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).send(); // Send a 200 response to acknowledge receipt
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.memberId) {
      user.memberId = user._id;
      await user.save();
    }
    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user profile", err);
    res
      .status(500)
      .json({ error: "Error fetching user profile", details: err.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const updates = flattenUpdates(req.body);

    if (updates.memberId === null || updates.memberId === undefined) {
      updates.memberId = req.user.id;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      {
        new: true, // Return the updated document
        runValidators: true, // Ensure the updates are validated against the schema
        context: "query", // Needed for certain validators
      }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Error updating user profile", err);
    res
      .status(500)
      .json({ error: "Error updating user profile", details: err.message });
  }
};
