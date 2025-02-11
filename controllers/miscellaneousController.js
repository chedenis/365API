const ContactUs = require("../models/ContactUs");
const sendMail = require("../utils/nodemailer")


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

    const htmlContent = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone Number:</strong> ${phoneNumber || "N/A"}</p>
    <p><strong>Message:</strong> ${message}</p>
  `;

    await sendMail(
      "noreply@365dink.com",
      "New Contact Form Submission",
      htmlContent
    );

    res.status(201).json({ message: "Contact form submitted successfully" });
  } catch (error) {
    console.error("Error submitting contact form", error);
    res
      .status(500)
      .json({ error: "Failed to submit contact form", details: error.message });
  }
};
