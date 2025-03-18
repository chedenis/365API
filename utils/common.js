const { MemberShip } = require("../models");

const pageNo = 1;
const offSet = 10;

exports.defaultPageNo = pageNo;
exports.defaultLimit = offSet;

exports.defaultServerErrorMessage = "!!! Oops somethings went wrong !!!";

exports.pagination = async (
  model,
  filter = {},
  page = pageNo,
  limit = offSet,
  sort = {
    createdAt: -1,
  },
  projection = {} // Optionally specify fields to fetch
) => {
  try {
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // Fetch total records and paginated data concurrently
    const [totalRecords, results] = await Promise.all([
      model.countDocuments(filter),
      model
        .find(filter, projection) // Fetch only required fields
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .collation({
          locale: "en",
          strength: 2, // This enables case-insensitive comparison
        })
        .lean(), // Convert to plain JS objects for better performance
    ]);

    return {
      status: true,
      message: "List fetched successfully",
      data: results,
      pagination: {
        totalRecords, // Total number of matching documents
        totalPages: Math.ceil(totalRecords / limit), // Total pages count
        currentPage: page,
        currentLimit: limit,
        isNextPage: page * limit < totalRecords, // True if more pages exist
      },
    };
  } catch (error) {
    return {
      status: false,
      message: "List not fetched",
      data: [],
      pagination: {},
    };
  }
};

exports.checkMemberShipStatus = async (userId) => {
  try {
    const membership = await MemberShip.findOne({ user: userId }).sort({
      createdAt: -1,
    });

    if (!membership) {
      return {
        status: false,
        membershipData: {},
      };
    }

    // Check if membership is expired
    const now = new Date();
    const endDate = new Date(membership.end_date);

    const isActive = membership.status === "active" && now <= endDate;

    return {
      status: true,
      membershipData: {
        hasMembership: isActive,
        membership: {
          status: membership.status,
          startDate: membership.start_date,
          endDate: membership.end_date,
          autoRenew: membership.auto_renew,
          daysRemaining: Math.max(
            0,
            Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
          ),
        },
      },
    };
  } catch (error) {
    console.error("Error checking membership status:", error);
    return {
      status: false,
      membershipData: {},
    };
  }
};
