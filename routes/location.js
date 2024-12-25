const express = require('express');
const router = express.Router();
const { getAllCountries, getStatesByCountryCode } = require('../controllers/locationController');

// Route to get all countries
router.get('/countries', getAllCountries);

// Route to get states by country code
router.get('/states/:countryCode', getStatesByCountryCode);

module.exports = router;
