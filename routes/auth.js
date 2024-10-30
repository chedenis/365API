const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const router = express.Router();
const AuthController = require("../controllers/authController");

// Registration route
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Create and save the new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    // Automatically log the user in after registration
    req.login(newUser, (err) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Error logging in after registration" });
      res.json({
        message: "Registered and logged in successfully",
        user: newUser,
      });
    });
  } catch (err) {
    res.status(500).json({ message: "Error registering user" });
  }
});

// Email and password login
router.post("/login", passport.authenticate("local"), (req, res) => {
  res.json({ message: "Logged in successfully", user: req.user });
});

// Google OAuth routes
router.get("/google", AuthController.googleAuth);
router.get("/google/callback", AuthController.googleCallback);

// Facebook OAuth routes
router.get("/facebook", AuthController.facebookAuth);
router.get("/facebook/callback", AuthController.facebookCallback);
router.get("/session", AuthController.session);

// Logout
router.get("/logout", AuthController.logout);

module.exports = router;
