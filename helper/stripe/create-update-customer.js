const { stripe } = require("../../config/stripe");

const createOrUpdateCustomer = async ({
  email,
  firstName,
  lastName,
  customerId,
}) => {
  try {
    const createOrUpdateObj = {
      email: email,
      name: `${firstName} ${lastName}`,
    };
    let customer = "";
    if (customerId) {
      customer = await stripe.customers.update(customerId, createOrUpdateObj);
    } else {
      customer = await stripe.customers.create(createOrUpdateObj);
    }

    // if (needToUpdate) {
    //   await User.findByIdAndUpdate(userId, {
    //     email,
    //     firstName,
    //     lastName,
    //     stripeCustomerId: customer?.id,
    //   });
    // }

    return { status: true, customerId: customer?.id };
  } catch (error) {
    console.log("createCustomerCommon error", error);
    return { status: false, customerId: "" };
  }
};

module.exports = createOrUpdateCustomer;
