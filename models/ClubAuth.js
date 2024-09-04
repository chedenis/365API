const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.facebookId;
      }, // Password is required only if not using OAuth
      minlength: [6, "Password must be at least 6 characters long"],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined values while ensuring uniqueness
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined values while ensuring uniqueness
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club", // Assuming you have a Club model
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
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

// Method to compare the password during login
clubAuthSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("ClubAuth", clubAuthSchema);
