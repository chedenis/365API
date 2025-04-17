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
    const user = req.user;
    let club;
    if (user?.userType == "admin") {
      club = await Club.findById(id).lean();
    } else {
      club = await Club.findOne({
        parentClubId: id,
      }).lean();
      if (!club) {
        club = await Club.findById(id).lean();
      }
    }

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    const clubAuth = await ClubAuth.findOne({ clubs: id })
      .select("referralCode")
      .lean();

    return res
      .status(200)
      .json({ ...club, referralCode: clubAuth?.referralCode || "" });
  } catch (err) {
    console.error("Error fetching club", err);
    res
      .status(500)
      .json({ error: "Error fetching club", details: err.message });
  }
};

// Public read function to get a Club or PendingClub by ID
exports.getClubById = async (req, res) => {
  try {
    const { id } = req.params;
    let club = await Club.findOne({ _id: id, status: "Complete" }).lean();

    if (!club) {
      return res.status(404).json({
        message: "Club not found",
        club: {},
        referralCode: "",
      });
    }

    const clubAuth = await ClubAuth.findOne({ clubs: id })
      .select("referralCode")
      .lean();

    return res
      .status(200)
      .json({ club: club, referralCode: clubAuth?.referralCode || "" });
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
    let clubDetails = req.body;
    const email = req.user.email;
    const referralCode = req?.user?.referralCode;

    if (referralCode) {
      clubDetails.referralCode = referralCode;
    }

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

    const updateObj = {
      ...updateData["$set"],
      id: undefined,
    };

    function checkImageExist(imageType) {
      // Check if the image property exists in updateObj
      const imageExists = updateObj && updateObj[imageType] !== undefined;

      // Also check if it's included in updatedFields array
      const imageFieldList = updateObj?.updatedFields || [];
      const isInUpdatedFields = imageFieldList.includes(imageType);

      // Return true if either condition is met
      return imageExists || isInUpdatedFields;
    }

    let oldDataUpdateObj = updateData["$set"];
    const profileImage = updateObj?.profileImage;
    const featuredImage = updateObj?.featuredImage;

    if (checkImageExist("profileImage")) {
      delete oldDataUpdateObj.profileImage;
    }
    if (checkImageExist("featuredImage")) {
      delete oldDataUpdateObj.featuredImage;
    }

    console.log("oldDataUpdateObj", oldDataUpdateObj);
    const { parentClubId, ...rest } = oldDataUpdateObj;

    await Club.findByIdAndUpdate(existingClub._id, {
      ...rest,
      status:
        existingClub?.status == "Complete"
          ? "Complete"
          : existingClub?.status == "Reject"
          ? "Reject"
          : existingClub?.status,
    });

    delete updateObj?._id;
    let returnRecord;
    console.log("updateData", updateData);

    const findChildRecord = await Club.findOne({
      parentClubId: existingClub._id,
    });
    console.log("updateData", updateData);
    if (findChildRecord) {
      console.log("profileImage :>> ", profileImage);
      console.log("featuredImage :>> ", profileImage);

      // Create a new update object for the child record
      const childUpdateData = { ...updateData["$set"] };
      delete childUpdateData["_id"];

      // Properly handle image fields for child record
      returnRecord = await Club.findByIdAndUpdate(findChildRecord?._id, {
        $set: childUpdateData,
        ...(profileImage && { profileImage }),
        ...(featuredImage && { featuredImage }),
      });
    } else {
      returnRecord = await Club.create({
        ...updateObj,
        parentClubId: existingClub._id,
      });
    }

    res
      .status(200)
      .json({ message: "Club updated successfully", club: req?.body });
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

// // Promote PendingClub to Club
// exports.promoteToClub = async (req, res) => {
//   try {
//     const { id } = req.params; // Get the club ID from the URL parameters
//     let club = await Club.findOne({ _id: id }); // Find the club by its ID
//     const findChildClub = await Club.findOne({ parentClubId: id });
//     delete findChildClub.id;

//     if (findChildClub) {
//       // console.log("findChildClub", findChildClub);
//       club = { ...club._doc, ...findChildClub };
//     }
//     console.log("club", club);
//     if (!club) {
//       return res.status(404).json({ error: "Club not found" });
//     }

//     cleanUpInvalidValues(club);
//     const fullAddress = `${club?.address?.street}, ${club?.address?.city}, ${club?.address?.state} ${club?.address?.zip}, ${club?.address?.country}`;
//     const { latitude, longitude } = await getCoordinates(fullAddress);

//     // if (club?.mailingAddress?.street !== club?.mailingAddress?.street) {
//     // }
//     console.log("latitude, longitude", latitude, longitude);
//     // Update the location field with GeoJSON coordinates (longitude, latitude)
//     console.log("club", club?.address);
//     if (club?.address) {
//       club.address.location = {
//         type: "Point",
//         coordinates: [longitude, latitude], // [longitude, latitude] as per GeoJSON format
//       };
//     }

//     club.location = {
//       type: "Point",
//       coordinates: [longitude, latitude], // [longitude, latitude] as per GeoJSON format
//     };

//     club.status = "Complete";
//     club.isUpdate = true;

//     await Club.findByIdAndUpdate(club?.id, club?._doc);

//     await Club.deleteMany({ parentClubId: id });
//     res
//       .status(200)
//       .json({ message: "Pending Club promoted to Club successfully", club });
//   } catch (err) {
//     console.error("Error promoting pending club to club", err);
//     res.status(500).json({
//       error: "Error promoting pending club to club",
//       details: err.message,
//     });
//   }
// };
exports.promoteToClub = async (req, res) => {
  try {
    const { id } = req.params; // Get the club ID from the URL parameters
    let club = await Club.findOne({ _id: id }); // Find the club by its ID

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    const findChildClub = await Club.findOne({ parentClubId: id });
    delete findChildClub?._doc?._id;
    delete findChildClub?._doc?.parentClubId;
    if (findChildClub) {
      // Merge fields from findChildClub._doc into club
      club = { ...club._doc, ...findChildClub._doc };
    }

    console.log("club after merging:", club);

    cleanUpInvalidValues(club);
    const fullAddress = `${club?.address?.street}, ${club?.address?.city}, ${club?.address?.state} ${club?.address?.zip}, ${club?.address?.country}`;
    const { latitude, longitude } = await getCoordinates(fullAddress);

    console.log("latitude, longitude", latitude, longitude);

    if (club?.address) {
      club.address.location = {
        type: "Point",
        coordinates: [longitude, latitude], // GeoJSON format
      };
    }

    club.location = {
      type: "Point",
      coordinates: [longitude, latitude], // GeoJSON format
    };

    club.status = "Complete";
    club.isUpdate = true;

    // Find the document by ID and update it
    await Club.findByIdAndUpdate(id, club);

    await Club.deleteMany({ parentClubId: id });

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

    if (
      ![
        "Not Ready",
        "Ready",
        "Complete",
        "Re Approve Request",
        "Re Approve",
        "Reject",
      ].includes(status)
    ) {
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
    if (referralCode) {
      filter["referralCode"] = { $regex: `^${referralCode}`, $options: "i" };
    }

    if (status === "Complete" || status === "Reject") {
      // 1. Find all parent records with Complete status
      const completeParents = await Club.find({
        ...filter,
        status: status,
      });

      // 2. Collect parent IDs to include in results
      const parentIdsToInclude = [];

      // 3. For each Complete parent, check if it has children
      for (const parent of completeParents) {
        // Check if this parent has any child records
        const hasChildren = await Club.exists({
          parentClubId: parent._id,
        });

        if (!hasChildren) {
          // Case 1: Parent is Complete and has no children
          parentIdsToInclude.push(parent._id);
        } else {
          // Check if any child has "Re Approve Request" status
          const hasReApproveRequestChild = await Club.exists({
            parentClubId: parent._id,
            status: "Re Approve Request",
          });

          if (hasReApproveRequestChild) {
            // Case 2: Parent is Complete and has a Re Approve Request child
            parentIdsToInclude.push(parent._id);
          }
        }
      }

      // 4. Set the filter to only include these parent IDs
      filter._id = { $in: parentIdsToInclude };

      // 5. Remove any status filter since we've explicitly selected the records
      delete filter.status;
    } else if (status == "Re Approve") {
      filter["status"] = { $in: ["Ready", "Re Approve"] };
      filter["$or"] = [
        { parentClubId: { $exists: true, $ne: null } },
        { _id: { $exists: true, $ne: null } },
      ];
    }

    let distinctClubNames = await Club.distinct("clubName", filter);

    // Modify the filter to only include the first occurrence of each club name
    // with priority given to records with parentClubId
    const clubsWithDistinctNames = [];

    for (const name of distinctClubNames) {
      // First try to find a club with this name that has a parentClubId
      let club = await Club.findOne({
        ...filter,
        clubName: name,
        parentClubId: { $exists: true, $ne: null },
      }).sort({ createdAt: 1 });

      // If no club with parentClubId found, get any club with this name
      if (!club) {
        club = await Club.findOne({
          ...filter,
          clubName: name,
        }).sort({ createdAt: 1 });
      }

      if (club) {
        clubsWithDistinctNames.push(club._id);
      }
    }

    // Update the filter to only include these specific clubs
    filter._id = { $in: clubsWithDistinctNames };

    if (["Not Ready", "Ready", "Re Approve", "Reject"].includes(status)) {
      // Add the existing condition for parent/child relationships
      if (!filter.$or) {
        filter.$or = [];
      }

      filter.$or.push(
        { parentClubId: { $exists: true, $ne: null } },
        { _id: { $exists: true, $ne: null } }
      );
    }

    const clubAuthFilter = {};
    if (referralCode) {
      clubAuthFilter["referralCode"] = { $regex: referralCode, $options: "i" };
    }

    // Regular sorting for fields in the Club model
    const sortOptions = {};
    if (["clubName", "createdAt", "referralCode"].includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    const data = await pagination(Club, filter, pageNo, limit, sortOptions);

    return res.status(200).json(data);
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

    //temporary disable
    let passLatLong = false;

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

    if (searchParams && Array.isArray(searchParams)) {
      const searchParts = searchParams?.flatMap((part) =>
        part
          ?.split(" ")
          ?.map((p) => p?.trim())
          ?.filter(Boolean)
      );

      filters.$and = searchParts?.map((word) => ({
        $or: [
          { clubName: { $regex: word, $options: "i" } },
          { "address.street": { $regex: word, $options: "i" } },
          { "address.city": { $regex: word, $options: "i" } },
          { "address.state": { $regex: word, $options: "i" } },
          { "address.zip": { $regex: word, $options: "i" } },
          { "address.country": { $regex: word, $options: "i" } },
        ],
      }));
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
