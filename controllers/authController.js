const bcrypt = require("bcrypt");
const getCoordinates = require("../utils/getCoordinates");
const passport = require("passport");
const { Auth, User, ClubAuth } = require("../models");

exports.session = async (req, res) => {
  console.log("checking session", req.session);
  if (req.user) {
    const userType = req.user instanceof ClubAuth ? "club" : "user";
    console.log("checking user type", userType);
    return res.status(200).json({ userType });
  } else {
    // No user is logged in
    return res.status(200).json({ userType: null });
  }
};

exports.getLoginStatus = (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const { email, _id } = req.user;
    return res.status(200).json({
      loggedIn: true,
      auth: {
        id: _id,
        email,
      },
    });
  } else {
    return res.status(200).json({
      loggedIn: false,
      clubAuth: null,
    });
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
