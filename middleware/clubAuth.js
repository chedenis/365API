const jwt = require("jsonwebtoken");
const { ClubAuth } = require("../models");

async function clubAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No or invalid token format" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res
        .status(403)
        .json({ error: "Forbidden: Invalid token payload" });
    }

    const clubAuth = await ClubAuth.findById(decoded.id);
    if (!clubAuth) {
      return res.status(404).json({ error: "ClubAuth not found" });
    }

    req.user = clubAuth; // Attach the authenticated club user to the request
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ error: "Forbidden: Invalid token" });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Unauthorized: Token expired" });
    }
    console.error("Error in clubAuthMiddleware:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = clubAuthMiddleware;
