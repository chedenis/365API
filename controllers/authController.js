const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { Auth, User } = require("../models");
const { ConnectionClosedEvent } = require("mongodb");
const URL = process.env.FRONTEND_URL;

// JWT helper function
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "48h" } // Adjust expiration as needed
  );
};

// Check login status
exports.getLoginStatus = async(req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.email) {
      return res
        .status(400)
        .json({ message: "Token does not contain an email" });
    }

    const user = await User.findOne({ email: decoded?.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error("Error verifying token:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if the user already exists
    const existingAuth = await Auth.findOne({ email });
    if (existingAuth) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create the User
    const newUser = new User({ email });
    await newUser.save();

    // Create the Auth record; pass plaintext password
    const newAuth = new Auth({
      email,
      password, // Plaintext password; the hook will hash it
      user: newUser._id,
    });

    await newAuth.save();

    // Generate a token
    const token = generateToken(newUser);

    res.status(201).json({ message: "User registered successfully", token });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ error: "Error registering user" });
  }
};

// Login with email and password
exports.login = (req, res, next) => {
  console.log("attempting login with email");
  console.log(req.body.email);
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(400).json({ error: info.message });
    }

    const token = generateToken(user);
    console.log("we are here");
    console.log(user);
    res.status(200).json({
      message: "Logged in successfully",
      token,
      user: user,
    });
  })(req, res, next);
};

// Google OAuth
exports.googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

exports.googleCallback = (req, res, next) => {
  // console.log(req,res, next)
  passport.authenticate("google", (err, user) => {
    console.log(err,user,"errr")

    if (err || !user) {
      return res.redirect(`${URL}/member/login`);
    }

    const token = generateToken(user);
    res.redirect(`${URL}/member/type?token=${token}`);
  })(req, res, next);
};

// Facebook OAuth
exports.facebookAuth = passport.authenticate("facebook");

exports.facebookCallback = (req, res, next) => {
  passport.authenticate("facebook", (err, user) => {
    if (err || !user) {
      return res.redirect("/api/auth/failure");
    }

    const token = generateToken(user);

    res.redirect(`${process.env.WEB_SUCCESS_REDIRECT}?token=${token}`);
  })(req, res, next);
};

// Logout (JWT doesn't need server-side logout unless blacklisting is implemented)
exports.logout = (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};
