// routes/auth.js
const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const router = express.Router();

// Initialize Passport
require("../config/passport");

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
    const newUser = new User({ email, password });
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

// Google OAuth (same as before)
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/profile"); // Redirect after successful login
  }
);

// Facebook OAuth (same as before)
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/profile"); // Redirect after successful login
  }
);

router.get("/logout", (req, res) => {
  req.logout(); // Logs the user out
  res.redirect("/"); // Redirect after logout
});

module.exports = router;
