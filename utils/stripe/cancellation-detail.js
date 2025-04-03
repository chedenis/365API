const dayjs = require("dayjs");
const { stripe } = require("../../config/stripe");

exports.calculateCancellationDetails = (startDate) => {
  const now = dayjs("2026-04-15");
  // const now = dayjs();
  const renewalDate = startDate.add(1, "year");
  const gracePeriodEnd = renewalDate.add(30, "day");
  const sixMonthMark = renewalDate.add(6, "month");

  let refundPercentage = 0;
  let cancelDate = renewalDate;
  let cancellationType = "first_year";

  if (now.isBefore(renewalDate)) {
    console.log("first year");
    cancelDate = renewalDate;
    cancellationType = "first_year";
  } else if (now.isBefore(gracePeriodEnd)) {
    console.log("30 days grace periods");
    refundPercentage = 1;
    cancelDate = dayjs();
    cancellationType = "grace_period";
  } else if (now.isBefore(sixMonthMark)) {
    console.log(" 30-day grace period and before 6 months");
    refundPercentage = 0.5;
    cancelDate = sixMonthMark;
    cancellationType = "before_6_months";
  } else {
    console.log("6 month to a year");
    cancelDate = renewalDate;
    cancellationType = "after_6_months";
  }

  return { cancelDate, refundPercentage, cancellationType };
};

exports.cancelMembershipAndRefund = async (
  membership,
  cancelDate,
  refundPercentage,
  cancellationType
) => {
  console.log(
    membership,
    cancelDate,
    refundPercentage,
    cancellationType,
    "test"
  );
  const stripeSubscription = await stripe.subscriptions.retrieve(
    membership.stripe_subscription_id
  );

  if (
    cancellationType === "first_year" ||
    cancellationType === "after_6_months"
  ) {
    await stripe.subscriptions.update(membership.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  } else if (cancellationType === "grace_period") {
    await stripe.subscriptions.cancel(membership.stripe_subscription_id);
  } else if (cancellationType === "before_6_months") {
    await stripe.subscriptions.update(membership.stripe_subscription_id, {
      cancel_at: cancelDate.unix(),
    });
  }

  if (refundPercentage > 0) {
    const invoices = await stripe.invoices.list({
      subscription: membership.stripe_subscription_id,
      limit: 1,
    });

    const latestInvoice = invoices?.data?.[0];
    if (latestInvoice?.amount_paid) {
      const refundAmount = Math.round(
        (latestInvoice?.amount_paid / 100) * refundPercentage * 100
      );

      await stripe.refunds.create({
        charge: latestInvoice?.charge,
        amount: refundAmount,
      });

      membership.refund_amount = refundAmount / 100;
      membership.refund_status = "pending";
      membership.stripe_charge_id = latestInvoice.charge;
    }
  }

  membership.end_date = cancelDate.toDate();
  membership.auto_renew = false;
  await membership.save();
};
