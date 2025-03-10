const { Notification, User, Club, ClubAuth } = require("../models");
const { pagination, defaultServerErrorMessage } = require("../utils/common");

exports.notificationList = async (req, res) => {
  try {
    const userId = req.user._id;
    const { pageNo, limit } = req.query;

    let data = await pagination(
      Notification,
      { receiver: userId },
      pageNo,
      limit
    );

    for (let i = 0; i < data?.data?.length; i++) {
      const notificationData = data?.data?.[i];

      if (
        notificationData?.redirectId &&
        ["createCommentsForAdmin", "createCommentsForClub"].includes(
          notificationData?.notificationType
        )
      ) {
        const findClub = await Club.findById(notificationData?.redirectId);
        notificationData.senderClubNameData = findClub || {};
      } else {
        notificationData.senderClubNameData = {};
      }
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error checking membership status:", error);
    return res.status(500).json({
      status: false,
      message: "List not fetched",
      data: [],
      pagination: {},
    });
  }
};

exports.readNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationIdList, isReadAll } = req.body;

    if (notificationIdList?.length <= 0 && !isReadAll) {
      return res.status(400).json({
        status: false,
        message: "Provide proper parameter",
      });
    }

    const updateCriteria = isReadAll
      ? { receiver: userId }
      : { _id: { $in: notificationIdList } };

    await Notification.updateMany(updateCriteria, { $set: { isRead: true } });

    return res.status(200).json({
      status: true,
      message: "Notification read successfully",
    });
  } catch (error) {
    console.error("Error checking membership status:", error);
    return res.status(500).json({
      status: false,
      message: defaultServerErrorMessage,
    });
  }
};
