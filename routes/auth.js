const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const AuthController = require("../controllers/authController");
const OtpMobileMember = require("../middleware/memberOtpAuth");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create the directory if it doesn't exist
    const uploadPath = path.join(__dirname, "..", "public", "uploads");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

// Registration route
router.post("/register", AuthController.register);
router.post("/register-resend-otp", AuthController.registerResendOtp);
router.post(
  "/register-verify-otp",
  OtpMobileMember,
  AuthController.registerVerifyOtp
);

// Email and password login
router.post("/login", AuthController.login);

router.post("/forgot-password", AuthController.forgotPassword);
router.get("/validate-token/:id", AuthController.validateToken);
router.post("/reset-password", AuthController.resetPassword);
router.post(
  "/reset-password-mobile",
  OtpMobileMember,
  AuthController.resetPasswordMobile
);

// Google OAuth routes
router.get("/google", AuthController.googleAuth);
router.get("/google/callback", AuthController.googleCallback);
router.post("/google-signin", AuthController.googleMobileAuth);

// Facebook OAuth routes
router.get("/facebook", AuthController.facebookAuth);
router.get("/facebook/callback", AuthController.facebookCallback);

router.post("/apple-login", AuthController.appleLogin);
router.post(
  "/check-apple-login-record",
  AuthController.checkRecordForAppleLogin
);

// Check session or login status
router.post("/status", AuthController.getLoginStatus);

// Logout
router.get("/logout", AuthController.logout);

router.get("/update-old-user-verified", AuthController.makeEveryMemberVerified);

router.get("/verify", AuthController.verifyUser);

router.post(
  "/member-migration",
  upload.single("csvFile"),
  AuthController.memberMigration
);

module.exports = router;
