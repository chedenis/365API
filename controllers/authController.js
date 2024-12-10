const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { Auth, User } = require("../models");

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
exports.getLoginStatus = (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(200).json({ loggedIn: false, user: null });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(200).json({ loggedIn: false, user: null });
    }

    res.status(200).json({
      loggedIn: true,
      user: { id: decoded.id, email: decoded.email },
    });
  });
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existingAuth = await Auth.findOne({ username: email });
    if (existingAuth) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
    });
    await newUser.save();

    const newAuth = new Auth({
      username: email,
      password: hashedPassword,
      user: newUser._id,
    });
    await newAuth.save();

    const token = generateToken(newUser);

    res.status(201).json({ message: "User registered successfully", token });
  } catch (err) {
    console.error("Error registering user", err);
    res.status(500).json({ error: "Error registering user" });
  }
};

// Login with email and password
exports.login = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(400).json({ error: info.message });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: "Logged in successfully",
      token,
      user: { id: user._id, email: user.email },
    });
  })(req, res, next);
};

// Google OAuth
exports.googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

exports.googleCallback = (req, res, next) => {
  passport.authenticate("google", (err, user) => {
    if (err || !user) {
      return res.redirect("/api/auth/failure");
    }

    const token = generateToken(user);

    res.redirect(`${process.env.WEB_SUCCESS_REDIRECT}?token=${token}`);
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
