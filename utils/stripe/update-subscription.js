const { stripe } = require("../../config/stripe");
const { MemberShip } = require("../../models");

async function handleSubscriptionUpdated(subscription) {
  try {
    // Find the membership
    const membership = await MemberShip.findOne({
      stripe_subscription_id: subscription.id,
    });

    if (!membership) {
      console.error("Membership not found for subscription:", subscription.id);
      return;
    }

    // Map Stripe status to our membership status
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

    // Update membership status
    membership.status = membershipStatus;
    membership.auto_renew = !subscription.cancel_at_period_end;
    await membership.save();
  } catch (error) {
    console.error("Error handling subscription updated:", error);
  }
}

module.exports = handleSubscriptionUpdated;
