const express = require("express");
const router = express.Router();
const {
  updateReferralCodeInClub,
} = require("../controllers/scriptsController");

// Route to get all countries
router.get("/", updateReferralCodeInClub);

module.exports = router;
