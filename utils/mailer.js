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

const sendEmailOTP = async (to, subject, otp, role) => {
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
            If you didn't make the request, just ignore this message. Otherwise, use this otp for reset password:
          </p>
          <div style="background-color: ${
            role === "club" ? "#37c597" : "rgb(255, 6, 230)"
          }; color: #fff; padding: 10px 20px; font-size: 16px; border-radius: 5px; text-decoration: none; display: inline-block;">${otp}</div>
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

const sendEmailForClubComments = async (
  to,
  subject,
  receiverRole = "club", // admin/club
  extraData = {}
) => {
  try {
    // Create an SES client
    const sesClient = new SESClient();

    const htmlContent = `
      <!DOCTYPE html>
<html>

<head>
    <title>Reply from Club Owner</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
            background-color: rgba(55, 197, 151, 0.2);
        }

        .container {
            max-width: 800px;
            background-color: #ffffff;
            margin: 0 auto;
            padding: 40px;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
        }

        .title {
            font-size: 26px;
            font-weight: bold;
            color: red;
        }

        .title-success {
          font-size: 26px;  
          font-weight: bold;
          color: #37C597;
        }

        .content {
            margin-top: 15px;
            line-height: 1.6;
            font-size: 20px;
        }

        .time {
            font-size: 14px;
        }

        .button {
            border: 1px solid #37C597;
            padding: 10px 30px;
            font-size: 16px;
            color: white !important;
            background-color: #37C597;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 600;
        }

        .button:hover {
            background-color: white;
            color: #37C597 !important;
        }

        .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
        }
    </style>
</head>

<body style="font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
            background-color: rgba(55, 197, 151, 0.2);" >
    <div class="container">
      ${
        receiverRole == "club"
          ? `<div class="title">Your club details have been rejected by Admin</div>
        <div class="content">
            <p>Message: ${extraData?.message}</p>
            <a href="${extraData?.redirectUrl}" class="button" style="cursor:pointer;text-decoration:none;">Go to ${extraData?.clubName}</a>
        </div>
        <div class="footer">
            Thanks,<br>
            The 365Dink Team
        </div>`
          : `<div class="title-success">Club ${extraData?.clubName} has replied to your comment</div>
        <div class="content">
            <p>Message: ${extraData?.message}</p>
            <a href="${extraData?.redirectUrl}" class="button" style="cursor:pointer;text-decoration:none;">Go to ${extraData?.clubName}</a>

        </div>
        <div class="footer">
            Thanks,<br>
            The 365Dink Team
        </div>`
      }
    </div>
</body>

</html>
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

module.exports = {
  sendEmail,
  sendEmailOTP,
  sendEmailForClubComments,
};
