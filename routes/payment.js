// routes/user.js
const express = require("express");
const authMiddleware = require("../middleware/auth");
const { createPayment } = require("../controllers/paymentController");

const router = express.Router();

router.get("/create", authMiddleware, createPayment);

module.exports = router;
