// routes/user.js
const express = require("express");
const {
  createComments,
  listComments,
} = require("../controllers/clubCommentsController");
const clubAuthMiddleware = require("../middleware/clubAuth");

const router = express.Router();

router.post("/create", clubAuthMiddleware, createComments);
router.get("/list", clubAuthMiddleware, listComments);

module.exports = router;
