const passport = require("passport");

function clubAuthMiddleware(req, res, next) {
  if (
    req.isAuthenticated() &&
    req.user &&
    req.user instanceof require("../models/ClubAuth")
  ) {
    return next(); // Club is authenticated, proceed to the next middleware or route handler
  } else {
    return res.status(401).json({ error: "Unauthorized: Club login required" });
  }
}

module.exports = clubAuthMiddleware;