const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const authSchema = new mongoose.Schema({
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
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

// Pre-save hook to hash the password before saving, if the password is provided
authSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("Auth", authSchema);
