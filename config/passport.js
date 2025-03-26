const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const { Auth, User } = require("../models");
const bcrypt = require("bcryptjs");
const createOrUpdateCustomer = require("../helper/stripe/create-update-customer");

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        console.log("passport knows email? " + email);
        const auth = await Auth.findOne({ email: email });

        if (!auth) {
          return done(null, false, {
            message: "No account found with that email.",
          });
        }

        if (!auth?.isVerified) {
          return done(null, false, {
            message: "You have to confirm your email address before login",
          });
        }

        // If password comparison still fails, check their actual values
        const isMatch = bcrypt.compareSync(
          password.trim(),
          auth.password.trim()
        );

        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        const user = await User.findById(auth.user);
        return done(null, user);
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
        const email = profile?.emails?.[0]?.value;

        let auth = await Auth.findOne({
          $or: [{ googleId: profile.id }, { email }],
        });

        if (auth) {
          if (!auth.googleId) {
            auth.googleId = profile.id;
            await auth.save();
          }

          const user = await User.findById(auth.user);
          return done(null, user);
        } else {
          //create or update customer in stipe
          const stripeCustomerData = await createOrUpdateCustomer({
            firstName: profile?.name?.givenName,
            lastName: profile?.name?.familyName || "Unknown",
            email: email,
            customerId: null,
          });

          const newUser = new User({
            firstName: profile?.name?.givenName,
            lastName: profile?.name?.familyName || "Unknown",
            email,
            stripeCustomerId: stripeCustomerData?.status
              ? stripeCustomerData?.customerId
              : "",
          });
          await newUser.save();

          const newAuth = new Auth({
            googleId: profile?.id,
            email,
            user: newUser?._id,
            isVerified: true,
          });
          await newAuth.save();

          return done(null, newUser);
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Facebook Strategy
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
        const email = profile?.emails?.[0]?.value || null;

        let auth = await Auth.findOne({
          $or: [{ facebookId: profile?.id }, { username: email }],
        });

        if (auth) {
          if (!auth.facebookId) {
            auth.facebookId = profile?.id;
            await auth.save();
          }

          const user = await User.findById(auth?.user);
          return done(null, user);
        } else {
          //create or update customer in stipe
          const stripeCustomerData = await createOrUpdateCustomer({
            firstName: profile?.name?.givenName,
            lastName: profile?.name?.familyName || "Unknown",
            email: email,
            customerId: null,
          });

          const newUser = new User({
            firstName: profile?.name?.givenName,
            lastName: profile?.name?.familyName || "Unknown",
            email,
            stripeCustomerId: stripeCustomerData?.status
              ? stripeCustomerData?.customerId
              : "",
          });
          await newUser.save();

          const newAuth = new Auth({
            facebookId: profile?.id,
            username: email,
            user: newUser?._id,
            isVerified: true,
          });
          await newAuth.save();

          return done(null, newUser);
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;
