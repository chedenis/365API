const { Club, ClubAuth } = require("../models");
const { pagination } = require("../utils/common");

const flattenUpdates = require("../utils/flattenUpdates");
const getCoordinates = require("../utils/getCoordinates");

// Import required AWS SDK v3 clients and helpers
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  Type,
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

    if (!req.user?.email) {
      return res
        .status(401)
        .json({ error: "Unauthorized: user email not found" });
    }
    console.log("Here is the user " + req.user);
    console.log("Received request to create club with details:", clubDetails);

    // Check if ClubAuth exists for the provided email
    const clubAuth = await ClubAuth.findOne({ email });
    if (!clubAuth) {
      console.warn(`ClubAuth not found for email: ${email}`);
      return res.status(400).json({ error: "User email not found" });
    }
    console.log("ClubAuth found for email:", email);

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
  try {
    const updates = flattenUpdates(req.body) || {};
    const { _id } = req.body;

    if (
      updates?.memberBenefit?.email === "Email only" &&
      !updates?.memberBenefit?.email
    ) {
      return res
        .status(400)
        .json({ error: "Email is required when email only is selected" });
    }

    if (
      updates.memberBenefit?.phone === "Phone only" &&
      !updates?.memberBenefit?.phone
    ) {
      return res.status(400).json({
        error: "Phone number is required when 'Phone only' is selected",
      });
    }

    if (
      updates?.dropInLink &&
      !/^https?:\/\/[a-zA-Z0-9-_.]+\.[a-z]{2,}\/?.*/.test(updates?.dropInLink)
    ) {
      return res.status(400).json({
        error: "Please provide a valid URL for drop-in hours",
      });
    }

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

    function validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    if (updates?.reservationSystem === "Email only") {
      if (!updates?.reservationEmail) {
        return res.status(400).json({
          error: "Email is required when Reservation system is email",
        });
      }
      if (!validateEmail(updates.reservationEmail)) {
        return res
          .status(400)
          .json({ error: "Please provide a valid email address" });
      }
    }

    if (updates?.reservationSystem === "Phone only") {
      if (!updates?.reservationPhone) {
        return res.status(400).json({
          error: "Phone number is required when Reservation system is phone",
        });
      }
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

const cleanUpInvalidValues = (club) => {
  const validAmenities = [
    "Seating area",
    "Water filling station",
    "Restroom",
    "Lockers",
    "Showers",
    "Ball machine",
    "Tournaments",
    "Clinics",
    "Lessons",
    "Open play",
    "Round robin",
    "Pro shop",
    "Demo paddles",
    "Paddles for purchase",
    "Pickleballs for purchase",
    "Clothing for purchase",
    "Fitness classes",
    "Indoor pool",
    "Outdoor pool",
    "Sauna",
    "Hot tub",
    "Tennis courts",
    "Running track",
    "Spa",
    "Gym",
    "Racquetball",
    "Padel",
    "Squash",
    "Climbing wall",
    "Restaurant",
    "Vending machine",
    "Bar",
    "Snack bar",
    "Childcare",
    "Playground equipment",
    "Indoor play area",
    "On-site parking",
    "Off-site parking",
    "Covered parking",
    "Street parking",
  ];

  club.amenities = club.amenities.filter((amenity) =>
    validAmenities.includes(amenity)
  );

  const validCourtTypes = ["Outdoor", "Outdoor covered", "Indoor"];
  club.courtTypes = club.courtTypes.filter((type) =>
    validCourtTypes.includes(type)
  );

  const validOtherActivities = [
    "Fitness classes",
    "Outdoor Pool",
    "Sauna",
    "Tennis courts",
    "Indoor Pool",
    "Running track",
    "Basketball",
    "Spa",
    "Gym",
    "Racquetball",
    "Climbing wall",
    "Squash",
  ];

  club.otherActivities = club.otherActivities.filter((activity) =>
    validOtherActivities.includes(activity)
  );

  const validFoodBeverage = [
    "Restaurant",
    "Bar",
    "Vending machines",
    "Snack bar",
    "None",
  ];

  club.foodBeverage = club.foodBeverage.filter((food) =>
    validFoodBeverage.includes(food)
  );

  const validParkingType = [
    "No designated parking",
    "On-site",
    "Off-site",
    "Covered",
    "Street parking",
  ];

  club.parkingType = club.parkingType.filter((type) =>
    validParkingType.includes(type)
  );
};

// Promote PendingClub to Club
exports.promoteToClub = async (req, res) => {
  try {
    const { id } = req.params; // Get the club ID from the URL parameters
    const club = await Club.findById(id); // Find the club by its ID
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    cleanUpInvalidValues(club);
    const fullAddress = `${club?.address?.street}, ${club?.address?.city}, ${club?.address?.state} ${club?.address?.zip}, ${club?.address?.country}`;
    const { latitude, longitude } = await getCoordinates(fullAddress);

    // if (club?.mailingAddress?.street !== club?.mailingAddress?.street) {
    // }
    console.log("latitude, longitude", latitude, longitude);
    // Update the location field with GeoJSON coordinates (longitude, latitude)
    console.log("club", club?.address);
    if (club?.address) {
      club.address.location = {
        type: "Point",
        coordinates: [longitude, latitude], // [longitude, latitude] as per GeoJSON format
      };
    }

    club.location = {
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
  try {
    const { id } = req.params;
    const club = await Club.findById(id);
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }
    const clubAuth = await ClubAuth.findOne({ clubs: id });
    if (clubAuth) {
      clubAuth.clubs = clubAuth.clubs.filter(
        (clubId) => clubId.toString() !== id
      );
      await clubAuth.save();
    }

    await Club.findByIdAndDelete(id);
    res.status(200).json({ message: "Club deleted successfully" });
  } catch (error) {
    console.error("Error deleting club", error);
    res
      .status(500)
      .json({ error: "Error deleting club", details: error.message });
  }
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

// // List all PendingClubs (for authorized users only)
// exports.clubListTableView = async (req, res) => {
//   try {
//     const {
//       city,
//       state,
//       clubName,
//       status,
//       pageNo,
//       limit,
//       referralCode,
//       sortBy,
//       sortOrder,
//     } = req.query;
//     let filter = { status: status };

//     if (!["Ready", "Complete", "Re Approve"].includes(status)) {
//       return res.status(400).json({
//         status: false,
//         message: `Status not found`,
//         data: [],
//         pagination: {},
//       });
//     }

//     if (city) {
//       filter["address.city"] = { $regex: city, $options: "i" }; // Case-insensitive partial match
//     }
//     if (state) {
//       filter["address.state"] = { $regex: state, $options: "i" };
//     }
//     if (clubName) {
//       filter["clubName"] = { $regex: clubName, $options: "i" };
//     }

//     let clubAuthFilter = {};
//     if (referralCode) {
//       clubAuthFilter["referralCode"] = { $regex: referralCode, $options: "i" };
//     }

//     const clubAuths = await ClubAuth.find(clubAuthFilter);
//     const clubList = [
//       ...new Set(
//         clubAuths?.flatMap((user) => user.clubs.map((club) => club.toString()))
//       ),
//     ];

//     if (clubList.length > 0) {
//       filter["_id"] = { $in: clubList };
//     }

//     // Sorting logic
//     let sortOptions = {};
//     if (["clubName", "createdAt"].includes(sortBy)) {
//       sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
//     }

//     const data = await pagination(Club, filter, pageNo, limit, sortOptions);

//     const clubIds = data?.data?.map((club) => club._id.toString());

//     const usersWithClubs = await ClubAuth.find({ clubs: { $in: clubIds } });

//     const clubReferralMap = {};
//     usersWithClubs?.forEach((user) => {
//       user?.clubs?.forEach((clubId) => {
//         clubReferralMap[clubId.toString()] = user?.referralCode;
//       });
//     });

//     data.data = data?.data?.map((club) => ({
//       ...club,
//       referralCode: clubReferralMap[club._id.toString()] || "",
//     }));

//     return res.status(200).json(data);
//   } catch (err) {
//     console.error("Error listing pending clubs", err);
//     return res.status(500).json({
//       status: false,
//       message: "List not fetched",
//       data: [],
//       pagination: {},
//     });
//   }
// };

// List all PendingClubs (for authorized users only)
exports.clubListTableView = async (req, res) => {
  try {
    const {
      city,
      state,
      clubName,
      status,
      pageNo,
      limit,
      referralCode,
      sortBy,
      sortOrder,
    } = req.query;
    const filter = { status: status };

    if (!["Ready", "Complete", "Re Approve"].includes(status)) {
      return res.status(400).json({
        status: false,
        message: `Status not found`,
        data: [],
        pagination: {},
      });
    }

    if (city) {
      filter["address.city"] = { $regex: city, $options: "i" }; // Case-insensitive partial match
    }
    if (state) {
      filter["address.state"] = { $regex: state, $options: "i" };
    }
    if (clubName) {
      filter["clubName"] = { $regex: clubName, $options: "i" };
    }

    const clubAuthFilter = {};
    if (referralCode) {
      clubAuthFilter["referralCode"] = { $regex: referralCode, $options: "i" };
    }

    const clubAuths = await ClubAuth.find(clubAuthFilter);
    const clubList = [
      ...new Set(
        clubAuths?.flatMap((user) => user.clubs.map((club) => club.toString()))
      ),
    ];

    if (clubList.length > 0) {
      filter["_id"] = { $in: clubList };
    }

    if (sortBy === "referralCode") {
      const allClubs = await Club.find(filter);

      const clubIds = allClubs.map((club) => club._id.toString());
      const usersWithClubs = await ClubAuth.find({ clubs: { $in: clubIds } });

      const clubReferralMap = {};
      usersWithClubs.forEach((user) => {
        user.clubs.forEach((clubId) => {
          clubReferralMap[clubId.toString()] = user.referralCode || "";
        });
      });

      const clubsWithReferrals = allClubs.map((club) => {
        const clubObj = club.toObject();
        return {
          ...clubObj,
          referralCode: clubReferralMap[club._id.toString()] || "",
        };
      });

      clubsWithReferrals.sort((a, b) => {
        if (sortOrder === "desc") {
          return b.referralCode.localeCompare(a.referralCode);
        }
        return a.referralCode.localeCompare(b.referralCode);
      });

      const page = Number.parseInt(pageNo) || 1;
      const limitNum = Number.parseInt(limit) || 10;
      const startIndex = (page - 1) * limitNum;
      const endIndex = page * limitNum;

      const paginatedData = clubsWithReferrals.slice(startIndex, endIndex);

      return res.status(200).json({
        status: true,
        message: "List fetched successfully",
        data: paginatedData,
        pagination: {
          totalRecords: clubsWithReferrals.length,
          totalPages: Math.ceil(clubsWithReferrals.length / limitNum),
          currentPage: page,
          currentLimit: limitNum,
          isNextPage: endIndex < clubsWithReferrals.length ? page + 1 : null,
        },
      });
    } else {
      // Regular sorting for fields in the Club model
      const sortOptions = {};
      if (["clubName", "createdAt"].includes(sortBy)) {
        sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
      } else {
        // Default sort by createdAt if sortBy is not specified or invalid
        sortOptions["createdAt"] = -1;
      }

      const data = await pagination(Club, filter, pageNo, limit, sortOptions);

      const clubIds = data?.data?.map((club) => club._id.toString());
      const usersWithClubs = await ClubAuth.find({ clubs: { $in: clubIds } });

      const clubReferralMap = {};
      usersWithClubs?.forEach((user) => {
        user?.clubs?.forEach((clubId) => {
          clubReferralMap[clubId.toString()] = user?.referralCode;
        });
      });

      data.data = data?.data?.map((club) => ({
        ...club,
        referralCode: clubReferralMap[club._id.toString()] || "",
      }));

      return res.status(200).json(data);
    }
  } catch (err) {
    console.error("Error listing pending clubs", err);
    return res.status(500).json({
      status: false,
      message: "List not fetched",
      data: [],
      pagination: {},
    });
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
    let {
      courtTypes,
      surfaceType,
      netType,
      searchParams,
      latitude,
      longitude,
      radius,
    } = req.body;

    const filters = { status: "Complete" };

    let passLatLong = true;

    if (!radius) {
      radius = 10;
    }

    if (courtTypes?.length > 0) {
      filters.courtTypes = { $in: courtTypes };
      passLatLong = false;
    }
    if (surfaceType?.length > 0) {
      filters.surfaceType = { $in: surfaceType };
      passLatLong = false;
    }
    if (netType?.length > 0) {
      filters.netType = { $in: netType };
      passLatLong = false;
    }

    if (searchParams) {
      filters.clubName = { $regex: searchParams, $options: "i" };
      passLatLong = false;
    }

    if (passLatLong && (latitude || longitude)) {
      // if (!latitude || !longitude) {
      //   return res
      //     .status(400)
      //     .json({ message: "Latitude or Longitude are required", data: [] });
      // }

      // Parse the values as floats to ensure they're numbers
      const radiusInMeters = radius * 1000; // 10km

      filters.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: radiusInMeters,
        },
      };
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

exports.cancelMembership = async (req, res) => {
  try {
    const { _id, membership } = req.body;
    if (membership && membership === "Cancelled") {
      const club = await Club.findById(_id);
      if (!club) {
        return res.status(404).json({ error: "Club not found" });
      }

      club.membership === "Cancelled";
      await club.save();

      return res.status(200).json({
        message: "Membership has been successfully cancelled",
        club,
      });
      return res.status(400).json({ error: "Invalid membership status" });
    }
  } catch (error) {
    console.error("Error cancelling membership", error);
    res
      .status(500)
      .json({ error: "Error cancelling membership", details: error.message });
  }
};
