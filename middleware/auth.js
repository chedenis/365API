const jwt = require("jsonwebtoken");
const { User } = require("../models");

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Forbidden: Invalid token" });
    }

    try {
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      req.user = user; // Attach the authenticated user to the request
      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error("Error in authMiddleware:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}

module.exports = authMiddleware;
