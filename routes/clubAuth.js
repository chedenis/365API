// routes/clubAuth.js
const express = require("express");
const {
  registerClub,
  loginClub,
} = require("../controllers/clubAuthController");

const router = express.Router();

router.post("/register", registerClub);
router.post("/login", loginClub);

module.exports = router;
