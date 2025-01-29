const ContactUs = require("../models/ContactUs");

exports.submitContactForm = async (req, res) => {
  try {
    const { name, phoneNumber, email, message } = req.body;

    const newContact = new ContactUs({
      name,
      phoneNumber,
      email,
      message,
    });

    await newContact.save();
    res.status(201).json({ message: "Contact form submitted successfully" });
  } catch (error) {
    console.error("Error submitting contact form", error);
    res
      .status(500)
      .json({ error: "Failed to submit contact form", details: error.message });
  }
};


