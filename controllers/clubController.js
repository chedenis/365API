const Club = require("../models/Club");
const ClubAuth = require("../models/ClubAuth");
const flattenUpdates = require("../utils/flattenUpdates");
const getCoordinates = require("../utils/getCoordinates");

// Helper to read clubs from ClubAuth by ID
const readClubsFromClubAuth = async (id) => {
  const clubAuth = await ClubAuth.findById(id)
    .populate({
      path: "clubs",
      select: "clubName address amenities", // Only return necessary fields
    })
    .select("clubs") // Select only the clubs array, nothing else from ClubAuth
    .lean()
    .exec();

  return clubAuth ? clubAuth.clubs : null;
};

// Read all clubs associated with a ClubAuth
exports.readClubs = async (req, res) => {
  try {
    const clubs = await readClubsFromClubAuth(req.user.id);
    if (!clubs) {
      return res.status(404).json({ message: "ClubAuth not found" });
    }
    return res.json(clubs);
  } catch (error) {
    console.error("Error reading clubs", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Public read function to get a Club or PendingClub by ID
exports.readClubsById = async (req, res) => {
  try {
    const { id } = req.params;
    const club = await Club.findById(id).lean();

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    res.status(200).json(club);
  } catch (err) {
    console.error("Error fetching club", err);
    res
      .status(500)
      .json({ error: "Error fetching club", details: err.message });
  }
};

// Create a Club and link it to ClubAuth
exports.createClub = async (req, res) => {
  try {
    const clubDetails = req.body;
    const email = req.body.email;

    const clubAuth = await ClubAuth.findOne({ email });
    if (!clubAuth) {
      return res.status(400).json({ error: "User email not found" });
    }

    const existingClub = await Club.findOne({ clubName: clubDetails.clubName });
    if (existingClub) {
      return res.status(400).json({ error: "Club name already exists" });
    }

    const newClub = new Club(clubDetails);
    await newClub.save();

    // Link the Club to ClubAuth
    clubAuth.clubs.push(newClub._id);
    await clubAuth.save();

    res.status(201).json({ message: "Club created successfully", newClub });
  } catch (err) {
    console.error("Error creating club", err);
    res
      .status(500)
      .json({ error: "Error creating club", details: err.message });
  }
};

// Update a Club
exports.updateClub = async (req, res) => {
  try {
    const updates = flattenUpdates(req.body);
    const { email } = req.body;

    const existingClub = await Club.findOne({ email });

    if (!existingClub) {
      return res
        .status(404)
        .json({ error: "No Club found for the given email" });
    }

    const updatedClub = await Club.findByIdAndUpdate(
      existingClub._id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    );

    res
      .status(200)
      .json({ message: "Club updated successfully", club: updatedClub });
  } catch (err) {
    console.error("Error updating club", err);
    res
      .status(500)
      .json({ error: "Error updating club", details: err.message });
  }
};

// Promote PendingClub to Club
exports.promoteToClub = async (req, res) => {
  try {
    const club = await Club.findById(req.body._id);
    if (!club) {
      return res.status(404).json({ error: "Pending Club not found" });
    }

    const fullAddress = `${club.address.street}, ${club.address.city}, ${club.address.state} ${club.address.zip}, ${club.address.country}`;
    const { latitude, longitude } = await getCoordinates(fullAddress);

    club.address.longitude = longitude;
    club.address.latitude = latitude;
    club.status = "Complete";
    await club.save();

    res
      .status(200)
      .json({ message: "Pending Club promoted to Club successfully", club });
  } catch (err) {
    console.error("Error promoting pending club to club", err);
    res.status(500).json({
      error: "Error promoting pending club to club",
      details: err.message,
    });
  }
};

// Delete PendingClub or Club (depending on the status)
exports.deleteClub = async (req, res) => {
  // TODO: Implement delete logic for club and update clubAuth
  res.status(501).json({ error: "Delete functionality not implemented" });
};

// List all PendingClubs (for authorized users only)
exports.listPendingClubs = async (req, res) => {
  try {
    // Assuming email authorization is implemented
    const pendingClubs = await Club.find({ status: "Ready" }).lean();
    res.status(200).json(pendingClubs);
  } catch (err) {
    console.error("Error listing pending clubs", err);
    res
      .status(500)
      .json({ error: "Error listing pending clubs", details: err.message });
  }
};

// List all Clubs (public)
exports.listClubs = async (req, res) => {
  try {
    const clubs = await Club.find({ status: "Complete" }).lean();
    res.status(200).json(clubs);
  } catch (err) {
    console.error("Error listing clubs", err);
    res
      .status(500)
      .json({ error: "Error listing clubs", details: err.message });
  }
};

// List all clubs with status "Not Ready"
exports.listNotReadyClubs = async (req, res) => {
  try {
    const notReadyClubs = await Club.find({ status: "Not Ready" }).lean();
    res.status(200).json(notReadyClubs);
  } catch (err) {
    console.error("Error listing 'Not Ready' clubs", err);
    res
      .status(500)
      .json({ error: "Error listing 'Not Ready' clubs", details: err.message });
  }
};
