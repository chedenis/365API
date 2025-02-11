const ContactUs = require("../models/ContactUs");
const nodemailer = require("nodemailer");
require('dotenv').config();

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

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: "nchawda@sigmasolve.com",
        pass: "izsfzuisimhynfed",
      },
    });

    const mailOptions = {
      to: "info@365dink.com",
      subject: "New Contact Form Submission",
      html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone Number:</strong> ${phoneNumber || "N/A"}</p>
      <p><strong>Message:</strong> ${message}</p>
    `,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "Contact form submitted successfully" });
  } catch (error) {
    console.error("Error submitting contact form", error);
    res
      .status(500)
      .json({ error: "Failed to submit contact form", details: error.message });
  }
};
