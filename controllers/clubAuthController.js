const { ClubAuth } = require("../models");
const passport = require("passport");
const bcrypt = require("bcryptjs");

// Register a new club (local strategy)
exports.registerClubAuth = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Check if a club user already exists with this email
    let newClubAuth = await ClubAuth.findOne({ email });
    if (newClubAuth) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    newClubAuth = new ClubAuth({ email, password: hashedPassword });
    await newClubAuth.save();

    // Automatically log the club in after registration using Passport
    req.login(newClubAuth, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Error logging in after registration" });
      }

      return res.status(201).json({
        message: "Club registered successfully",
        clubAuth: {
          id: newClubAuth._id,
          email: newClubAuth.email,
        },
      });
    });
  } catch (error) {
    console.error("Error registering club", error);
    res.status(500).json({ error: "Error registering club" });
  }
};

// Login a club (local strategy)
exports.loginClub = (req, res, next) => {
  passport.authenticate("club-local", (err, clubAuth, info) => {
    if (err) {
      return next(err);
    }
    if (!clubAuth) {
      return res.status(400).json({ error: info.message });
    }
    req.login(clubAuth, (err) => {
      if (err) {
        return next(err);
      }
      return res.status(200).json({
        message: "Club logged in successfully",
        clubAuth: {
          id: clubAuth._id,
          email: clubAuth.email,
          clubs: clubAuth.clubs,
        },
      });
    });
  })(req, res, next);
};

// Google OAuth for club login/register
exports.googleAuth = passport.authenticate("club-google", {
  scope: ["profile", "email"],
});

exports.googleCallback = (req, res, next) => {
  console.log("Inside googleCallback"); // This should log
  passport.authenticate("club-google", {
    successRedirect: process.env.CLUB_SUCCESS_REDIRECT,
    failureRedirect: "/api/club-auth/failure",
  })(req, res, next);
};

// Facebook OAuth for club login/register
exports.facebookAuth = passport.authenticate("club-facebook");

exports.facebookCallback = (req, res, next) => {
  passport.authenticate("club-facebook", {
    successRedirect: process.env.CLUB_SUCCESS_REDIRECT,
    failureRedirect: "/api/club-auth/failure",
  })(req, res, next);
};

// Function to log out a club
exports.logoutClub = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Error logging out" });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Error ending session" });
      }
      res.clearCookie("connect.sid"); // Clear session cookie
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
};
