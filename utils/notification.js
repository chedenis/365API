const { Notification } = require("../models");

exports.createNotification = async ({
  sender = "",
  senderType = "",
  receiver = "",
  receiverType = "",
  title = "",
  body = "",
  notificationType = "",
  redirectTo = "",
  redirectId = "",
}) => {
  try {
    const createNotification = await Notification.create({
      sender,
      senderType,
      receiver,
      receiverType,
      title,
      body,
      notificationType,
      redirectTo,
      redirectId,
    });

    return {
      status: true,
      data: createNotification,
    };
  } catch (error) {
    console.log("error", error);
    return {
      status: false,
      data: {},
    };
  }
};
