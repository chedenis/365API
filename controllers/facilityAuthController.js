// controllers/facilityAuthController.js

const bcrypt = require("bcrypt");
const FacilityAuth = require("../models/FacilityAuth");
const Facility = require("../models/Facility");
const getCoordinates = require("../utils/getCoordinates");

exports.registerFacility = async (req, res) => {
  console.log("we are creating a club");
  try {
    const {
      facilityName,
      address,
      email,
      password,
      website,
      phone,
      numberOfCourts,
      reservationType,
      // New fields
      shortDescription,
      surfaceType,
      netType,
      courtTypes,
      amenities,
      activities,
      pickleballAmenities,
      proShopDiscount,
      ageRestrictions,
      otherActivities,
      foodBeverage,
      hasRestrooms,
      lockerAmenities,
      childcareAmenities,
      parkingType,
      operatingHours,
    } = req.body;

    if (!facilityName || !address || !email || !password) {
      return res.status(400).json({
        error: "Facility name, address, email, and password are required",
      });
    }

    const existingFacilityAuth = await FacilityAuth.findOne({ email });
    if (existingFacilityAuth) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`;
    const { latitude, longitude } = await getCoordinates(fullAddress);

    const newFacility = new Facility({
      facilityName,
      address: { ...address, latitude, longitude },
      email,
      website,
      phone,
      numberOfCourts,
      reservationType,
      // New fields
      shortDescription,
      surfaceType,
      netType,
      courtTypes,
      amenities,
      activities,
      pickleballAmenities,
      proShopDiscount,
      ageRestrictions,
      otherActivities,
      foodBeverage,
      hasRestrooms,
      lockerAmenities,
      childcareAmenities,
      parkingType,
      operatingHours,
    });
    await newFacility.save();

    const hashedPassword = await bcrypt.hash(password, 10);
    const newFacilityAuth = new FacilityAuth({
      email,
      password: hashedPassword,
      facility: newFacility._id,
    });

    await newFacilityAuth.save();
    res.status(201).json({ message: "Facility registered successfully" });
  } catch (err) {
    console.error("Error registering facility", err);
    res
      .status(500)
      .json({ error: "Error registering facility", details: err.message });
  }
};

exports.loginFacility = async (req, res) => {
  try {
    const { email, password } = req.body;
    const facilityAuth = await FacilityAuth.findOne({ email }).populate(
      "facility"
    );
    if (!facilityAuth)
      return res.status(404).json({ error: "Facility not found" });

    const isMatch = await bcrypt.compare(password, facilityAuth.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

    const token = { id: "foo" };

    res.status(200).json({ token });
  } catch (err) {
    console.error("Error logging in", err);
    res.status(500).json({ error: "Error logging in", details: err.message });
  }
};
