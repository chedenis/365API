const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors"); // Import the cors middleware
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const facilityRoutes = require("./routes/facility");
const facilityAuthRoutes = require("./routes/facilityAuth");

dotenv.config();

const app = express();

// Use CORS middleware
app.use(
  cors({
    origin: [
      "http://localhost:8081",
      "http://10.0.2.2:8081",
      "http://localhost:3000",
    ], // Replace with the frontend origin you are using
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Enable this if you need to send cookies or authorization headers
  })
);
app.use(express.json());
app.use(bodyParser.json());

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/facility", facilityRoutes);
app.use("/api/facility-auth", facilityAuthRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
