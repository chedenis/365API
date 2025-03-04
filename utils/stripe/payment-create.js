const { MemberShip, Payment } = require("../../models");

async function handlePaymentCreate(payment) {
  try {
    if (payment) {
      return true;
    }
  } catch (error) {
    console.error("Error handling invoice paid:", error);
    return false;
  }
}

module.exports = handlePaymentCreate;
