const miscellaneousController = require("../controllers/miscellaneousController");
const express = require("express");
const router = express.Router();

router.post("/contact-form", miscellaneousController.submitContactForm);
router.post(
  "/update-mobile-app-version",
  miscellaneousController.updateMobileAppVersion
);
router.get(
  "/get-mobile-app-version",
  miscellaneousController.getMobileAppVersion
);

module.exports = router;
