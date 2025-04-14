const { MemberShip, User } = require("../../models");
const {
  calculateCancellationDetails,
  cancelMembershipAndRefund,
} = require("../stripe/cancellation-detail");
const dayjs = require("dayjs");

async function handleSubscriptionDeleted(subscription) {
  try {
    console.log("Enter in deleted subscription")
    // Find the membership
    const membership = await MemberShip.findOne({
      stripe_subscription_id: subscription.id,
    });

    if (!membership) {
      console.error("Membership not found for subscription:", subscription.id);
      return;
    }

    if (membership.auto_renew === true) {
      console.log("Auto renew")
      const startDate = dayjs(membership?.start_date);
      const { cancelDate, refundPercentage, cancellationType } =
        calculateCancellationDetails(startDate);

      await cancelMembershipAndRefund(
        membership,
        cancelDate,
        refundPercentage,
        cancellationType
      );
    }
    console.log(subscription, "subscription");
    const isScheduledCancellation = subscription.cancel_at_period_end;
    const currentPeriodEnd = dayjs(subscription.current_period_end * 1000);
    const now = dayjs();
    console.log(
      !isScheduledCancellation && now.isBefore(currentPeriodEnd),
      !isScheduledCancellation,
      now.isBefore(currentPeriodEnd),
      "test"
    );
    if (
      !(!isScheduledCancellation && now.isBefore(currentPeriodEnd)) ||
      subscription?.status === "canceled"
    ) {
      console.log("Scheduled expiration detected:", subscription?.id);
      await User.findByIdAndUpdate(membership.user, {
        membershipStatus: "Expired",
      });
    }

    membership.status = "canceled";
    membership.auto_renew = false;
    await membership.save();
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = handleSubscriptionDeleted;
