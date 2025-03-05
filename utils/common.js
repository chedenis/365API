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
  sort = {},
  projection = {} // Optionally specify fields to fetch
) => {
  try {
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
