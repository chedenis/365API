const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { ClubAuth, User, Auth } = require("../models");
const { ConnectionClosedEvent } = require("mongodb");
const ResetToken = require("../models/ResetToken");
const URL = process.env.FRONTEND_URL;
const sendEmail = require("../utils/mailer");
const mongoose = require("mongoose");

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
exports.getLoginStatus = async (req, res) => {
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
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if the user already exists
    const existingAuth = await Auth.findOne({ email });
    if (existingAuth) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create the User
    const newUser = new User({ email, firstName, lastName });
    await newUser.save();

    // Create the Auth record; pass plaintext password
    const newAuth = new Auth({
      email,
      password, // Plaintext password; the hook will hash it
      user: newUser._id,
    });

    await newAuth.save();

    // Generate a token
    const token = await generateToken(newUser);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
    });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ error: "Error registering user" });
  }
};

exports.googleMobileAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "Id token is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: "Invalid google token" });
    }
    // const googleResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);

    const {
      email,
      sub: googleId,
      picture,
      name,
      given_name,
      family_name,
    } = payload;

    if (!email) {
      return res.status(400).json({ error: "Invalid google token" });
    }

    const firstName = given_name || (name ? name.split(" ")[0] : "");
    const lastName =
      family_name || (name ? name.split(" ").slice(1).join(" ") : "");

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        firstName,
        lastName,
        email,
        googleId,
        profileImage: picture,
        socialType: "google",
      });
      await user.save();
    } else {
      user.googleId = googleId;
      user.socialType = "google";
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Google Mobile Auth Error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
// Login with email and password
exports.login = (req, res, next) => {
  console.log("attempting login with email");
  console.log(req.body.email);
  passport.authenticate("local", (err, user, info) => {
    console.log("Inside passport callback...");
    if (err) {
      console.error("Authentication error", err);
      return next(err);
    }
    if (!user) {
      console.log("User not found", info.message);
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

exports.validateToken = async (req, res) => {
  const { id } = req.params;
  try {
    const resetTokenData = await ResetToken.findOne({ token: id });
    if (!resetTokenData) {
      return res.status(400).json({ message: "Invalid Token" });
    }
    if (resetTokenData?.used) {
      return res.status(400).json({ message: "Token already used" });
    }
    if (resetTokenData?.accessed) {
      return res
        .status(400)
        .json({ message: "Token already accessed. The link is invalid" });
    }

    resetTokenData.accessed = true;
    await resetTokenData.save();
    res
      .status(200)
      .json({ message: "Token is valid. Proceed to reset your password" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    let user = await User.findOne({ email });
    console.log("this is the user", user);
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const resetTokenData = new ResetToken({
      userId: user._id,
      token: resetToken,
      createdAt: new Date(),
    });

    await resetTokenData.save();

    const resetLink = `${URL}/member/reset-password?token=${resetToken}`;
    try {
      await sendEmail(email, "ResetPassword", resetLink, "member");
    } catch (error) {
      console.error("Email sending failed:", error);
      return res.status(500).json({ message: "Failed to send reset email" });
    }

    res.status(200).json({ message: "Reset Link sent to your email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const resetTokenData = await ResetToken.findOne({ token });
    if (!resetTokenData) {
      return res.status(400).json({ message: "Invalid Token" });
    }
    if (resetTokenData?.used) {
      return res.status(400).json({ message: "Token already used" });
    }
    if (resetTokenData.accessed === false) {
      return res.status(400).json({
        message: "Token not accessed. Please validate the token first",
      });
    }
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("decoded is", decoded);
    } catch (error) {
      console.error("Token verification failed", error.message);
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    console.log("Decoded ID:", decoded?.id);
    console.log(typeof decoded?.id);

    if (!decoded?.id || typeof decoded?.id !== "string") {
      return res.status(400).json({ message: "Invalid token ID" });
    }

    const userId = new mongoose.Types.ObjectId(decoded.id);

    const auth = await Auth.findOne({ user: userId });
    console.log(auth, "authauthauthauth");
    if (!auth) {
      return res.status(404).json({ message: "User not found" });
    }

    auth.password = newPassword;
    auth.passwordUpdatedAt = new Date();
    await auth.save();
    // const passwordUpdateAt = user.passwordUpdateAt.getTime();
    // const tokenIssuedAt = decoded.iat * 1000;

    // if (passwordUpdateAt > tokenIssuedAt) {
    //   return res.status(401).json({
    //     message: "Your password has been changed. Please log in again",
    //   });
    // }
    resetTokenData.used = true;
    await resetTokenData.save();

    const newToken = generateToken(auth);
    res
      .status(200)
      .json({ message: "Password reset successfully", token: newToken });
  } catch (error) {
    res.status(400).json({
      message:
        "The token has expired or is invalid. Please request a new password reset",
      error: error.message,
    });
  }
};

// Google OAuth
exports.googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

exports.googleCallback = (req, res, next) => {
  passport.authenticate("google", async (err, user) => {
    console.log("🔹 User from Google Callback:", user);

    if (err || !user) {
      console.error("🚨 Google Auth Error:", err);
      return res.redirect(`${URL}/member/login`);
    }

    try {
      if (!user._id) {
        console.error("🚨 Error: User ID is missing:", user);
        return res.redirect(`${URL}/member/login`);
      }

      const token = await generateToken(user);
      console.log("✅ Token Generated:", token);

      res.redirect(`${URL}/member/type?token=${token}`);
    } catch (error) {
      console.error("❌ Error generating token:", error);
      return res.redirect(`${URL}/member/login`);
    }
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
