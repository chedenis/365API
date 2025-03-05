const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const createPayment = async (stripeCustomerId, userId) => {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.FRONTEND_URL}/member/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/member/payment/fail`,
      metadata: {
        userId: userId.toString(),
      },
    });

    return { status: true, url: session.url };
  } catch (error) {
    console.log("createCustomerCommon error", error);
    return { status: false, url: session.url };
  }
};

module.exports = createPayment;
