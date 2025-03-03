const { stripe } = require("../../config/stripe");
const { MemberShip, User } = require("../../models");

async function handleCheckoutSessionCompleted(session) {
  try {
    const userId = session.metadata.userId;

    // Retrieve subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    );
    console.log("subscription", subscription);

    // Calculate membership end date (1 year from now)
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Create or update membership record
    const existingMembership = await MemberShip.findOne({ user: userId });

    if (existingMembership) {
      // Update existing membership
      existingMembership.stripe_customer_id = session.customer;
      existingMembership.stripe_subscription_id = session.subscription;
      existingMembership.status = "active";
      existingMembership.start_date = startDate;
      existingMembership.end_date = endDate;
      existingMembership.auto_renew = true;
      await existingMembership.save();
    } else {
      // Create new membership
      await MemberShip.create({
        user: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: "active",
        start_date: startDate,
        end_date: endDate,
        auto_renew: false,
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
