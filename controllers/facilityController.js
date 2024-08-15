// controllers/facilityController.js
const Facility = require("../models/Facility");
const flattenUpdates = require("../utils/flattenUpdates");

exports.getFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.facility.id).select(
      "-password"
    );
    if (!facility) {
      return res.status(404).json({ error: "Facility not found" });
    }
    res.status(200).json(facility);
  } catch (err) {
    console.error("Error fetching facility", err);
    res
      .status(500)
      .json({ error: "Error fetching facility", details: err.message });
  }
};

exports.updateFacility = async (req, res) => {
  try {
    const updates = flattenUpdates(req.body);

    const facility = await Facility.findByIdAndUpdate(
      req.facility.id,
      { $set: updates },
      {
        new: true, // Return the updated document
        runValidators: true, // Ensure the updates are validated against the schema
        context: "query", // Needed for certain validators
      }
    );

    if (!facility) {
      return res.status(404).json({ error: "Facility not found" });
    }

    res.status(200).json(facility);
  } catch (err) {
    console.error("Error updating facility", err);
    res
      .status(500)
      .json({ error: "Error updating facility", details: err.message });
  }
};

// Function to list all facilities
exports.listFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find().select("-password");
    res.status(200).json(facilities);
  } catch (err) {
    console.error("Error listing facilities", err);
    res
      .status(500)
      .json({ error: "Error listing facilities", details: err.message });
  }
};
