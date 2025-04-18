const express = require("express");
const router = express.Router();
const clubController = require("../controllers/clubController");
const userAuthMiddleware = require("../middleware/auth");
const clubAuthMiddleware = require("../middleware/clubAuth");
const {
  notificationList,
  readNotification,
} = require("../controllers/notificationConroller");

// Read Club or PendingClub (for the authenticated club)
router.get("/read", clubAuthMiddleware, clubController.readClubs);

// Public route to read a club or pending club by ID
router.get("/read/:id", clubController.readClubById);
router.get("/get-map-details/:id", clubController.getClubById);

// Create a new PendingClub (public, no authentication needed)
router.post("/create", clubAuthMiddleware, clubController.createClub);

// Update Club or PendingClub (for the authenticated club)
router.put("/update", clubAuthMiddleware, clubController.updateClub);

// Promote PendingClub to Club (for the authenticated club)
router.put("/promote/:id", clubAuthMiddleware, clubController.promoteToClub);

// Delete Club or PendingClub (for the authenticated club)
router.delete("/delete/:id", clubAuthMiddleware, clubController.deleteClub);

// List all PendingClubs (for authorized users only)
//router.get("/pending", userAuthMiddleware, clubController.listPendingClubs);

router.get("/pending", clubController.listPendingClubs);
// List all Clubs (public)
router.get("/clubs", clubController.listClubs);

router.get(
  "/clubs-table",
  clubAuthMiddleware,
  clubController.clubListTableView
);

router.patch("/cancel-membership", clubController.cancelMembership);

router.post("/filteredList", clubController.filteredList);

router.get("/notready", clubController.listNotReadyClubs);

router.get("/notification/list", clubAuthMiddleware, notificationList);
router.post("/notification/read", clubAuthMiddleware, readNotification);

// router.post(
//   "/generate-upload-url",
//   clubAuthMiddleware,
//   clubController.generatePresignedUrl
// );

router.post(
  "/generate-upload-url",
  clubAuthMiddleware,
  clubController.generatePresignedUrl
);

router.get(
  "/generate-get-url",
  clubAuthMiddleware,
  clubController.generateGetPresignedUrl
);

router.get("/read", clubAuthMiddleware, clubController.readClubs);

module.exports = router;
