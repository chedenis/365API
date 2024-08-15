// routes/facility.js
const express = require("express");
const {
  getFacility,
  updateFacility,
  listFacilities,
} = require("../controllers/facilityController");
const facilityAuthMiddleware = require("../middleware/facilityAuth");

const router = express.Router();

router.get("/", facilityAuthMiddleware, getFacility);
router.patch("/", facilityAuthMiddleware, updateFacility);

// Route to list all facilities
router.get("/list", listFacilities);

module.exports = router;
