const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
var randomstring = require("randomstring");

// Determine the environment-specific model name for Club
let clubModelName = "Club";
if (process.env.NODE_ENV === "qa") {
  clubModelName = "ClubQA";
} else if (process.env.NODE_ENV === "production") {
  clubModelName = "ClubPROD";
}

// Define the ClubAuth schema
const clubAuthSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    referralCode: { type: String, required: false, trim: true },
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.facebookId;
      },
      minlength: [6, "Password must be at least 6 characters long"],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },
    otp: { type: String, required: false },
    clubs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:
          process.env.NODE_ENV === "production"
            ? "ClubPROD"
            : process.env.NODE_ENV === "qa"
            ? "ClubQA"
            : "Club", // Explicit environment-based model name, // Use the model name string directly
        default: [],
      },
    ],
    userType: {
      type: String,
      enum: ["clubOwner", "admin"],
      default: "clubOwner",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    randomString: {
      type: String,
      default: function () {
        return randomstring.generate();
      },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash the password before saving, if the password is provided
clubAuthSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    return next(err);
  }
});

// Pre-save hook to ensure randomString is unique
clubAuthSchema.pre("save", async function (next) {
  if (!this.isModified("randomString")) return next();

  try {
    // Determine the model name based on the environment
    let modelName = "ClubAuth";
    if (process.env.NODE_ENV === "qa") {
      modelName = "ClubAuthQA";
    } else if (process.env.NODE_ENV === "production") {
      modelName = "ClubAuthPROD";
    }

    // Get the model to query existing records
    const Model = mongoose.model(modelName);

    // Try to find a unique randomString (max 5 attempts to avoid infinite loops)
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!isUnique && attempts < maxAttempts) {
      // Generate a new random string
      this.randomString = randomstring.generate();

      // Check if it exists in the database
      const existingDoc = await Model.findOne({
        randomString: this.randomString,
      });

      if (!existingDoc) {
        isUnique = true;
      }

      attempts++;
    }

    if (!isUnique) {
      return next(
        new Error(
          "Failed to generate a unique random string after multiple attempts"
        )
      );
    }

    next();
  } catch (err) {
    return next(err);
  }
});

// Method to compare the password during login
clubAuthSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Determine the model name for ClubAuth based on the environment
let modelName = "ClubAuth";
if (process.env.NODE_ENV === "qa") {
  modelName = "ClubAuthQA";
} else if (process.env.NODE_ENV === "production") {
  modelName = "ClubAuthPROD";
}

// Export the model with the dynamic name
module.exports =
  mongoose.models[modelName] || mongoose.model(modelName, clubAuthSchema);
