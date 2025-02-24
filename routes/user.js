// routes/user.js
const express = require("express");
const {
  getUserProfile,
  updateUserProfile,
  stripeWebhookHandler,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/profile", authMiddleware, getUserProfile);
router.patch("/profile", authMiddleware, updateUserProfile);
// router.post(
//   "/stripe-webhook-handler",
//   express.raw({ type: "application/json" }), // Required for stripe webhook
//   stripeWebhookHandler
// );

module.exports = router;
