const express = require("express");
const router = express.Router();
const clubAuthController = require("../controllers/clubAuthController");

// Local registration and login
router.post("/register", clubAuthController.registerClub);
router.post("/login", clubAuthController.loginClub);

// Google OAuth routes
router.get("/google", clubAuthController.googleAuth);
router.get("/google/callback", clubAuthController.googleCallback);

// Facebook OAuth routes
router.get("/facebook", clubAuthController.facebookAuth);
router.get("/facebook/callback", clubAuthController.facebookCallback);

// Logout
router.get("/logout", clubAuthController.logoutClub);

module.exports = router;
