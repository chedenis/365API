const { stripe } = require("../../config/stripe");
const { MemberShip, User } = require("../../models");

async function handleCheckoutSessionCompleted(session) {
  try {
    const userId = session.metadata.userId;

    // Retrieve subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    );

    // Calculate membership end date (1 year from now)
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Create or update membership record
    const existingMembership = await MemberShip.findOne({ user: userId });

    if (existingMembership) {
      await MemberShip.findByIdAndUpdate(existingMembership?._id, {
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: "active",
        start_date: startDate,
        end_date: endDate,
      });
    } else {
      // Create new membership
      await MemberShip.create({
        user: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: "active",
        start_date: startDate,
        end_date: endDate,
      });
    }

    await User.findByIdAndUpdate(userId, { membershipStatus: "Active" });

    return true;
  } catch (error) {
    console.error("Error handling checkout session completed:", error);
    return false;
  }
}

module.exports = handleCheckoutSessionCompleted;
