const createPayment = require("../helper/stripe/create-payment");
const createOrUpdateCustomer = require("../helper/stripe/create-update-customer");
const { User } = require("../models");

exports.createPayment = async (req, res) => {
  try {
    const userData = req.user;

    let stripeCustomerId = userData?.stripeCustomerId;
    if (!stripeCustomerId) {
      const stripeCustomerData = await createOrUpdateCustomer({
        firstName: profile?.name?.givenName,
        lastName: profile?.name?.familyName || "Unknown",
        email: email,
        customerId: null,
      });

      if (stripeCustomerData?.status) {
        const customerId = stripeCustomerData?.customerId;

        await User.findByIdAndUpdate(userData?._id, {
          stripeCustomerId: customerId,
        });

        stripeCustomerId = customerId;
      }
    }

    const paymentData = await createPayment(stripeCustomerId, userData?._id);

    return res.status(200).json({
      message: "Payment url get successfully",
      data: paymentData?.url,
      status: paymentData?.status,
    });
  } catch (error) {
    console.error("Error submitting contact form", error);
    return res
      .status(500)
      .json({ message: "!!! Oops Something went wrong", data: "" });
  }
};
