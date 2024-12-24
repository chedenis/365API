const { Club, ClubAuth } = require("../models");

const flattenUpdates = require("../utils/flattenUpdates");
const getCoordinates = require("../utils/getCoordinates");

// Import required AWS SDK v3 clients and helpers
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Configure AWS S3 client using v3 SDK
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const bucketName = process.env.S3_BUCKET_NAME;

// Generate a Pre-Signed URL for AWS S3 using v3 SDK
exports.generatePresignedUrl = async (req, res) => {
  const { fileName, fileType } = req.body; // Expecting fileName and fileType in the request

  const params = {
    Bucket: bucketName, // S3 bucket name from environment
    Key: fileName, // The name of the file to be uploaded
    ContentType: fileType, // File type (e.g., image/jpeg, image/png, etc.)
  };

  try {
    // Create the command for putting the object
    const command = new PutObjectCommand(params);

    // Generate the pre-signed URL with a 60-second expiration
    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    // Send the pre-signed URL in the response
    res.json({ url });
  } catch (err) {
    console.error("Error generating pre-signed URL", err);
    res.status(500).json({ error: "Error generating pre-signed URL" });
  }
};

exports.generateGetPresignedUrl = async (req, res) => {
  const { fileUrl } = req.query;

  const fileKey = fileUrl.replace(
    `https://${bucketName}.s3.us-west-1.amazonaws.com/`,
    ""
  );
  const params = {
    Bucket: bucketName,
    Key: fileKey,
  };

  try {
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });
    res.json({ url });
  } catch (err) {
    console.error("Error generating pre-signed GET URL", err);
    res.status(500).json({ error: "Error generating pre-signed GET URL" });
  }
};

// Helper to read clubs from ClubAuth by ID
const readClubsFromClubAuth = async (email) => {
  const clubModelName =
    process.env.NODE_ENV === "production"
      ? "ClubPROD"
      : process.env.NODE_ENV === "qa"
      ? "ClubQA"
      : "Club";

  const clubAuth = await ClubAuth.findOne({ email: email })
    .populate({
      path: "clubs",
      model: clubModelName, // Use dynamically determined model name here
    })
    .select("clubs") // Select only the clubs array, nothing else from ClubAuth
    .lean()
    .exec();

  if (clubAuth) {
    console.log(`clubauth is ${JSON.stringify(clubAuth)}`);
    return clubAuth.clubs || [];
  }

  return null;
};

// Read all clubs associated with a ClubAuth
exports.readClubs = async (req, res) => {
  try {
    console.log(`Checking user: ${req.user}`);
    if (!req.user) {
      console.warn("No user information found in the request"); // Log if req.user is missing
      return res.status(401).json({ message: "Unauthorized" });
    }
    console.log(`Reading clubs for user ID: ${req.user.id}`); // Log user ID before function call

    const clubs = await readClubsFromClubAuth(req.user.email);

    if (!clubs) {
      console.warn(`No clubs found for user ID: ${req.user.email}`); // Log if no clubs are found
      return res.status(404).json({ message: "ClubAuth not found" });
    }

    console.log(`Successfully retrieved clubs for user ID: ${req.user.id}`); // Log success
    return res.json(clubs);
  } catch (error) {
    console.error(`Error reading clubs for user ID: ${req.user.id}`, error); // Detailed error log with user ID
    return res.status(500).json({ message: "Server error" });
  }
};

// Public read function to get a Club or PendingClub by ID
exports.readClubById = async (req, res) => {
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
    const email = req.user.email;

    console.log("Here is the user " + req.user);
    console.log("Received request to create club with details:", clubDetails);

    // Check if ClubAuth exists for the provided email
    const clubAuth = await ClubAuth.findOne({ email });
    if (!clubAuth) {
      console.warn(`ClubAuth not found for email: ${email}`);
      return res.status(400).json({ error: "User email not found" });
    }
    console.log("ClubAuth found for email:", email);

    // Check if the club with the given name already exists
    const existingClub = await Club.findOne({ clubName: clubDetails.clubName });
    if (existingClub) {
      console.warn(`Club with name ${clubDetails.clubName} already exists.`);
      return res.status(400).json({ error: "Club name already exists" });
    }
    console.log("No existing club found with name:", clubDetails.clubName);

    // Create and save the new club
    const newClub = new Club(clubDetails);
    await newClub.save();
    console.log("New club created successfully:", newClub);

    // Link the Club to ClubAuth
    clubAuth.clubs.push(newClub._id);
    await clubAuth.save();
    console.log("Club linked to ClubAuth:", newClub._id);

    res.status(201).json({ message: "Club created successfully", newClub });
  } catch (err) {
    console.error("Error creating club:", err);
    res
      .status(500)
      .json({ error: "Error creating club", details: err.message });
  }
};

// Update a Club
exports.updateClub = async (req, res) => {
  console.log("updateClub");
  try {
    const updates = flattenUpdates(req.body);
    const { _id } = req.body;
    console.log(updates, "updatesupdates");
    if (
      updates?.memberPerk === "Treat like member" &&
      !updates?.membershipFee
    ) {
      return res.status(400).json({
        error:
          "Membership fee is required when member benefits is Treat like member",
      });
    }
    if (
      updates?.reservations === true &&
      (!updates?.reservationLink || updates?.reservationLink?.trim() === "")
    ) {
      return res.status(400).json({
        error: "ReservationLink is required when reservations is true",
      });
    }
    if (
      updates?.reservations === true &&
      (!updates?.reservationSystem ||
        updates?.reservationSystem?.trim() === "" ||
        updates?.reservationSystem?.trim() === "None")
    ) {
      return res.status(400).json({
        error: "Reservation system is required when reservations is true",
      });
    }

    const existingClub = await Club.findOne({ _id });

    if (!existingClub) {
      return res.status(404).json({ error: "No Club found for the given _id" });
    }

    // Separate `$set` and `$unset` fields based on "delete" marker
    const setUpdates = {};
    const unsetUpdates = {};

    for (const key in updates) {
      if (updates[key] === "delete") {
        unsetUpdates[key] = ""; // Use `$unset` for "delete" marked fields
      } else {
        setUpdates[key] = updates[key];
      }
    }

    const updateData = {
      ...(Object.keys(setUpdates).length > 0 ? { $set: setUpdates } : {}),
      ...(Object.keys(unsetUpdates).length > 0 ? { $unset: unsetUpdates } : {}),
    };

    const updatedClub = await Club.findByIdAndUpdate(
      existingClub._id,
      updateData,
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
    const { id } = req.params; // Get the club ID from the URL parameters
    const club = await Club.findById(id); // Find the club by its ID
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    const fullAddress = `${club.address.street}, ${club.address.city}, ${club.address.state} ${club.address.zip}, ${club.address.country}`;
    const { latitude, longitude } = await getCoordinates(fullAddress);

    if (club.mailingAddress.street !== club.mailingAddress.street) {
    }

    // Update the location field with GeoJSON coordinates (longitude, latitude)
    club.address.location = {
      type: "Point",
      coordinates: [longitude, latitude], // [longitude, latitude] as per GeoJSON format
    };

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

exports.filteredList = async (req, res) => {
  try {
    const { courtTypes, surfaceType, netType } = req.body;

    const filters = { status: "Complete" };

    if (courtTypes && courtTypes.length) {
      filters.courtTypes = { $in: courtTypes };
    }
    if (surfaceType && surfaceType.length) {
      filters.surfaceType = { $in: surfaceType };
    }
    if (netType && netType.length) {
      filters.netType = { $in: netType };
    }

    const clubs = await Club.find(filters).lean();
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
