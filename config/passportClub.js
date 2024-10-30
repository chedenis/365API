const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const ClubAuth = require("../models/ClubAuth");
const bcrypt = require("bcryptjs");

const Auth = require("../models/Auth");
const User = require("../models/User");

// Local Strategy for Club Auth
passport.use(
  "club-local",
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const clubAuth = await ClubAuth.findOne({ email });
        if (!clubAuth) {
          return done(null, false, {
            message: "No account found with that email.",
          });
        }

        const isMatch = await bcrypt.compare(password, clubAuth.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, clubAuth);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Google Strategy for Club Auth
passport.use(
  "club-google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/club-auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        console.log("Google login email:", email); // Log email for debugging

        let clubAuth = await ClubAuth.findOne({
          $or: [{ googleId: profile.id }, { email }],
        });

        if (clubAuth) {
          if (!clubAuth.googleId) {
            clubAuth.googleId = profile.id;
            await clubAuth.save();
          }
          console.log("Found clubAuth:", clubAuth); // Log the clubAuth object
          return done(null, clubAuth); // This should trigger serializeUser
        } else {
          const newClubAuth = new ClubAuth({
            googleId: profile.id,
            email,
          });

          await newClubAuth.save();
          console.log("Created new clubAuth:", newClubAuth); // Log the new clubAuth object
          return done(null, newClubAuth); // This should trigger serializeUser
        }
      } catch (err) {
        console.error("Error during Google login:", err); // Log any errors
        return done(err, false);
      }
    }
  )
);

// Facebook Strategy for Club Auth
passport.use(
  "club-facebook",
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/club-auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails ? profile.emails[0].value : null;
        let clubAuth = await ClubAuth.findOne({
          $or: [{ facebookId: profile.id }, { email }],
        });

        if (clubAuth) {
          if (!clubAuth.facebookId) {
            clubAuth.facebookId = profile.id;
            await clubAuth.save();
          }
          return done(null, clubAuth);
        } else {
          const newClubAuth = new ClubAuth({
            facebookId: profile.id,
            email,
          });

          await newClubAuth.save();
          return done(null, newClubAuth);
        }
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// Serialize and Deserialize Club
// passport.js (or passportClub.js if separate)
passport.serializeUser((entity, done) => {
  const type = entity instanceof User ? "user" : "club";
  done(null, { id: entity.id, type }); // Store both id and type
});

passport.deserializeUser(async (obj, done) => {
  try {
    if (obj.type === "user") {
      const user = await User.findById(obj.id);
      done(null, user);
    } else if (obj.type === "club") {
      const clubAuth = await ClubAuth.findById(obj.id);
      done(null, clubAuth);
    }
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
