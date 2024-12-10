const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");

// Registration route
router.post("/register", AuthController.register);

// Email and password login
router.post("/login", AuthController.login);

// Google OAuth routes
router.get("/google", AuthController.googleAuth);
router.get("/google/callback", AuthController.googleCallback);

// Facebook OAuth routes
router.get("/facebook", AuthController.facebookAuth);
router.get("/facebook/callback", AuthController.facebookCallback);

// Check session or login status
router.get("/status", AuthController.getLoginStatus);

// Logout
router.get("/logout", AuthController.logout);

module.exports = router;
