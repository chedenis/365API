// controllers/userController.js
const {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { User, MemberShip, Auth, Payment } = require("../models");
const flattenUpdates = require("../utils/flattenUpdates");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_WEBHOOK_SECRET);
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const createOrUpdateCustomer = require("../helper/stripe/create-update-customer");
const handleCheckoutSessionCompleted = require("../utils/stripe/checkout-session");
const handleInvoicePaymentFailed = require("../utils/stripe/invoice-failed");
const handleSubscriptionUpdated = require("../utils/stripe/update-subscription");
const handleInvoicePaid = require("../utils/stripe/invoice-paid");
const handleSubscriptionDeleted = require("../utils/stripe/delete-subscription");
const handlePaymentCreate = require("../utils/stripe/payment-create");
const handleChargeRefunded = require("../utils/stripe/refunded-subscription");

const {
  checkMemberShipStatus,
  defaultServerErrorMessage,
} = require("../utils/common");
const deleteCustomer = require("../helper/stripe/delete-customer");

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

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      const userId = session.client_reference_id;

      // if (userId) {
      //   try {
      //     // Update user's membership status in the database
      //     await User.findOneAndUpdate(
      //       { _id: userId },
      //       { membershipStatus: "Active" }
      //     );
      //     console.log(`User ${userId} membership status updated to Active.`);
      //   } catch (dbError) {
      //     console.error("Database update error:", dbError.message);
      //     return res.status(500).send("Database error");
      //   }
      // } else {
      //   console.log("No client_reference_id found in session.");
      // }
      await handleCheckoutSessionCompleted(session);
      break;

    case "invoice.paid": {
      const invoice = event.data.object;
      setTimeout(async () => {
        await handleInvoicePaid(invoice);
      }, 500);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;

      await handleInvoicePaymentFailed(invoice);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      console.log("subscription updated")
      // Handle subscription changes
      setTimeout(async () => {
        await handleSubscriptionUpdated(subscription);
      }, 1000);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      console.log("subscription deleted")
      // Handle subscription cancellation
      await handleSubscriptionDeleted(subscription);
      break;
    }
    case "payment_intent.succeeded": {
      const payment = event.data.object;
      // Handle subscription cancellation
      await handlePaymentCreate(payment);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      await handleChargeRefunded(charge);
      break;
    }

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
    const findMemberShip = await checkMemberShipStatus(user?._id);
    res.status(200).json({
      ...user?._doc,
      membershipData: findMemberShip?.status
        ? findMemberShip?.membershipData
        : {},
    });
  } catch (err) {
    console.error("Error fetching user profile", err);
    res
      .status(500)
      .json({ error: "Error fetching user profile", details: err.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const user = req.user;
    const userId = user?.id;

    await Payment.deleteMany({
      user: userId,
    });

    await MemberShip.deleteMany({
      user: userId,
    });

    await Auth.deleteMany({
      user: userId,
    });

    await User.deleteMany({
      _id: userId,
    });

    if (user?.stripeCustomerId) {
      await deleteCustomer(user?.stripeCustomerId);
    }

    return res.status(200).json({
      message: "User deleted successfully",
      status: true,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: defaultServerErrorMessage,
      status: false,
    });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const updates = flattenUpdates(req.body);

    if (updates.memberId === null || updates.memberId === undefined) {
      updates.memberId = req.user._id;
    }

    console.log("Final updates before saving", updates);

    const stripeCustomerData = await createOrUpdateCustomer({
      firstName: updates?.firstName,
      lastName: updates?.lastName || "Unknown",
      email: updates?.email,
      customerId: req?.user?.stripeCustomerId || null,
    });

    if (stripeCustomerData?.status) {
      updates.stripeCustomerId = stripeCustomerData?.customerId;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
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

    console.log("Updated user Data:", user);
    // Return the updated user
    res.status(200).json({ ...user._doc });
  } catch (err) {
    console.error("Error updating user profile", err);
    res
      .status(500)
      .json({ error: "Error updating user profile", details: err.message });
  }
};

exports.generateMemberPresignedUrl = async (req, res) => {
  const { fileName, fileType } = req.body;

  const date = new Date();
  const extension = fileName.split(".").pop();

  const params = {
    Bucket: bucketName,
    Key: `members_${+date}.${extension}`,
    ContentType: fileType,
  };

  try {
    const command = new PutObjectCommand(params);

    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    res.json({ url });
  } catch (err) {
    console.error("Error generating pre-signed URL", err);
    res.status(500).json({ error: "Error generating pre-signed URL" });
  }
};

exports.updateMemberIdWithSerialNumber = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: 1 });

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      const newMemberId = (i + 1).toString().padStart(6, "0");

      // // Update the user
      await User.findByIdAndUpdate(user._id, {
        memberId: newMemberId,
      });

      console.log(`Updated user ${user._id} with new memberId: ${newMemberId}`);
    }
    return res.status(200).json({
      message: "MemberId updated successfully",
      status: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: defaultServerErrorMessage,
      status: false,
    });
  }
};
