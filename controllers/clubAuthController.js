const jwt = require("jsonwebtoken");
const passport = require("passport");
const { ClubAuth } = require("../models");
const sendEmail = require("../utils/mailer");
const bcrypt = require("bcryptjs");
const { ResetToken } = require("../models");

const URL = process.env.FRONTEND_URL;

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

// Validate Token
exports.validateToken = async (req, res) => {
  const { id } = req.params;
  try {
    const resetTokenData = await ResetToken.findOne({ token: id });

    if (!resetTokenData) {
      return res.status(400).json({ message: "Invalid token" });
    }

    if (resetTokenData?.used) {
      return res.status(400).json({ message: "Token already used" });
    }

    if (resetTokenData?.accessed) {
      return res
        .status(400)
        .json({ message: "Token already accessed. The link is invalid." });
    }

    resetTokenData.accessed = true;
    await resetTokenData.save();

    res
      .status(200)
      .json({ message: "Token is valid. Proceed to reset your password." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await ClubAuth.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const resetToken = jwt.sign({ id: user?._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const resetTokenData = new ResetToken({
      userId: user?._id,
      token: resetToken,
    });
    await resetTokenData.save();
    // Please remove static credentials once we have updated the .env file correctly
    const resetLink = `${URL}/club/reset-password?token=${resetToken}`;
    await sendEmail(email, "Reset Password", resetLink);
    res.status(200).json({ message: "Reset link sent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

//Reset Password
exports.resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  try {
    const resetTokenData = await ResetToken.findOne({ token });
    if (!resetTokenData)
      return res.status(400).json({ message: "Invalid token" });

    if (resetTokenData?.used) {
      return res.status(400).json({ message: "Token is already used" });
    }
    if (!resetTokenData?.accessed) {
      return res.status(400).json({
        message: "Token not accessed. Please validate the token first.",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await ClubAuth.findById(decoded?.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword;
    await user.save();

    resetTokenData.used = true;
    await resetTokenData.save();
    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(400).json({
      message:
        "The token has expired or is invalid. Please request a new password reset",
    });
  }
};

// Google OAuth
exports.googleAuth = passport.authenticate("club-google", {
  scope: ["profile", "email"],
});

exports.googleCallback = (req, res, next) => {
  passport.authenticate("club-google", (err, clubAuth) => {
    if (err || !clubAuth) {
      // Please remove static credentials once we have updated the .env file correctly
      return res.redirect(`${URL}/club/login`);
    }
    const token = generateToken(clubAuth);
    // Please remove static credentials once we have updated the .env file correctly
    res.redirect(`${URL}/club/type?token=${token}`);
  })(req, res, next);
};

// Facebook OAuth
exports.facebookAuth = passport.authenticate("club-facebook");

exports.facebookCallback = (req, res, next) => {
  passport.authenticate("club-facebook", (err, clubAuth) => {
    console.log(err, clubAuth, "err, clubAuth");
    if (err || !clubAuth) {
      // Please remove static credentials once we have updated the .env file correctly
      return res.redirect(`${URL}/club/login`);
    }
    const token = generateToken(clubAuth);
    // Please remove static credentials once we have updated the .env file correctly
    res.redirect(`${URL}/club/type?token=${token}`);
  })(req, res, next);
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

    const user = await ClubAuth.findOne({ email: decoded?.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error("Error verifying token:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Logout (JWT doesn't need server-side logout unless blacklisting is implemented)
exports.logoutClub = (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};
