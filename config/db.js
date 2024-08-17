// config/db.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = async () => {
  const maxRetries = 5; // Maximum number of retries
  let retries = 0;
  const retryDelay = 2000; // Delay between retries in milliseconds (2 seconds)

  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
      });
      console.log("MongoDB connected successfully");

      // Perform a test query to verify the connection
      const admin = new mongoose.mongo.Admin(mongoose.connection.db);
      admin.listDatabases((err, result) => {
        if (err) {
          console.error("Error listing databases", err);
        } else {
          console.log("Databases:", result.databases);
        }
      });
      break; // Break out of the loop on successful connection
    } catch (err) {
      retries += 1;
      console.error(
        `Error connecting to MongoDB (attempt ${retries}/${maxRetries}):`,
        err
      );

      if (retries < maxRetries) {
        console.log(`Retrying to connect in ${retryDelay / 1000} seconds...`);
        await new Promise((res) => setTimeout(res, retryDelay)); // Wait for 2 seconds before retrying
      } else {
        console.error("Could not connect to MongoDB after multiple attempts.");
        process.exit(1); // Exit the process with failure
      }
    }
  }
};

module.exports = connectDB;
