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
      allow_promotion_codes: true,
      success_url: `${process.env.FRONTEND_URL}/member/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/member/payment/fail`,
      metadata: {
        userId: userId.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
    });

    return { status: true, url: session.url };
  } catch (error) {
    console.log("createCustomerCommon error", error);
    return { status: false, url: null };
  }
};

module.exports = createPayment;
