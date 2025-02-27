const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Determine the environment-specific model name for User
let userModelName = "User";
if (process.env.NODE_ENV === "qa") {
  userModelName = "UserQA";
} else if (process.env.NODE_ENV === "production") {
  userModelName = "UserPROD";
}

const authSchema = new mongoose.Schema(
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
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.facebookId;
      },
      minlength: [6, "Password must be at least 6 characters long"],
    },
    passwordUpdatedAt: {
      type: Date,
      default: Date.now,
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
    socialType: { type: String, required: false }, // google
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref:
        process.env.NODE_ENV === "production"
          ? "UserPROD"
          : process.env.NODE_ENV === "qa"
          ? "UserQA"
          : "User", // Explicit environment-based model name, // Use the model name string directly
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash the password before saving, if the password is provided
authSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    return next(err);
  }
});

// Method to compare the password during login
authSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Determine the Auth model name based on the environment
let modelName = "Auth";
if (process.env.NODE_ENV === "qa") {
  modelName = "AuthQA";
} else if (process.env.NODE_ENV === "production") {
  modelName = "AuthPROD";
}

// Export the model with the dynamic name
module.exports =
  mongoose.models[modelName] || mongoose.model(modelName, authSchema);
