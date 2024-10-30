// routes/user.js
const express = require("express");
const { stripeWebhookHandler } = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.post(
  "/stripe-webhook-handler",
  express.raw({ type: "application/json" }), // Required for Stripe webhook
  (req, res, next) => {
    console.log("Stripe webhook route received a request"); // Log when this route is hit
    next();
  },
  stripeWebhookHandler
);

module.exports = router;
