const { stripe } = require("../../config/stripe");

const deleteCustomer = async (customerId) => {
  try {
    const deleteCustomer = await stripe.customers.del(customerId);

    return { status: true, customerId: deleteCustomer?.id };
  } catch (error) {
    console.log("error while delete customer", error);
    return { status: false, customerId: "" };
  }
};

module.exports = deleteCustomer;
