// controllers/clubAuthController.js

const bcrypt = require("bcrypt");
const ClubAuth = require("../models/ClubAuth");
const Club = require("../models/Club");
const getCoordinates = require("../utils/getCoordinates");

exports.registerClub = async (req, res) => {
  console.log("we are creating a club");
  try {
    const {
      clubName,
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

    if (!clubName || !address || !email || !password) {
      return res.status(400).json({
        error: "Club name, address, email, and password are required",
      });
    }

    const existingClubAuth = await ClubAuth.findOne({ email });
    if (existingClubAuth) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`;
    const { latitude, longitude } = await getCoordinates(fullAddress);

    const newClub = new Club({
      clubName,
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
    await newClub.save();

    const hashedPassword = await bcrypt.hash(password, 10);
    const newClubAuth = new ClubAuth({
      email,
      password: hashedPassword,
      club: newClub._id,
    });

    await newClubAuth.save();
    res.status(201).json({ message: "Club registered successfully" });
  } catch (err) {
    console.error("Error registering club", err);
    res
      .status(500)
      .json({ error: "Error registering club", details: err.message });
  }
};

exports.loginClub = async (req, res) => {
  try {
    const { email, password } = req.body;
    const clubAuth = await ClubAuth.findOne({ email }).populate("club");
    if (!clubAuth) return res.status(404).json({ error: "Club not found" });

    const isMatch = await bcrypt.compare(password, clubAuth.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

    const token = { id: "foo" };

    res.status(200).json({ token });
  } catch (err) {
    console.error("Error logging in", err);
    res.status(500).json({ error: "Error logging in", details: err.message });
  }
};
