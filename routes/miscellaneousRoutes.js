const miscellaneousController = require('../controllers/miscellaneousController')
const express = require ('express');
const router = express.Router();


router.post("/contact-form", miscellaneousController.submitContactForm)



module.exports = router;