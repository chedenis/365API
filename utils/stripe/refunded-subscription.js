const { MemberShip } = require("../../models");
const { sendRefundEmail } = require("../../utils/mailer");

async function handleChargeRefunded(charge) {
  console.log(charge);
  try {
    let userEmail = charge?.billing_details?.email || charge?.receipt_email;

    if (!userEmail && charge?.customer) {
      const customer = await stripe.customers.retrieve(charge?.customer);
      console.log(customer, "customer");
      userEmail = customer?.email;
    }
    console.log(
      charge?.billing_details?.email,
      charge?.receipt_emailuserEmail,
      "userEmail"
    );
    const membership = await MemberShip.findOne({
      stripe_charge_id: charge.id,
    });

    if (!membership) {
      console.error("Membership not found for charge:", charge.id);
      return;
    }

    const totalAmount = charge?.amount;
    const refundedAmount = charge?.amount_refunded;

    membership.refund_amount = refundedAmount / 100;
    membership.refund_status =
      refundedAmount === totalAmount ? "Refunded" : "Partial Refund";
    membership.refund_date = new Date();

    if (refundedAmount === totalAmount) {
      membership.status = "canceled";
    } else if (refundedAmount > 0 && refundedAmount < totalAmount) {
      membership.status = "active";
    } else {
      membership.status = "active";
    }

    await membership.save();
    await sendRefundEmail(
      userEmail,
      "Your Refund has been Processed",
      refundedAmount / 100
    );
    console.log(`Refund processed for charge ${charge.id}`);
    return true;
  } catch (error) {
    console.error("Error handling refund:", error);
    return false;
  }
}
module.exports = handleChargeRefunded;
