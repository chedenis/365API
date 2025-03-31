const { MobileAppVersion } = require("../models");
const ContactUs = require("../models/ContactUs");
const { defaultServerErrorMessage } = require("../utils/common");
const sendMail = require("../utils/nodemailer");

exports.submitContactForm = async (req, res) => {
  try {
    const { name, phoneNumber, email, message } = req.body;

    const newContact = new ContactUs({
      name,
      phoneNumber,
      email,
      message,
    });

    await newContact.save();

    const htmlContent = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone Number:</strong> ${phoneNumber || "N/A"}</p>
    <p><strong>Message:</strong> ${message}</p>
  `;

    await sendMail(
      "rkhatri@sigmasolve.com",
      "New Contact Form Submission",
      htmlContent
    );

    res.status(201).json({ message: "Contact form submitted successfully" });
  } catch (error) {
    console.error("Error submitting contact form", error);
    res
      .status(500)
      .json({ error: "Failed to submit contact form", details: error.message });
  }
};

exports.updateMobileAppVersion = async (req, res) => {
  try {
    const {
      iosVersion,
      androidVersion,
      isIosForceUpdate,
      isAndroidForceUpdate,
    } = req.body;

    let versionConfig = await MobileAppVersion.findOne().sort({
      createdAt: -1,
    });

    if (versionConfig) {
      // Update existing record
      versionConfig.iosVersion = iosVersion || "1.0.0";
      versionConfig.androidVersion = androidVersion || "1.0.0";
      versionConfig.isIosForceUpdate = isIosForceUpdate || false;
      versionConfig.isAndroidForceUpdate = isAndroidForceUpdate || false;
    } else {
      // Create new record if none exists
      versionConfig = new MobileAppVersion({
        iosVersion: iosVersion || "1.0.0",
        androidVersion: androidVersion || "1.0.0",
        isIosForceUpdate: isIosForceUpdate || false,
        isAndroidForceUpdate: isAndroidForceUpdate || false,
      });
    }
    await versionConfig.save();

    return res.status(200).json({
      success: true,
      message: "Version updated successfully",
      data: versionConfig,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      success: false,
      message: defaultServerErrorMessage,
      data: {},
    });
  }
};

exports.getMobileAppVersion = async (req, res) => {
  try {
    let versionConfig = await MobileAppVersion.findOne().sort({
      createdAt: -1,
    });

    if (!versionConfig) {
      return res.status(404).json({
        success: false,
        message: "Mobile Versions not found",
        data: {},
      });
    }

    return res.status(200).json({
      success: true,
      message: "Version fetched successfully",
      data: versionConfig,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      success: false,
      message: defaultServerErrorMessage,
    });
  }
};
