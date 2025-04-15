const { stripe } = require("../config/stripe");
const dayjs = require("dayjs");
const { MemberShip, User } = require("../models");
const {
  checkMemberShipStatus,
  defaultServerErrorMessage,
} = require("../utils/common");
const {
  calculateCancellationDetails,
  cancelMembershipAndRefund,
} = require("../utils/stripe/cancellation-detail");

exports.checkMemberShipStatus = async (req, res) => {
  const userId = req.user._id;

  const findMembershipStatus = await checkMemberShipStatus(userId);
  if (findMembershipStatus.status) {
    return res.status(200).json({
      status: true,
      message: "Membership status",
      data: findMembershipStatus.membershipData,
    });
  } else {
    return res.status(200).json({
      status: false,
      message: "Membership not found",
      data: {},
    });
  }
};

exports.renewMemberShipStatus = async (req, res) => {
  try {
    const userId = req.user?._id;

    const membership = await MemberShip.findOne({
      user: userId,
      status: { $in: ["active", "canceled"] },
    });

    if (!membership?.stripe_subscription_id) {
      return res
        .status(404)
        .json({ status: false, error: "Membership not found" });
    }

    if (membership.status === "active" && membership.auto_renew) {
      return res.json({
        success: true,
        message: "Membership is already set to auto-renew",
      });
    }

    // If subscription was canceled, reactivate it
    if (membership.status === "canceled" || !membership.auto_renew) {
      await stripe.subscriptions.update(membership.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      // Update our database
      membership.auto_renew = true;
      membership.status = "active";

      await membership.save();
    }

    return res
      .status(200)
      .json({ success: true, message: "Membership set to auto-renew" });
  } catch (error) {
    console.error("Error renewing membership:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to renew membership" });
  }
};

exports.cancelMemberShipStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const membership = await MemberShip.findOne({
      user: userId,
      status: "active",
    });

    if (!membership?.stripe_subscription_id) {
      return res
        .status(404)
        .json({ status: false, error: "Active membership not found" });
    }

    const startDate = dayjs(membership?.start_date);
    const { cancelDate, refundPercentage, cancellationType } =
      calculateCancellationDetails(startDate);

    await cancelMembershipAndRefund(
      membership,
      cancelDate,
      refundPercentage,
      cancellationType
    );

    return res.status(200).json({
      success: true,
      message: `Membership will be canceled on ${cancelDate?.format(
        "YYYY-MM-DD"
      )}.`,
      refund: refundPercentage
        ? `Refund of ${refundPercentage * 100}% issued.`
        : "No refund applicable.",
    });
  } catch (error) {
    console.error("Error canceling membership:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to cancel membership" });
  }
};

exports.webViewUrl = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No or invalid token format" });
    }

    const token = authHeader.split(" ")[1];
    console.log("token", token);
    return res.status(200).json({
      success: true,
      message: "Url get successfully",
      url: `${process.env.FRONTEND_URL}/member/type?token=${token}&device=mobile`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: defaultServerErrorMessage,
      url: "",
    });
  }
};
