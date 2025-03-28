const mongoose = require("mongoose");

const mobileAppVersion = new mongoose.Schema(
  {
    iosVersion: {
      type: String,
      required: false,
    },
    androidVersion: {
      type: String,
      required: false,
    },
    isIosForceUpdate: {
      type: Boolean,
      default: false,
    },
    isAndroidForceUpdate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const MobileAppVersion = mongoose.model("MobileAppVersion", mobileAppVersion);

module.exports = MobileAppVersion;
