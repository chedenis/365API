const { Notification } = require("../models");
const { pagination, defaultServerErrorMessage } = require("../utils/common");

exports.notificationList = async (req, res) => {
  try {
    const userId = req.user._id;
    const { pageNo, limit } = req.query;

    const data = await pagination(
      Notification,
      { receiver: userId },
      pageNo,
      limit
    );

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
