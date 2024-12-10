const jwt = require("jsonwebtoken");
const passport = require("passport");
const { ClubAuth } = require("../models");

// JWT helper function
const generateToken = (clubAuth) => {
  return jwt.sign(
    {
      id: clubAuth._id,
      email: clubAuth.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "48h" } // Adjust token expiration as needed
  );
};

// Local registration
exports.registerClubAuth = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingClubAuth = await ClubAuth.findOne({ email });
    if (existingClubAuth) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const newClubAuth = new ClubAuth({ email, password });
    await newClubAuth.save();

    const token = generateToken(newClubAuth);

    res.status(201).json({
      message: "Club registered successfully",
      token,
      clubAuth: { id: newClubAuth._id, email: newClubAuth.email },
    });
  } catch (error) {
    console.error("Error registering club", error);
    res.status(500).json({ error: "Error registering club" });
  }
};

// Local login
exports.loginClub = (req, res, next) => {
  passport.authenticate("club-local", (err, clubAuth, info) => {
    if (err) {
      console.error("Error during authentication:", err);
      return next(err);
    }
    if (!clubAuth) {
      return res.status(400).json({ error: info.message });
    }

    const token = generateToken(clubAuth);

    res.status(200).json({
      message: "Club logged in successfully",
      token,
      clubAuth: { id: clubAuth._id, email: clubAuth.email },
    });
  })(req, res, next);
};

// Google OAuth
exports.googleAuth = passport.authenticate("club-google", {
  scope: ["profile", "email"],
});

exports.googleCallback = (req, res, next) => {
  passport.authenticate("club-google", (err, clubAuth) => {
    if (err || !clubAuth) {
      return res.redirect("/api/club-auth/failure");
    }

    const token = generateToken(clubAuth);

    // Redirect with token (you can include it as a query parameter)
    res.redirect(`${process.env.CLUB_SUCCESS_REDIRECT}?token=${token}`);
  })(req, res, next);
};

// Facebook OAuth
exports.facebookAuth = passport.authenticate("club-facebook");

exports.facebookCallback = (req, res, next) => {
  passport.authenticate("club-facebook", (err, clubAuth) => {
    if (err || !clubAuth) {
      return res.redirect("/api/club-auth/failure");
    }

    const token = generateToken(clubAuth);

    res.redirect(`${process.env.CLUB_SUCCESS_REDIRECT}?token=${token}`);
  })(req, res, next);
};

// Check login status
exports.getLoginStatus = (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(200).json({ loggedIn: false, clubAuth: null });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(200).json({ loggedIn: false, clubAuth: null });
    }

    res.status(200).json({
      loggedIn: true,
      clubAuth: { id: decoded.id, email: decoded.email },
    });
  });
};

// Logout (JWT doesn't need server-side logout unless blacklisting is implemented)
exports.logoutClub = (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};
