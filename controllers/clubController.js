const PendingClub = require("../models/PendingClub");
const Club = require("../models/Club");
const ClubAuth = require("../models/ClubAuth");
const flattenUpdates = require("../utils/flattenUpdates");

// Read Club or PendingClub (no need to know if it's pending or not)
exports.readClub = async (req, res) => {
  try {
    let club;

    // Check if the authenticated club has a Club reference or a PendingClub reference
    if (req.clubAuth.club) {
      club = await Club.findById(req.clubAuth.club);
    } else if (req.clubAuth.pendingClub) {
      club = await PendingClub.findById(req.clubAuth.pendingClub);
    }

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

// Public read function to get a Club or PendingClub by ID
exports.readClubById = async (req, res) => {
  try {
    const { id } = req.params;
    let club = await Club.findById(id);

    if (!club) {
      // If no Club is found, check if it's a PendingClub
      club = await PendingClub.findById(id);
    }

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

// Create a PendingClub (no direct Club creation needed)
exports.createPendingClub = async (req, res) => {
  try {
    const pendingClub = new PendingClub(req.body);
    await pendingClub.save();

    // Link the PendingClub to the authenticated ClubAuth
    req.clubAuth.pendingClub = pendingClub._id;
    await req.clubAuth.save();

    res
      .status(201)
      .json({ message: "Pending club created successfully", pendingClub });
  } catch (err) {
    console.error("Error creating pending club", err);
    res
      .status(500)
      .json({ error: "Error creating pending club", details: err.message });
  }
};

// Update a PendingClub or Club based on the current status
exports.updateClub = async (req, res) => {
  try {
    const updates = flattenUpdates(req.body);
    let club;

    // Update the current Club or PendingClub associated with the authenticated ClubAuth
    if (req.clubAuth.club) {
      club = await Club.findByIdAndUpdate(
        req.clubAuth.club,
        { $set: updates },
        {
          new: true,
          runValidators: true,
          context: "query",
        }
      );
    } else if (req.clubAuth.pendingClub) {
      club = await PendingClub.findByIdAndUpdate(
        req.clubAuth.pendingClub,
        { $set: updates },
        {
          new: true,
          runValidators: true,
          context: "query",
        }
      );
    }

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    res.status(200).json({ message: "Club updated successfully", club });
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
    const pendingClub = await PendingClub.findById(req.clubAuth.pendingClub);
    if (!pendingClub) {
      return res.status(404).json({ error: "Pending Club not found" });
    }

    // Create a new Club from the PendingClub's data
    const club = new Club({
      ...pendingClub.toObject(),
      _id: undefined, // Let MongoDB create a new _id for the new Club
    });

    await club.save();

    // Update ClubAuth to point to the newly created Club and remove reference to PendingClub
    req.clubAuth.club = club._id;
    req.clubAuth.pendingClub = undefined;
    await req.clubAuth.save();

    // Delete the old PendingClub
    await PendingClub.deleteOne({ _id: pendingClub._id });

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
  try {
    let club;

    if (req.clubAuth.club) {
      club = await Club.findByIdAndDelete(req.clubAuth.club);
      req.clubAuth.club = undefined;
    } else if (req.clubAuth.pendingClub) {
      club = await PendingClub.findByIdAndDelete(req.clubAuth.pendingClub);
      req.clubAuth.pendingClub = undefined;
    }

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    await req.clubAuth.save(); // Save ClubAuth after removing the reference

    res.status(200).json({ message: "Club deleted successfully" });
  } catch (err) {
    console.error("Error deleting club", err);
    res
      .status(500)
      .json({ error: "Error deleting club", details: err.message });
  }
};

// List all PendingClubs (for authorized users only)
exports.listPendingClubs = async (req, res) => {
  try {
    const authorizedEmails = process.env.AUTHORIZED_EMAILS.split(",");
    if (!authorizedEmails.includes(req.user.email)) {
      return res
        .status(403)
        .json({ error: "Access denied: Unauthorized email" });
    }

    const pendingClubs = await PendingClub.find();
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
    const clubs = await Club.find();
    res.status(200).json(clubs);
  } catch (err) {
    console.error("Error listing clubs", err);
    res
      .status(500)
      .json({ error: "Error listing clubs", details: err.message });
  }
};