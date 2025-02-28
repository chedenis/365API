exports.stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
