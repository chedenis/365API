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

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const userAuth = await Auth.findOne({ username: email });
    if (!userAuth) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + 3600000; // 1 hour expiry

    // Update Auth with the reset token and expiry
    userAuth.resetPasswordToken = resetToken;
    userAuth.resetPasswordExpires = tokenExpiry;
    await userAuth.save();

    // Create a reset link
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send the reset email using SES or another email service
    const params = {
      Source: process.env.SES_SOURCE_EMAIL, // Verified SES email
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

    // Assuming SES client is set up and imported
    await s3Client.sendEmail(params).promise();

    res.json({ message: "Password reset email sent successfully." });
  } catch (err) {
    console.error("Error in forgotPassword", err);
    res.status(500).json({ message: "Error sending password reset email." });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "Token and new password are required" });
    }

    // Find Auth record by token and check if token has expired
    const userAuth = await Auth.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!userAuth) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token." });
    }

    // Hash and update the password, and clear the reset token and expiry
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    userAuth.password = hashedPassword;
    userAuth.resetPasswordToken = undefined;
    userAuth.resetPasswordExpires = undefined;
    await userAuth.save();

    res.json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Error in resetPassword", err);
    res.status(500).json({ message: "Error resetting password." });
  }
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
