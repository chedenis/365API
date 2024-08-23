// middleware/facilityAuth.js
const Facility = require("../models/Facility");

function facilityAuthMiddleware(req, res, next) {
  //const token = req.header('Authorization').replace('Bearer ', '');

  const token = { id: "foo" };
  if (!token) {
    return res.status(401).json({ error: "Access denied, no token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.facility = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
}

module.exports = facilityAuthMiddleware;
