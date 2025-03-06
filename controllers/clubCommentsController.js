const { ClubComments, Club } = require("../models");
const { pagination } = require("../utils/common");

exports.createComments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { userType, club, message, clubStatus } = req.body;

    if (!["clubOwner", "admin"].includes(userType)) {
      return res
        .status(400)
        .json({ status: false, message: "User type not found", data: {} });
    }

    if (!club) {
      return res
        .status(400)
        .json({ status: false, message: "Club not found", data: {} });
    }

    // only admin can reject
    if (clubStatus == "Reject" && userType != "admin") {
      return res
        .status(400)
        .json({ status: false, message: "Only admin can reject", data: {} });
    }

    // if admin reject then message is required
    if (clubStatus == "Reject" && !message && userType == "admin") {
      return res
        .status(400)
        .json({ status: false, message: "Message is require", data: {} });
    }

    const findClub = await Club.findById(club);

    if (!findClub) {
      return res
        .status(404)
        .json({ status: false, message: "Club  not found", data: {} });
    }

    if (["Reject"].includes(clubStatus)) {
      await Club.findByIdAndUpdate(club, { status: clubStatus });
    }

    let createComments = "";
    if (message) {
      createComments = await ClubComments.create({
        clubUser: userId,
        userType,
        club,
        message,
      });
    }

    return res.status(200).json({
      status: true,
      error: "Comments added successfully",
      data: createComments || {},
    });
  } catch (error) {
    console.error("Error checking membership status:", error);
    return res.status(500).json({
      status: false,
      error: "!!! Oops Somethings went wrong",
      data: {},
    });
  }
};

exports.listComments = async (req, res) => {
  try {
    const { clubId, pageNo, limit } = req.query;
    if (!clubId) {
      return res
        .status(400)
        .json({ status: false, message: "Club id is required" });
    }
    const data = await pagination(
      ClubComments,
      { club: clubId },
      pageNo,
      limit,
      {
        createdAt: -1,
      }
    );
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error checking membership status:", error);
    return res.status(500).json({
      status: false,
      error: "!!! Oops Somethings went wrong",
      data: {},
    });
  }
};
