const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const sendEmail = async (to, subject, resetLink, role) => {
  try {
    // Create an SES client
    const sesClient = new SESClient();

    const htmlContent = `
      <div style="background-color: ${
        role === "club" ? "#EAF8F1" : "rgb(255, 249, 255)"
      }; padding: 50px; font-family: Arial, sans-serif; text-align: center;">
        <div style="max-width: 450px; margin: 0 auto; background: #fff; border-radius: 10px; padding: 30px; text-align: center; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          <p style="color: #555; font-size: 14px; margin-bottom: 20px; text-align: center;">
            We've received a request to reset your password.
          </p>
          <p style="font-size: 14px; color: #777; margin-bottom: 20px; text-align: center;">
            If you didn't make the request, just ignore this message. Otherwise, you can reset your password below:
          </p>
          <a href="${resetLink}" style="background-color: ${
      role === "club" ? "#37c597" : "rgb(255, 6, 230)"
    }; color: #fff; padding: 10px 20px; font-size: 16px; border-radius: 5px; text-decoration: none; display: inline-block;">Reset your password</a>
          <p style="font-size: 12px; color: #999; margin-top: 20px; text-align: center;">Thanks,<br>The 365Dink Team</p>
        </div>
      </div>
    `;

    const emailParams = {
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Body: {
          Html: {
            Data: htmlContent,
          },
        },
        Subject: {
          Data: subject,
        },
      },
      Source: '"365Dink Support" <noreply@365Dink.com>', // Replace with your SES-verified email/domain
    };

    // Send the email
    const command = new SendEmailCommand(emailParams);
    await sesClient.send(command);
    console.log("Email sent successfully via SES.");
  } catch (error) {
    console.error("Error sending email via SES:", error);
    throw new Error("Unable to send email.");
  }
};

module.exports = sendEmail;
