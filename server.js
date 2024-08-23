console.log("Starting server.js");

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

console.log("Loading dotenv");

dotenv.config();

process.env.NODE_ENV = process.env.NODE_ENV || "development";
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Google Client Secret:", process.env.GOOGLE_CLIENT_SECRET);
console.log("Facebook App ID:", process.env.FACEBOOK_APP_ID);
console.log("Facebook App Secret:", process.env.FACEBOOK_APP_SECRET);

const app = express();

// Use helmet to secure the app by setting various HTTP headers
app.use(helmet());

// Set up rate limiter: maximum of 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply rate limiter to all requests
app.use(limiter);

// CORS configuration
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_CORS_ORIGINS.split(",")
    : process.env.DEV_CORS_ORIGINS.split(",");

app.use(
  cors({
    origin: allowedOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport and session handling
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const facilityRoutes = require("./routes/facility");
const facilityAuthRoutes = require("./routes/facilityAuth");

connectDB();

// Define routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/facility", facilityRoutes);
app.use("/api/facility-auth", facilityAuthRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`
  );
});
