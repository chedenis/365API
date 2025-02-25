// controllers/userController.js
const {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { User } = require("../models");
const flattenUpdates = require("../utils/flattenUpdates");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.S3_BUCKET_NAME;

// Webhook handler to track completed sessions
exports.stripeWebhookHandler = async (req, res) => {
  console.log("Webhook received.");

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // Verify the event by constructing it with the raw body and Stripe secret
    event = stripe.webhooks.constructEvent(
      req.body, // Raw body is necessary for signature verification
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  console.log("Received event type:", event.type);
  console.log("Event data object:", event.data.object); // Log the event data for debugging

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      const userId = session.client_reference_id;

      if (userId) {
        try {
          // Update user's membership status in the database
          await User.findOneAndUpdate(
            { _id: userId },
            { membershipStatus: "Active" }
          );
          console.log(`User ${userId} membership status updated to Active.`);
        } catch (dbError) {
          console.error("Database update error:", dbError.message);
          return res.status(500).send("Database error");
        }
      } else {
        console.log("No client_reference_id found in session.");
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).send(); // Send a 200 response to acknowledge receipt
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.memberId) {
      user.memberId = user._id;
      await user.save();
    }
    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user profile", err);
    res
      .status(500)
      .json({ error: "Error fetching user profile", details: err.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const updates = flattenUpdates(req.body);
    // if (req.file) {
    //   const fileName = `profile_pictures/${req.user.id}_${Date.now()}_${
    //     req.file.originalname
    //   }`;

    //   const params = {
    //     Bucket: process.env.S3_BUCKET_NAME,
    //     Key: fileName,
    //     Body: req.file.buffer,
    //     ContentType: req.file.mimetype,
    //     ACL: "public-read",
    //   };

    //   const s3Response = await s3Client.send(new PutObjectCommand(params));

    //   const profilePicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    //   updates.profile_picture = profilePicUrl;
    // }

    if (updates.memberId === null || updates.memberId === undefined) {
      updates.memberId = req.user.id;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      {
        new: true, // Return the updated document
        runValidators: true, // Ensure the updates are validated against the schema
        context: "query", // Needed for certain validators
      }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return the updated user
    res.status(200).json(user);
  } catch (err) {
    console.error("Error updating user profile", err);
    res
      .status(500)
      .json({ error: "Error updating user profile", details: err.message });
  }
};

// Generate a Pre-Signed URL for AWS S3 using v3 SDK
exports.generateMemberPresignedUrl = async (req, res) => {
  const { fileName, fileType } = req.body; // Expecting fileName and fileType in the request

  const params = {
    Bucket: bucketName, // S3 bucket name from environment
    Key: `members/${fileName}`, // The name of the file to be uploaded
    ContentType: fileType, // File type (e.g., image/jpeg, image/png, etc.)
  };

  try {
    // Create the command for putting the object
    const command = new PutObjectCommand(params);

    // Generate the pre-signed URL with a 60-second expiration
    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    // Send the pre-signed URL in the response
    res.json({ url });
  } catch (err) {
    console.error("Error generating pre-signed URL", err);
    res.status(500).json({ error: "Error generating pre-signed URL" });
  }
};

exports.generateMemberGetPresignedUrl = async (req, res) => {
  const { fileUrl } = req.query;

  const fileKey = fileUrl.replace(
    `https://${bucketName}.s3.us-west-1.amazonaws.com/`,
    ""
  );
  const params = {
    Bucket: bucketName,
    Key: fileKey,
  };

  try {
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });
    res.json({ url });
  } catch (err) {
    console.error("Error generating pre-signed GET URL", err);
    res.status(500).json({ error: "Error generating pre-signed GET URL" });
  }
};
