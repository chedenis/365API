const jwt = require("jsonwebtoken");
const passport = require("passport");
const { ClubAuth } = require("../models");
const bcrypt = require("bcryptjs");
const { ResetToken } = require("../models");
const {
  sendEmailOTP,
  sendEmail,
  sendEmailForRegister,
} = require("../utils/mailer");
const generateOTP = require("../utils/otp");

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
  const { email, password, referralCode } = req.body;

  try {
    const existingClubAuth = await ClubAuth.findOne({
      email,
      isVerified: true,
    });
    if (existingClubAuth) {
      return res.status(409).json({ error: "Club owner already exist" });
    }

    const findByInactiveClubOwner = await ClubAuth.findOne({
      email,
      isVerified: false,
    });
    if (findByInactiveClubOwner) {
      await sendEmailForRegister(email, "Registration email", "club", {
        email: email,
        link: `${process.env.FRONTEND_URL}/club/confirmation?confirmation_token=${findByInactiveClubOwner?.randomString}`,
      });
      return res
        .status(200)
        .json({ error: "Club owner already exist please verify it" });
    } else {
      const newClubAuth = new ClubAuth({ email, password, referralCode });
      await newClubAuth.save();

      await sendEmailForRegister(email, "Registration email", "club", {
        email: email,
        link: `${process.env.FRONTEND_URL}/club/confirmation?confirmation_token=${newClubAuth?.randomString}`,
      });

      return res.status(200).json({
        message: "Club owner registered successfully please verify to login",
      });
    }
  } catch (error) {
    console.error("Error registering club", error);
    return res.status(500).json({ error: "Error registering club" });
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

    if (!clubAuth?.isVerified) {
      return done(null, false, {
        message: "Please verify to login",
      });
    }

    const token = generateToken(clubAuth);

    res.status(200).json({
      message: "Club logged in successfully",
      token,
      clubAuth: {
        id: clubAuth._id,
        email: clubAuth.email,
        userType: clubAuth.userType,
      },
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
  try {
    const { email, isMobile } = req.body;
    const getOtp = await generateOTP();
    if (isMobile) {
      let clubAuth = await ClubAuth.findOne({ email });

      if (!clubAuth) return res.status(404).json({ message: "User not found" });

      await ClubAuth.findByIdAndUpdate(clubAuth._id, { otp: `${getOtp}` });

      const generateToken = jwt.sign(
        { id: clubAuth._id },
        process.env.JWT_SECRET_OTP_CLUB,
        {
          expiresIn: "10m",
        }
      );
      try {
        await sendEmailOTP(email, "ResetPasswordOtp", getOtp, "member");
      } catch (error) {
        console.error("Email sending failed:", error);
        return res.status(500).json({
          message: "Failed to send reset email",
        });
      }

      res.status(200).json({
        message: "OTP sent to your email",
        token: generateToken,
        otp: getOtp,
      });
    } else {
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
      await sendEmail(email, "Reset Password", resetLink, "club");
      res.status(200).json({ message: "Reset link sent to your email" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
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

exports.resetPasswordMobile = async (req, res) => {
  const user = req.user;

  const { otp, newPassword } = req.body;
  try {
    if (user.otp != otp) {
      return res.status(404).json({ message: "Invalid OTP" });
    }

    user.otp = "";
    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(400).json({
      message:
        "The token has expired or is invalid. Please request a new password reset",
      error: error.message,
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
      console.error("Google auth failed:", err);
      // Please remove static credentials once we have updated the .env file correctly
      return res.redirect(`${URL}/club/login`);
    }
    const token = generateToken(clubAuth);
    console.log("Google Auth Successful, Redirecting with Token:", token);
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

// Logout (JWT doesn't need server-side logout unless blacklisting is implemented)
exports.getProfile = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        status: false,
        message: "please provide email",
        data: {},
      });
    }

    const findUser = await ClubAuth.findOne({ email: email });
    if (findUser) {
      res.status(200).json({
        status: true,
        message: "Details get successfully",
        data: findUser,
      });
    } else {
      res.status(400).json({
        status: false,
        message: "Details not found",
        data: {},
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: defaultServerErrorMessage,
      data: {},
    });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const { confirmation_token } = req.query;

    if (!confirmation_token) {
      return res
        .status(400)
        .json({ message: "Token is required", status: false });
    }

    const findUser = await ClubAuth.findOne({
      randomString: confirmation_token,
    });
    if (!findUser) {
      return res
        .status(404)
        .json({ message: "Club owner not found", status: false });
    } else if (findUser?.isVerified) {
      return res
        .status(409)
        .json({ message: "Club owner already verified", status: false });
    } else {
      await ClubAuth.findByIdAndUpdate(findUser?._id, {
        isVerified: true,
      });
      return res.status(200).json({
        success: true,
        message: "Club owner verified successfully",
      });
    }
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ error: "Error registering user" });
  }
};

exports.makeEveryClubOwnerVerified = async (req, res) => {
  try {
    const clubOwner = await ClubAuth.find({});

    for (let i = 0; i < clubOwner.length; i++) {
      await ClubAuth.findByIdAndUpdate(clubOwner[i]._id, {
        isVerified: true,
      });
    }
    return res.status(200).json({
      message: "Club owner verified successfully",
      status: true,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: defaultServerErrorMessage,
      status: false,
    });
  }
};

exports.updateClubOwnerToAdmin = async (req, res) => {
  try {
    const { emailList } = req.body;

    // Update users in the list to "admin"
    await ClubAuth.updateMany(
      { email: { $in: emailList } },
      { $set: { userType: "admin" } }
    );

    // Update users NOT in the list to "clubOwner"
    await ClubAuth.updateMany(
      { email: { $nin: emailList } },
      { $set: { userType: "clubOwner" } }
    );

    return res.status(200).json({ message: "Club updated successfully" });
  } catch (err) {
    console.error("Error updating club", err);
    return res
      .status(500)
      .json({ error: "Error updating club", details: err.message });
  }
};
