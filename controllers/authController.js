const bcrypt = require("bcrypt");
const Auth = require("../models/Auth");
const User = require("../models/User");
const getCoordinates = require("../utils/getCoordinates");
const passport = require("passport");
const ClubAuth = require("../models/ClubAuth");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Set your Stripe secret key here

exports.createCheckoutSession = async (req, res) => {
  try {
    // Retrieve the authenticated user's ID (assuming user ID is available in req.user)
    const userId = req.user._id;

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Membership",
              description: "Premium club membership",
            },
            unit_amount: 5000, // Amount in cents (e.g., $50.00)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_BASE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_BASE_URL}/profile`,
      metadata: {
        userId: userId.toString(), // Pass the user ID to Stripe metadata for later use in webhook
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
};

exports.session = async (req, res) => {
  if (req.user) {
    const userType = req.user instanceof ClubAuth ? "club" : "user";
    return res.status(200).json({ userType });
  } else {
    // No user is logged in
    return res.status(200).json({ userType: null });
  }
};

exports.register = async (req, res) => {
  console.log("trying to register");
  try {
    const {
      username,
      password,
      firstName,
      lastName,
      address,
      membershipStatus,
      skillLevel,
    } = req.body;

    if (!username || !password || !firstName || !lastName || !address) {
      console.log("all fields are required");
      return res.status(400).json({ error: "All fields are required" });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const existingAuth = await Auth.findOne({ username });
    if (existingAuth) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`;
    const { latitude, longitude } = await getCoordinates(fullAddress);

    // Update the address with the GeoJSON location format
    address.location = {
      type: "Point",
      coordinates: [longitude, latitude], // GeoJSON format: [longitude, latitude]
    };

    const newUser = new User({
      firstName,
      lastName,
      address,
      membershipStatus,
      skillLevel,
    });

    newUser.email = username;

    console.log(newUser);
    await newUser.save();

    const newAuth = new Auth({
      username,
      password: hashedPassword,
      user: newUser._id,
    });

    console.log(newAuth);

    await newAuth.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error registering user", err);
    if (err.name === "ValidationError") {
      res.status(400).json({ error: err.message });
    } else {
      res
        .status(500)
        .json({ error: "Error registering user", details: err.message });
    }
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const auth = await Auth.findOne({ username }).populate("user");
    if (!auth) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, auth.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

    // const token = jwt.sign({ id: auth.user._id }, process.env.JWT_SECRET, {
    //   expiresIn: "1h",
    // });
    const token = "foo";
    console.log("heres the user found", auth.user);
    if (auth.user && !auth.user.email) {
      auth.user.email = username;
    }
    res.status(200).json({ token, user: auth.user });
  } catch (err) {
    console.error("Error logging in", err);
    res.status(500).json({ error: "Error logging in", details: err.message });
  }
};

// Google OAuth for user login/register
exports.googleAuth = (req, res, next) => {
  // Determine platform and set it as a query parameter
  const platform = req.query.platform === "app" ? "app" : "web";
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: platform, // Pass platform as state parameter
  })(req, res, next);
};

exports.googleCallback = (req, res, next) => {
  // Retrieve platform from state
  const platform = req.query.state || "web"; // Default to web if not specified

  const redirectUrl =
    platform === "app"
      ? process.env.REACT_NATIVE_SUCCESS_REDIRECT
      : process.env.WEB_SUCCESS_REDIRECT;

  passport.authenticate("google", {
    successRedirect: redirectUrl,
    failureRedirect: "/api/auth/failure",
  })(req, res, next);
};

// Facebook OAuth for user login/register
exports.facebookAuth = (req, res, next) => {
  // Determine platform and set it as a query parameter
  const platform = req.query.platform === "app" ? "app" : "web";
  passport.authenticate("facebook", {
    state: platform, // Pass platform as state parameter
  })(req, res, next);
};

exports.facebookCallback = (req, res, next) => {
  // Retrieve platform from state
  const platform = req.query.state || "web";

  const redirectUrl =
    platform === "app"
      ? process.env.REACT_NATIVE_SUCCESS_REDIRECT
      : process.env.WEB_SUCCESS_REDIRECT;

  passport.authenticate("facebook", {
    successRedirect: redirectUrl,
    failureRedirect: "/api/auth/failure",
  })(req, res, next);
};

// Logout a user
exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Error logging out" });
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
};
