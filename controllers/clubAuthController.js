const ClubAuth = require("../models/ClubAuth");
const PendingClub = require("../models/PendingClub");
const passport = require("passport");
const bcrypt = require("bcryptjs");

// Register a new club (local strategy)
exports.registerClub = async (req, res, next) => {
  const { email, password, clubDetails } = req.body;

  try {
    // Check if a club already exists with this email
    let existingClub = await ClubAuth.findOne({ email });
    if (existingClub) {
      return res
        .status(400)
        .json({ error: "Club with this email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new ClubAuth entry
    const newClubAuth = new ClubAuth({ email, password: hashedPassword });
    await newClubAuth.save();

    // Create a new PendingClub and link it to the ClubAuth
    const newPendingClub = new PendingClub(clubDetails);
    await newPendingClub.save();

    // Link the PendingClub to ClubAuth
    newClubAuth.pendingClub = newPendingClub._id;
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
          pendingClub: newClubAuth.pendingClub,
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
          pendingClub: clubAuth.pendingClub,
          club: clubAuth.club,
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
    successRedirect: "http://localhost:3000/auth",
    failureRedirect: "/api/club-auth/failure",
  })(req, res, next);
};

// Facebook OAuth for club login/register
exports.facebookAuth = passport.authenticate("club-facebook");

exports.facebookCallback = (req, res, next) => {
  passport.authenticate("club-facebook", {
    successRedirect: "http://localhost:3000/auth",
    failureRedirect: "/api/club-auth/failure",
  })(req, res, next);
};

// Logout a club
exports.logoutClub = (req, res) => {
  console.log("we got here");
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Error logging out" });
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
};
