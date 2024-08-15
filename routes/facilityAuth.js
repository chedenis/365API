// routes/facilityAuth.js
const express = require('express');
const { registerFacility, loginFacility } = require('../controllers/facilityAuthController');

const router = express.Router();

router.post('/register', registerFacility);
router.post('/login', loginFacility);

module.exports = router;
