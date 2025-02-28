const { stripe } = require("../../config/stripe");
const { MemberShip, Payment } = require("../../models");

async function handleInvoicePaymentFailed(invoice) {
  try {
    const subscriptionId = invoice.subscription;

    // Find the membership
    const membership = await MemberShip.findOne({
      stripe_subscription_id: subscriptionId,
    });

    if (!membership) {
      console.error("Membership not found for subscription:", subscriptionId);
      return;
    }

    // Record the failed payment
    await Payment.create({
      user: membership.user,
      membership: membership._id,
      stripe_payment_intent_id: invoice.payment_intent,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      status: "failed",
      payment_date: new Date(),
    });

    // Update membership status to past_due
    membership.status = "past_due";

    await membership.save();
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = handleInvoicePaymentFailed;
