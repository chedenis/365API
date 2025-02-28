const { MemberShip } = require("../../models");

async function handleSubscriptionDeleted(subscription) {
  try {
    // Find the membership
    const membership = await MemberShip.findOne({
      stripe_subscription_id: subscription.id,
    });

    if (!membership) {
      console.error("Membership not found for subscription:", subscription.id);
      return;
    }

    // Update membership to canceled status
    membership.status = "canceled";
    membership.auto_renew = false;

    await membership.save();
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = handleSubscriptionDeleted;
