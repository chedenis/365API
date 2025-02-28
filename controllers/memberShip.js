const { MemberShip } = require("../models");

exports.checkMemberShipStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const membership = await MemberShip.findOne({ user: userId }).sort({
      created_at: -1,
    });

    if (!membership) {
      return res
        .status(500)
        .json({ status: false, message: "Membership not Found", data: {} });
    }

    // Check if membership is expired
    const now = new Date();
    const endDate = new Date(membership.end_date);

    const isActive = membership.status === "active" && now <= endDate;

    return res.status(200).json({
      status: true,
      message: "Membership status",
      data: {
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
    });
  } catch (error) {
    console.error("Error checking membership status:", error);
    return res.status(500).json({
      status: true,
      error: "!!! Oops Somethings went wrong",
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

    if (!membership || !membership.stripe_subscription_id) {
      return res
        .status(404)
        .json({ status: false, error: "Active membership not found" });
    }

    // Cancel the subscription at period end (won't renew)
    await stripe.subscriptions.update(membership.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update our database
    membership.auto_renew = false;

    await membership.save();

    return res.status(200).json({
      success: true,
      message: "Membership will not renew at the end of the current period",
    });
  } catch (error) {
    console.error("Error canceling membership:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to cancel membership" });
  }
};
