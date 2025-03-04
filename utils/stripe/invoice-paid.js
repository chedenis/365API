const { MemberShip, Payment } = require("../../models");

async function handleInvoicePaid(invoice) {
  try {
    // Get customer and subscription info
    const subscriptionId = invoice.subscription;

    // Find the membership
    const membership = await MemberShip.findOne({
      stripe_subscription_id: subscriptionId,
    }).lean();

    if (!membership) {
      console.error("Membership not found for subscription:", subscriptionId);
      return;
    }

    // Record the payment
    await Payment.create({
      user: membership.user,
      membership: membership._id,
      stripe_payment_intent_id: invoice.payment_intent,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency,
      status: "succeeded",
      payment_date: new Date(invoice.status_transitions.paid_at * 1000),
    });

    const membershipAfterUpdate = await MemberShip.findOne({
      stripe_subscription_id: subscriptionId,
    });

    // Ensure membership is marked as active
    membershipAfterUpdate.status = "active";

    await membershipAfterUpdate.save();

    // If this is a renewal, update the end date
    if (invoice.billing_reason === "subscription_cycle") {
      // Calculate new end date (1 year from current end date)
      const currentEndDate = new Date(membership.end_date);
      const newEndDate = new Date(currentEndDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      membershipAfterUpdate.end_date = newEndDate;
      await membershipAfterUpdate.save();
    }
    return true;
  } catch (error) {
    console.error("Error handling invoice paid:", error);
    return false;
  }
}

module.exports = handleInvoicePaid;
