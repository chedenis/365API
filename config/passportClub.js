const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const ClubAuth = require("../models/ClubAuth");
const PendingClub = require("../models/PendingClub");
const bcrypt = require("bcryptjs");

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
        let clubAuth = await ClubAuth.findOne({
          $or: [{ googleId: profile.id }, { email }],
        });

        if (clubAuth) {
          if (!clubAuth.googleId) {
            clubAuth.googleId = profile.id;
            await clubAuth.save();
          }
          return done(null, clubAuth);
        } else {
          const newPendingClub = new PendingClub({ email });
          const savedPendingClub = await newPendingClub.save();

          const newClubAuth = new ClubAuth({
            googleId: profile.id,
            email,
            pendingClub: savedPendingClub._id,
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
          const newPendingClub = new PendingClub({ email });
          const savedPendingClub = await newPendingClub.save();

          const newClubAuth = new ClubAuth({
            facebookId: profile.id,
            email,
            pendingClub: savedPendingClub._id,
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
passport.serializeUser((clubAuth, done) => {
  done(null, clubAuth.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const clubAuth = await ClubAuth.findById(id);
    done(null, clubAuth);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
