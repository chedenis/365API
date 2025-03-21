const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
  checkMemberShipStatus,
  renewMemberShipStatus,
  cancelMemberShipStatus,
  webViewUrl,
} = require("../controllers/memberShip");

const router = express.Router();

router.get("/check-status", authMiddleware, checkMemberShipStatus);
router.get("/renew", authMiddleware, renewMemberShipStatus);
router.delete("/cancel", authMiddleware, cancelMemberShipStatus);
router.get("/web-view-url", authMiddleware, webViewUrl);

module.exports = router;
