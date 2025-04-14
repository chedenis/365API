const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { ClubAuth, User, Auth, MemberShip } = require("../models");
const { ConnectionClosedEvent } = require("mongodb");
const ResetToken = require("../models/ResetToken");
const URL = process.env.FRONTEND_URL;
const mongoose = require("mongoose");
const generateOTP = require("../utils/otp");
const {
  sendEmail,
  sendEmailOTP,
  sendEmailForRegister,
  sendRegisterEmailOTP,
  sendEmailToOldUserForResetPassword,
} = require("../utils/mailer");
const {
  checkMemberShipStatus,
  defaultServerErrorMessage,
} = require("../utils/common");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const fs = require("fs");
const csv = require("csv-parser");
const Membership = require("../models/MemberShip");
// JWT helper function
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user?.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "48h" } // Adjust expiration as needed
  );
};

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    const { email, password, firstName, lastName, isMobile } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        message: "Kindly ensure that both email and password are provided.",
      });
    }

    // Check if the user already exists
    const existingAuth = await Auth.findOne({ email, isVerified: true });
    if (existingAuth) {
      return res.status(400).json({ message: "User already exists" });
    }

    const findByInactiveUser = await Auth.findOne({ email, isVerified: false });

    let otp;
    if (isMobile) {
      otp = await generateOTP();
    }

    if (findByInactiveUser) {
      if (isMobile) {
        await Auth.findByIdAndUpdate(findByInactiveUser?._id, {
          otp: otp,
        });

        await sendRegisterEmailOTP(email, "Registration OTP", "member", otp);
        return res.status(200).json({
          message:
            "The user already exists in the system. Please proceed with user verification",
          token: getOtpJwtToken(findByInactiveUser),
          otp: otp,
        });
      } else {
        await sendEmailForRegister(email, "Registration email", "member", {
          email: email,
          link: `${process.env.FRONTEND_URL}/member/confirmation?confirmation_token=${findByInactiveUser?.randomString}`,
        });
        return res.status(200).json({
          message:
            "A message with a confirmation link has been sent to your email address. Please follow the link to activate your account.",
        });
      }
    } else {
      const newUser = new User({ email, firstName, lastName });
      await newUser.save();

      const newAuth = new Auth({
        email,
        password,
        user: newUser._id,
        otp: otp || "",
      });

      await newAuth.save();

      if (isMobile) {
        await sendRegisterEmailOTP(email, "Registration OTP", "member", otp);
        return res.status(200).json({
          message:
            "The user has been successfully registered. Kindly proceed with verification.",
          token: getOtpJwtToken(newAuth),
          otp: otp,
        });
      } else {
        await sendEmailForRegister(email, "Registration email", "member", {
          email: email,
          link: `${process.env.FRONTEND_URL}/member/confirmation?confirmation_token=${newAuth?.randomString}`,
        });
        return res.status(200).json({
          message:
            "A message with a confirmation link has been sent to your email address. Please follow the link to activate your account.",
        });
      }
    }
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ message: defaultServerErrorMessage });
  }
};

exports.registerResendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    let findUser = await Auth.findOne({ email });

    if (findUser?.isVerified) {
      return res.status(409).json({ message: "User already verified" });
    } else {
      const otp = `${await generateOTP()}`;
      await Auth.findByIdAndUpdate(findUser?._id, {
        otp: otp,
      });

      await sendRegisterEmailOTP(email, "Registration OTP", "member", otp);
      return res.status(200).json({
        message:
          "The user already exists in the system. Please proceed with user verification",
        token: getOtpJwtToken(findUser),
        otp: otp,
      });
    }
  } catch (error) {
    console.error("Register resend error:", error);
    return res.status(500).json({ message: defaultServerErrorMessage });
  }
};

exports.registerVerifyOtp = async (req, res) => {
  const user = req.user;
  const { otp } = req.body;

  try {
    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    if (user.otp != otp) {
      return res.status(404).json({ message: "Invalid OTP" });
    }

    user.otp = "";
    user.isVerified = true;
    await user.save();
    console.log("user?.user", user?.user);
    const findUser = await User.findById(user?.user);
    const token = generateToken(findUser);

    const findMemberShip = await checkMemberShipStatus(user?._id);
    return res.status(200).json({
      message: "User verified successfully",
      token: token,
      user: user,
      membershipData: findMemberShip?.status
        ? findMemberShip?.membershipData
        : {},
    });
  } catch (error) {
    return res.status(400).json({
      message:
        "The token has expired or is invalid. Please request a new password reset",
      error: error.message,
    });
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
    let auth = await Auth.findOne({ email });

    if (!user) {
      user = new User({
        firstName,
        lastName,
        email,
        profile_picture: picture,
      });
      if (!auth) {
        const auth = await new Auth({
          email,
          googleId,
          socialType: "google",
          user: user?._id,
        });
        await auth.save();
      }
      await user.save();
    } else {
      auth.googleId = googleId;
      auth.socialType = "google";
      await auth.save();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const findMemberShip = await checkMemberShipStatus(user?._id);
    return res.json({
      message: "Login successful",
      token,
      user,
      membershipData: findMemberShip?.status
        ? findMemberShip?.membershipData
        : {},
    });
  } catch (error) {
    console.error("Google Mobile Auth Error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
// Login with email and password
exports.login = async (req, res, next) => {
  console.log("attempting login with email");
  console.log(req.body.email);
  passport.authenticate("local", async (err, user, info) => {
    console.log("Inside passport callback...");
    if (err) {
      console.error("Authentication error", err);
      return next(err);
    }
    if (!user) {
      if (info?.isGenerateOtp && req?.body?.isMobile) {
        const getOtp = await generateOTP();
        const token = await getOtpJwtToken(info?.authData);
        await Auth.findByIdAndUpdate(info?.authData?._id, { otp: `${getOtp}` });
        await sendRegisterEmailOTP(
          info?.authData?.email,
          "Registration OTP",
          "member",
          getOtp
        );
        return res.status(200).json({
          message: info?.message,
          otp: getOtp,
          token: token,
          isVerified: info?.isVerified,
        });
      }
      return res.status(400).json({ message: info.message });
    }

    const token = generateToken(user);
    console.log("we are here");
    console.log(user);
    const findMemberShip = await checkMemberShipStatus(user?._id);
    res.status(200).json({
      message: "Logged in successfully",
      token,
      user: user,
      isVerified: true,
      membershipData: findMemberShip?.status
        ? findMemberShip?.membershipData
        : {},
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
  const { email, isMobile } = req.body;
  try {
    let user = await Auth.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const getOtp = await generateOTP();
    if (isMobile) {
      await Auth.findByIdAndUpdate(user._id, { otp: `${getOtp}` });

      const generateToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET_OTP_MEMBER,
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

      return res.status(200).json({ message: "Reset Link sent to your email" });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal server error" });
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
    } catch (error) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (!decoded?.id || typeof decoded?.id !== "string") {
      return res.status(400).json({ message: "Invalid token ID" });
    }

    const auth = await Auth.findById(decoded?.id);
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

exports.appleLogin = async (req, res, next) => {
  try {
    const { firstName, lastName, email, appleId } = req.body;

    let findExistRecord = await Auth.findOne({ email });

    // User exists and is already verified
    if (findExistRecord && findExistRecord.isVerified) {
      await Auth.findByIdAndUpdate(findExistRecord._id, {
        appleId,
        socialType: "apple",
        isVerified: true,
      });

      const findUser = await User.findById(findExistRecord.user);
      const token = await generateToken(findUser);
      const findMemberShip = await checkMemberShipStatus(findUser._id);

      return res.status(200).json({
        message: "User login successfully",
        token,
        user: findUser,
        isVerified: true,
        membershipData: findMemberShip?.status
          ? findMemberShip.membershipData
          : {},
        isNewRecord: false,
      });
    }

    // If user exists but not verified, update & verify
    if (findExistRecord && !findExistRecord.isVerified) {
      await Auth.findByIdAndUpdate(findExistRecord._id, {
        appleId,
        socialType: "apple",
        isVerified: true,
      });

      const findUser = await User.findById(findExistRecord.user);
      const token = await generateToken(findUser);
      const findMemberShip = await checkMemberShipStatus(findUser._id);

      return res.status(200).json({
        message: "User login successfully",
        token,
        user: findUser,
        isVerified: true,
        membershipData: findMemberShip?.status
          ? findMemberShip.membershipData
          : {},
        isNewRecord: false,
      });
    }

    // Create new user and auth record
    const newUser = new User({ firstName, lastName, email });
    await newUser.save();

    const newAuth = new Auth({
      email,
      appleId,
      socialType: "apple",
      isVerified: true,
      user: newUser._id,
    });

    await newAuth.save();

    const token = await generateToken(newUser);
    const findMemberShip = await checkMemberShipStatus(newUser._id);

    return res.status(200).json({
      message: "New User login successfully",
      token,
      user: newUser,
      isVerified: true,
      membershipData: findMemberShip?.status
        ? findMemberShip.membershipData
        : {},
      isNewRecord: true,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: defaultServerErrorMessage,
      data: {},
    });
  }
};

exports.checkRecordForAppleLogin = async (req, res) => {
  try {
    const { appleId } = req.body;
    let findExistRecord = await Auth.findOne({ appleId: appleId });

    if (findExistRecord) {
      const findUser = await User.findById(findExistRecord?.user);
      const token = await generateToken(findUser);
      const findMemberShip = await checkMemberShipStatus(findUser?._id);

      return res.status(200).json({
        message: "Record already exist",
        status: true,
        isRecordExist: true,
        isVerified: findExistRecord?.isVerified ?? true,
        user: findUser,
        membershipData: findMemberShip?.status
          ? findMemberShip?.membershipData
          : {},
        token: token,
      });
    } else {
      return res.status(200).json({
        message: "Record not found",
        status: true,
        isRecordExist: false,
        user: {},
        token: "",
      });
    }
  } catch (error) {
    console.log("error", error);
    return res.status(200).json({
      message: defaultServerErrorMessage,
      status: false,
      isRecordExist: false,
      user: {},
      token: "",
    });
  }
};

// Logout (JWT doesn't need server-side logout unless blacklisting is implemented)
exports.logout = (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};

exports.verifyUser = async (req, res) => {
  try {
    const { confirmation_token } = req.query;

    if (!confirmation_token) {
      return res
        .status(400)
        .json({ message: "Token is required", status: false });
    }

    const findUser = await Auth.findOne({ randomString: confirmation_token });
    if (!findUser) {
      return res.status(404).json({ message: "User not found", status: false });
    } else if (findUser?.isVerified) {
      return res
        .status(409)
        .json({ message: "User already verified", status: false });
    } else {
      await Auth.findByIdAndUpdate(findUser?._id, {
        isVerified: true,
      });
      return res.status(200).json({
        success: true,
        message: "User verified successfully",
      });
    }
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ error: "Error registering user" });
  }
};

exports.makeEveryMemberVerified = async (req, res) => {
  try {
    const users = await Auth.find({});

    for (let i = 0; i < users.length; i++) {
      await Auth.findByIdAndUpdate(users[i]._id, {
        isVerified: true,
      });
    }
    return res.status(200).json({
      message: "User verified successfully",
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

exports.memberMigration = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No file uploaded or file is not a CSV" });
    }

    const results = [];

    const testEmailForSendEmail = [
      "bhavyaa.sigmasolve@gmail.com",
      "rkhatri@sigmasolve.com",
      "bbhojani@sigmasolve.com",
      "cancel1111@yopmail.com"
    ];

    // don't make false without permission
    const needToStoreTestDataOnly = true;
    // don't make false without permission

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        // Delete the file after processing
        fs.unlinkSync(req.file.path);

        for (let i = 0; i < results.length; i++) {
          try {
            const userData = results[i];

            if (userData?.id) {
              if (
                !needToStoreTestDataOnly ||
                testEmailForSendEmail.includes(userData.Email)
              ) {
                console.log(userData,"userData")
                storeMemberData(userData);
              }
            }
          } catch (error) {
            console.log("error", error);
          }
        }

        res.json({
          success: true,
          data: results,
          rowCount: results.length,
        });
      })
      .on("error", (error) => {
        console.error("Error parsing CSV:", error);
        res.status(500).json({ error: "Failed to parse CSV file" });
      });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: defaultServerErrorMessage,
      status: false,
    });
  }
};

function getOtpJwtToken(user) {
  const generateToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET_OTP_MEMBER,
    {
      expiresIn: "10m",
    }
  );
  return generateToken;
}

async function storeMemberData(userData) {
  let newAuth;
  try {
    const findUser = await User.findOne({ email: userData.Email });
    console.log(findUser,"findUser")
    if (!findUser) {
      // get membership data and add in our database
      try {
        const customerId = userData?.id;

        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          expand: ["data.plan.product"],
          limit: 1000,
        });

        const subscriptionsList = subscriptions?.data;
        console.log(subscriptionsList, "subscriptionsList");

        const userStatusMapping = {
          active: "Active",
          past_due: "Inactive",
          canceled: "Inactive",
          unpaid: "Inactive",
          inactive: "Inactive",
        };
        console.log(
          subscriptionsList?.[0]?.status,
          userStatusMapping?.[subscriptionsList?.[0]?.status],
          userStatusMapping?.[subscriptionsList?.[0]?.status] ?? "Inactive",
          "test"
        );
        const newUser = new User({
          email: userData?.Email,
          firstName: userData?.Name?.split(" ")[0],
          lastName: userData?.Name?.split(" ")[1],
          stripeCustomerId: userData?.id,
          membershipStatus:
            userStatusMapping?.[subscriptionsList?.[0]?.status] ?? "Inactive",
        });

        await newUser.save();

        newAuth = new Auth({
          email: userData?.Email,
          isVerified: true,
          user: newUser?._id,
          password: "dink@123",
          createdAt: new Date(userData?.["Created (UTC)"]),
        });
        await newAuth.save();

        if (subscriptionsList?.length > 0) {
          const findMemberShip = await MemberShip.findOne({
            stripe_customer_id: userData?.id,
          });

          const createOrUpdateObj = {
            user: newUser?._id,
            stripe_customer_id: userData?.id,
            stripe_subscription_id: subscriptionsList?.[0]?.id,
            status: subscriptionsList?.[0]?.status,
            start_date: new Date(
              subscriptionsList?.[0]?.current_period_start * 1000
            ).toUTCString(),
            end_date: new Date(
              subscriptionsList?.[0]?.current_period_end * 1000
            ).toUTCString(),
            auto_renew: !subscriptionsList?.[0]?.cancel_at_period_end,
            payment_count: userData?.["Payment Count"],
            refund_amount: userData?.["Refunded Volume"],
            total_spend: userData?.["Total Spend"],
          };
          console.log("findMemberShip", findMemberShip);
          if (findMemberShip) {
            await MemberShip.findByIdAndUpdate(
              findMemberShip?._id,
              createOrUpdateObj
            );
          } else {
            const membership = await MemberShip.create(createOrUpdateObj);
            await membership.save();
          }
        }
      } catch (error) {
        console.log("membership error", error);
      }

      //send email for reset password
      try {
        let user = newAuth;

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
        await sendEmailToOldUserForResetPassword(
          userData?.Email,
          "ResetPassword",
          {
            name: userData?.Name,
            resetUrl: resetLink,
          }
        );
      } catch (error) {
        console.log("send email error", error);
      }
    }
  } catch (error) {
    console.log("error", error);
  }
}
