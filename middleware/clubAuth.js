const passport = require("passport");
const { ClubAuth } = require("../models"); // Import ClubAuth from models/index.js

function clubAuthMiddleware(req, res, next) {
  if (
    req.isAuthenticated() &&
    req.user &&
    req.user instanceof ClubAuth // Use imported ClubAuth
  ) {
    return next(); // Club is authenticated, proceed to the next middleware or route handler
  } else {
    console.log("Unauthorized access attempt");
    console.log("Is authenticated? " + req.isAuthenticated());
    console.log("User:", req.user);
    return res.status(401).json({ error: "Unauthorized: Club login required" });
  }
}

module.exports = clubAuthMiddleware;
