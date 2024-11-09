const mongoose = require("mongoose");

// Determine model names based on the environment
const environment = process.env.NODE_ENV;
const ClubModelName =
  environment === "production"
    ? "ClubPROD"
    : environment === "qa"
    ? "ClubQA"
    : "Club";
const UserModelName =
  environment === "production"
    ? "UserPROD"
    : environment === "qa"
    ? "UserQA"
    : "User";
const ClubAuthModelName =
  environment === "production"
    ? "ClubAuthPROD"
    : environment === "qa"
    ? "ClubAuthQA"
    : "ClubAuth";
const AuthModelName =
  environment === "production"
    ? "AuthPROD"
    : environment === "qa"
    ? "AuthQA"
    : "Auth";

// Import schemas
const ClubSchema = require("./Club");
const UserSchema = require("./User");
const ClubAuthSchema = require("./ClubAuth");
const AuthSchema = require("./Auth");

// Register each model only once with the dynamic name
const Club =
  mongoose.models[ClubModelName] || mongoose.model(ClubModelName, ClubSchema);
const User =
  mongoose.models[UserModelName] || mongoose.model(UserModelName, UserSchema);
const ClubAuth =
  mongoose.models[ClubAuthModelName] ||
  mongoose.model(ClubAuthModelName, ClubAuthSchema);
const Auth =
  mongoose.models[AuthModelName] || mongoose.model(AuthModelName, AuthSchema);

// Export models for use in other files
module.exports = { Club, User, ClubAuth, Auth };
