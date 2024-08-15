const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Auth = require("../models/Auth");
const User = require("../models/User");
const getCoordinates = require("../utils/getCoordinates");

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
      console.log(
        username,
        password,
        firstName,
        lastName,
        address,
        membershipStatus,
        skillLevel
      );
      return res.status(400).json({ error: "All fields are required" });
    }
    console.log("111");

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      console.log("1");
      return res.status(400).json({ error: "Invalid email address" });
    }

    const existingAuth = await Auth.findOne({ username });
    if (existingAuth) {
      console.log("2");
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`;
    const { latitude, longitude } = await getCoordinates(fullAddress);

    address.latitude = latitude;
    address.longitude = longitude;

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

    const token = jwt.sign({ id: auth.user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
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
