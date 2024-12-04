const { ClubAuth } = require("../models");
const passport = require("passport");
const bcrypt = require("bcryptjs");

// Helper function to set the cookie manually
const setSessionCookie = (req, res) => {
  console.log("Setting session cookie with session ID:", req.sessionID);
  res.cookie("connect.sid", req.sessionID, {
    secure: process.env.NODE_ENV === "production", // Secure cookies in production
    sameSite: 'none',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 48, // 48 hours
  });
};

exports.getLoginStatus = (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const { email, _id } = req.user;
    return res.status(200).json({
      loggedIn: true,
      clubAuth: {
        id: _id,
        email,
      },
    });
  } else {
    return res.status(200).json({
      loggedIn: false,
      clubAuth: null,
    });
  }
};

exports.registerClubAuth = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    let newClubAuth = await ClubAuth.findOne({ email });
    if (newClubAuth) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Directly create and save the new club auth
    newClubAuth = new ClubAuth({ email, password });
    await newClubAuth.save(); // Password is hashed in the pre-save hook

    // Skip req.login here if you don't need an automatic login

    return res.status(201).json({
      message: "Club registered successfully",
      clubAuth: {
        id: newClubAuth._id,
        email: newClubAuth.email,
      },
    });
  } catch (error) {
    console.error("Error registering club", error);
    res.status(500).json({ error: "Error registering club" });
  }
};

exports.loginClub = (req, res, next) => {
  console.log("Incoming login request:", req.body);

  passport.authenticate("club-local", (err, clubAuth, info) => {
    if (err) {
      console.error("Error during authentication:", err);
      return next(err);
    }
    if (!clubAuth) {
      console.log("Authentication failed:", info.message);
      return res.status(400).json({ error: info.message });
    }

    req.login(clubAuth, (err) => {
      if (err) {
        return next(err);
      }

      console.log("req.user after login:", req.user);
      console.log("req.session after login:", req.session);

      req.session.save((err) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Session save failed after login" });
        }

        setSessionCookie(req, res);

        return res.status(200).json({
          message: "Club logged in successfully",
          clubAuth: {
            id: clubAuth._id,
            email: clubAuth.email,
            clubs: clubAuth.clubs,
          },
        });
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
