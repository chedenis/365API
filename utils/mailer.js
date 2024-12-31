const nodemailer = require("nodemailer");
const path = require("path");

const sendEmail = async (to, subject, resetLink) => {
  try {
    // Please remove static credentials once we have updated the .env file correctly
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    const htmlContent = `
    <div style="background-color: #EAF8F1; padding: 50px; font-family: Arial, sans-serif; text-align: center;">
      <div style="max-width: 450px; margin: 0 auto; background: #fff; border-radius: 10px; padding: 30px; text-align: center; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
        <img src="cid:logoImage" alt="Logo" style="max-width: 250px;  margin-bottom: 30px; width: 100%; height: auto; display: block; margin: 0 auto;"/>
        <p style="color: #555; font-size: 14px; margin-bottom: 20px; text-align: center;">
          We've received a request to reset your password.
        </p>
        <p style="font-size: 14px; color: #777; margin-bottom: 20px; text-align: center;">
          If you didn't make the request, just ignore this message. Otherwise, you can reset your password below:
        </p>
        <a href="${resetLink}" style="background-color: #37c597; color: #fff; padding: 10px 20px; font-size: 16px; border-radius: 5px; text-decoration: none; display: inline-block;">Reset your password</a>
        <p style="font-size: 12px; color: #999; margin-top: 20px; text-align: center;">Thanks,<br>The 365Dink Team</p>
        <hr style="border: 0; height: 1px; background: #ddd; margin: 20px 0;" />
        <p style="font-size: 12px; color: #aaa; margin-top: 10px; text-align: center;">Sent with ♥ from 365Dink</p>
      </div>
    </div>
  `;
    const mailOptions = {
      from: '"Your App Name" <noreply@yourapp.com>',
      to,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: "365DinkLogoWithText.jpg",
          path: path.join(
            __dirname,
            "../public/images/365DinkLogoWithText.jpg"
          ),
          cid: "logoImage",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully.");
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Unable to send email.");
  }
};

module.exports = sendEmail;
