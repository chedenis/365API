console.log("Starting server.js");

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const passport = require("passport");
const connectDB = require("./config/db");
const MongoStore = require("connect-mongo");
const { Club, User, ClubAuth, Auth } = require("./models"); // Register models

// Load environment variables
dotenv.config();
process.env.NODE_ENV = process.env.NODE_ENV || "development";
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

console.log(`Environment: ${process.env.NODE_ENV}`);
console.log("Initializing database connection...");

const app = express();

// Trust Render proxy
app.set("trust proxy", 1);

// Apply security headers
app.use(helmet());

// CORS configuration
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_CORS_ORIGINS.split(",")
    : process.env.DEV_CORS_ORIGINS.split(",");

if (!allowedOrigins) {
  console.error("CORS origins are not defined");
} else {
  console.log("CORS allowed origins:", allowedOrigins);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`Blocked by CORS: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

// Apply rate limiter to sensitive routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api/auth", limiter);
app.use("/api/club-auth", limiter);

// Stripe webhook route with express.raw() for Stripe signature verification
const stripeRoutes = require("./routes/stripe");
app.use("/api/stripe", stripeRoutes);

// Apply JSON and URL-encoded body parsing for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize session handling with MongoDB store
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 14 * 24 * 60 * 60, // 14 days expiration
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 48, // 48 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Load Passport strategies
require("./config/passport"); // General user authentication strategies
require("./config/passportClub"); // Club authentication strategies

// General request logging middleware
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Handle HEAD requests without sending a response body
app.head("/", (req, res) => {
  res.status(200).end();
});

// Define routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const clubRoutes = require("./routes/club");
const clubAuthRoutes = require("./routes/clubAuth");

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/club", clubRoutes);
app.use("/api/club-auth", clubAuthRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Connect to MongoDB and start the server
(async () => {
  try {
    await connectDB();
    console.log("MongoDB connected successfully");

    // Start the server after successful database connection
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
      );
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1); // Exit process if the database connection fails
  }
})();

module.exports = app;
