const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");

// Registration route
router.post("/register", AuthController.register);

// Email and password login
router.post("/login", AuthController.login);


router.post("/forgot-password", AuthController.forgotPassword);
router.get("/validate-token/:id", AuthController.validateToken);
router.post("/reset-password", AuthController.resetPassword);

// Google OAuth routes
router.get("/google", AuthController.googleAuth);
router.get("/google/callback", AuthController.googleCallback);
router.post("/google-signin", AuthController.googleMobileAuth);

// Facebook OAuth routes
router.get("/facebook", AuthController.facebookAuth);
router.get("/facebook/callback", AuthController.facebookCallback);

// Check session or login status
router.post("/status", AuthController.getLoginStatus);

// Logout
router.get("/logout", AuthController.logout);

module.exports = router;
