// config/passport.js
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const Auth = require("../models/Auth");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: "email" }, // Use "email" instead of "username"
    async (email, password, done) => {
      try {
        // Look for an existing Auth by email
        let auth = await Auth.findOne({ email });

        if (auth) {
          // Check if password matches
          const isMatch = await bcrypt.compare(password, auth.password);
          if (!isMatch) {
            return done(null, false, { message: "Incorrect password." });
          }

          // Retrieve the associated User
          const user = await User.findById(auth.user);
          return done(null, user);
        } else {
          return done(null, false, {
            message: "No account found with that email.",
          });
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // Look for an existing Auth by googleId or by email
        let auth = await Auth.findOne({
          $or: [{ googleId: profile.id }, { email }],
        });

        if (auth) {
          // If the Auth exists but googleId is missing, add it
          if (!auth.googleId) {
            auth.googleId = profile.id;
            await auth.save();
          }

          // Retrieve the associated User
          const user = await User.findById(auth.user);
          return done(null, user);
        } else {
          // No Auth found, create new Auth and User
          const newUser = new User({
            firstName:
              profile.name.givenName || profile.displayName.split(" ")[0],
            lastName:
              profile.name.familyName ||
              profile.displayName.split(" ")[1] ||
              "Unknown",
            email: email,
          });

          const savedUser = await newUser.save();

          const newAuth = new Auth({
            googleId: profile.id,
            email: email,
            user: savedUser._id,
          });

          await newAuth.save();

          return done(null, savedUser);
        }
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// Facebook Strategy (similar logic can be applied here)
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails.length > 0
            ? profile.emails[0].value
            : undefined;

        // Look for an existing Auth by facebookId or by email
        let auth = await Auth.findOne({
          $or: [{ facebookId: profile.id }, { email }],
        });

        if (auth) {
          // If the Auth exists but facebookId is missing, add it
          if (!auth.facebookId) {
            auth.facebookId = profile.id;
            await auth.save();
          }

          // Retrieve the associated User
          const user = await User.findById(auth.user);
          return done(null, user);
        } else {
          // No Auth found, create new Auth and User
          const newUser = new User({
            firstName:
              profile.name.givenName || profile.displayName.split(" ")[0],
            lastName:
              profile.name.familyName ||
              profile.displayName.split(" ")[1] ||
              "Unknown",
            email: email || "",
          });

          const savedUser = await newUser.save();

          const newAuth = new Auth({
            facebookId: profile.id,
            email: email || "",
            user: savedUser._id,
          });

          await newAuth.save();

          return done(null, savedUser);
        }
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

module.exports = passport;
