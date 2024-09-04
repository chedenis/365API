const express = require("express");
const router = express.Router();
const clubController = require("../controllers/clubController");
const userAuthMiddleware = require("../middleware/auth");
const clubAuthMiddleware = require("../middleware/clubAuth");

// Read Club or PendingClub (for the authenticated club)
router.get("/read", clubAuthMiddleware, clubController.readClub);

// Public route to read a club or pending club by ID
router.get("/read/:id", clubController.readClubById);

// Create a new PendingClub (public, no authentication needed)
router.post("/create", clubController.createPendingClub);

// Update Club or PendingClub (for the authenticated club)
router.put("/update", clubAuthMiddleware, clubController.updateClub);

// Promote PendingClub to Club (for the authenticated club)
router.post("/promote", clubAuthMiddleware, clubController.promoteToClub);

// Delete Club or PendingClub (for the authenticated club)
router.delete("/delete", clubAuthMiddleware, clubController.deleteClub);

// List all PendingClubs (for authorized users only)
router.get("/pending", userAuthMiddleware, clubController.listPendingClubs);

// List all Clubs (public)
router.get("/clubs", clubController.listClubs);

module.exports = router;
