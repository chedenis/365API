const jwt = require("jsonwebtoken");
const { ClubAuth } = require("../models");

function clubAuthMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Forbidden: Invalid token" });
    }

    try {
      const clubAuth = await ClubAuth.findById(decoded.id);

      if (!clubAuth) {
        return res.status(404).json({ error: "ClubAuth not found" });
      }

      req.user = clubAuth; // Attach the authenticated club to the request
      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error("Error in clubAuthMiddleware:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}

module.exports = clubAuthMiddleware;
