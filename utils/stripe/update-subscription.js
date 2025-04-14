const { stripe } = require("../../config/stripe");
const { MemberShip, User } = require("../../models");

async function handleSubscriptionUpdated(subscription) {
  console.log(subscription, "subscription");

  try {
    const membership = await MemberShip.findOne({
      stripe_subscription_id: subscription.id,
    });

    if (!membership) {
      console.error("Membership not found for subscription:", subscription.id);
      return;
    }

    // Map Stripe status to our membership status
    const statusMapping = {
      active: "active",
      past_due: "past_due",
      canceled: "canceled",
      unpaid: "inactive",
      default: "inactive",
    };

    membership.status = statusMapping[subscription.status] || "inactive";
    membership.auto_renew = subscription.canceled_at
      ? false
      : !subscription.cancel_at_period_end;

    if (subscription.cancel_at) {
      membership.status = "canceled";
      membership.auto_renew = false;
    }

    await membership.save();

    // Map to User's membershipStatus field
    const userStatusMapping = {
      active: "Active",
      past_due: "Inactive",
      canceled: "Inactive",
      unpaid: "Inactive",
      inactive: "Inactive",
    };

    await User.findByIdAndUpdate(membership.user, {
      membershipStatus: userStatusMapping[subscription.status],
    });

    return true;
  } catch (error) {
    console.error("Error handling subscription updated:", error);
    return false;
  }
}

module.exports = handleSubscriptionUpdated;
