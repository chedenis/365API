const { MemberShip, User } = require("../../models");
const {
  calculateCancellationDetails,
  cancelMembershipAndRefund,
} = require("../stripe/cancellation-detail");
const dayjs = require("dayjs");

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

    // Get cancellation details
    const { cancelDate, refundPercentage, cancellationType } =
      calculateCancellationDetails(dayjs(membership?.start_date));

    // Update membership to canceled status
    await cancelMembershipAndRefund(
      membership,
      cancelDate,
      refundPercentage,
      cancellationType
    );

    // Update user membership status
    await User.findByIdAndUpdate(membership?.user, {
      membershipStatus: "Expired",
    });

    // Update membership to canceled status
    membership.status = "canceled";
console.log(membership,"membership")
    await membership.save();
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = handleSubscriptionDeleted;
