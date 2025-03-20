const { ClubComments, Club, ClubAuth } = require("../models");
const { pagination } = require("../utils/common");
const { sendEmailForClubComments } = require("../utils/mailer");
const { createNotification } = require("../utils/notification");

exports.createComments = async (req, res) => {
  try {
    const userData = req.user;
    const { club, message, clubStatus, isReminder } = req.body;

    if (!["clubOwner", "admin"].includes(userData?.userType)) {
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
    if (clubStatus == "Reject" && userData?.userType != "admin") {
      return res
        .status(400)
        .json({ status: false, message: "Only admin can reject", data: {} });
    }

    // if admin reject then message is required
    if (clubStatus == "Reject" && !message && userData?.userType == "admin") {
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
      await Club.updateOne(
        {
          parentClubId: club,
        },
        {
          status: clubStatus,
        }
      );
    }

    let createComments = "";
    if (message) {
      createComments = await ClubComments.create({
        clubUser: userData?._id,
        userType: userData?.userType,
        club,
        message,
      });
    }

    if (userData?.userType == "admin") {
      const clubAuth = await ClubAuth.findOne({ clubs: club }).lean();

      await sendEmailForClubComments(
        clubAuth?.email,
        `Reply from Admin - ${findClub?.clubName}`,
        "club",
        {
          title: "Your club details have been rejected by Admin",
          redirectUrl: `${process.env.FRONTEND_URL}/club/profile/${findClub?._id}`,
          clubName: findClub?.clubName,
          message: message,
        }
      );

      await createNotification({
        sender: userData?._id,
        senderType: userData?.userType,
        receiver: clubAuth?._id,
        receiverType: clubAuth?.userType,
        title: "Club Rejection Notice",
        body: `Your club details have been rejected by Admin.`,
        notificationType: "createCommentsForClub",
        redirectTo: "club",
        redirectId: findClub?._id,
      });
    } else {
      const [findList] = await ClubComments.find({
        club: findClub?._id,
        userType: "admin",
      })
        .populate("clubUser")
        .lean();

      await sendEmailForClubComments(
        findList?.clubUser?.email,
        isReminder
          ? `Club Approval Reminder for ${findClub?.clubName}`
          : `Reply from Club Owner - ${findClub?.clubName}`,
        "admin",
        {
          title: isReminder
            ? `${findClub?.clubName} has sent a reminder for your club approval. `
            : `Club ${findClub?.clubName} has replied to your comment`,
          redirectUrl: `${process.env.FRONTEND_URL}/club/edit/${findClub?._id}`,
          clubName: findClub?.clubName,
          message: isReminder
            ? "Please review the club details and complete the necessary steps to proceed with the approval process."
            : message,
        },
        isReminder
      );

      // notification for create comments from club-owner to admin
      await createNotification({
        sender: userData?._id,
        senderType: userData?.userType,
        receiver: findList?.clubUser?._id,
        receiverType: findList?.clubUser?.userType,
        title: "Reply from Club Owner",
        body: `Club ${findClub?.clubName} has replied to your comment.`,
        notificationType: "createCommentsForAdmin",
        redirectTo: "club",
        redirectId: findClub?._id,
      });
    }

    return res.status(200).json({
      status: true,
      error: "Comments added successfully",
      data: createComments || {},
    });
  } catch (error) {
    console.log("error", error);
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
      limit
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
