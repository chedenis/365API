console.log("Starting server.js");

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const passport = require("passport");
const connectDB = require("./config/db");

console.log("Loading dotenv");

dotenv.config();

process.env.NODE_ENV = process.env.NODE_ENV || "development";
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

const app = express();

// Use helmet to secure the app by setting various HTTP headers
app.use(helmet());

// Set up rate limiter for sensitive routes: maximum of 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply rate limiter only to sensitive routes like authentication
app.use("/api/auth", limiter);
app.use("/api/club-auth", limiter);

// CORS configuration with logging
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_CORS_ORIGINS.split(",")
    : process.env.DEV_CORS_ORIGINS.split(",");

if (!allowedOrigins) {
  console.error("CORS origins are not defined");
} else {
  console.log("CORS origins are set to:", allowedOrigins);
}

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
    cookie: {
      secure: process.env.NODE_ENV === "production", // Secure cookie in production
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // SameSite for CSRF protection
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

connectDB();

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
