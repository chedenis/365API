const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
  checkMemberShipStatus,
  renewMemberShipStatus,
  cancelMemberShipStatus,
} = require("../controllers/memberShip");

const router = express.Router();

router.get("/check-status", authMiddleware, checkMemberShipStatus);
router.get("/renew", authMiddleware, renewMemberShipStatus);
router.delete("/cancel", authMiddleware, cancelMemberShipStatus);

module.exports = router;
