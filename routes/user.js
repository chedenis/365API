// routes/user.js
const express = require("express");
const {
  getUserProfile,
  updateUserProfile,
  generateMemberPresignedUrl,
  checkMemberShipStatus,
  updateMemberIdWithSerialNumber,
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

router.post("/generate-upload-url", authMiddleware, generateMemberPresignedUrl);
router.get("/update-memberId", authMiddleware, updateMemberIdWithSerialNumber);

module.exports = router;
