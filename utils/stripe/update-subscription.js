const { stripe } = require("../../config/stripe");
const { MemberShip, User } = require("../../models");

async function handleSubscriptionUpdated(subscription) {
  console.log(subscription, "subscription");
  try {
    const membership = await MemberShip.findOne({
      stripe_subscription_id: subscription.id,
    }).lean();

    if (!membership) {
      console.error("Membership not found for subscription:", subscription.id);
    }

    // Map Stripe status to our membership status
    console.log(subscription.status, "subscription.status");
    let membershipStatus;
    switch (subscription.status) {
      case "active":
        membershipStatus = "active";
        break;
      case "past_due":
        membershipStatus = "past_due";
        break;
      case "canceled":
        membershipStatus = "canceled";
        break;
      case "unpaid":
        membershipStatus = "inactive";
        break;
      default:
        membershipStatus = "inactive";
    }

    const membershipAfterUpdate = await MemberShip.findOne({
      stripe_subscription_id: subscription.id,
    });
    console.log(membershipStatus, "membershipStatus");
    // Update membership status
    membershipAfterUpdate.status = membershipStatus;
    membership.auto_renew = subscription.canceled_at
      ? false
      : !subscription.cancel_at_period_end;
    await membershipAfterUpdate.save();

    const statusObj = {
      active: "Active",
      past_due: "Inactive",
      canceled: "Inactive",
      unpaid: "Inactive",
      inactive: "Inactive",
    };

    await User.findByIdAndUpdate(membership?.user, {
      membershipStatus: statusObj[membershipStatus],
    });
    return true;
  } catch (error) {
    console.error("Error handling subscription updated:", error);
    return false;
  }
}

module.exports = handleSubscriptionUpdated;
