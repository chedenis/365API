// middleware/auth.js
const passport = require("passport");

function authMiddleware(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

module.exports = authMiddleware;
