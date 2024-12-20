const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { ClubAuth } = require("../models");

// Helper: Generate JWT Token
const generateToken = (clubAuth) => {
  return jwt.sign(
    { id: clubAuth._id, email: clubAuth.email },
    process.env.JWT_SECRET,
    { expiresIn: "48h" }
  );
};

// Local Registration
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

// Local Login
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

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await ClubAuth.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + 3600000; // 1 hour expiry

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = tokenExpiry;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/club-reset-password?token=${resetToken}`;

    const params = {
      Source: process.env.SES_SOURCE_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Password Reset Request" },
        Body: {
          Html: {
            Data: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
          },
          Text: {
            Data: `Click the following link to reset your password: ${resetUrl}`,
          },
        },
      },
    };

    await s3Client.sendEmail(params).promise();

    res.json({ message: "Password reset email sent successfully." });
  } catch (err) {
    console.error("Error in forgotPassword", err);
    res.status(500).json({ message: "Error sending password reset email." });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await ClubAuth.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token." });
    }

    user.password = newPassword; // Use bcrypt in production to hash the password
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Error in resetPassword", err);
    res.status(500).json({ message: "Error resetting password." });
  }
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
