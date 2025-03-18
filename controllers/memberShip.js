const { stripe } = require("../config/stripe");
const { MemberShip } = require("../models");
const { checkMemberShipStatus } = require("../utils/common");

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
    return res.status(404).json({
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

    // Cancel the subscription instantly
    // await stripe.subscriptions.cancel(membership.stripe_subscription_id);

    // cancel the subscription at period end
    await stripe.subscriptions.update(membership.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update our database
    // membership.auto_renew = false;

    // await membership.save();

    return res.status(200).json({
      success: true,
      message: "Membership is canceled",
    });
  } catch (error) {
    console.error("Error canceling membership:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to cancel membership" });
  }
};
