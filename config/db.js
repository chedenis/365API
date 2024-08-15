// config/db.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');

    // Perform a test query to verify the connection
    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    admin.listDatabases((err, result) => {
      if (err) {
        console.error('Error listing databases', err);
      } else {
        console.log('Databases:', result.databases);
      }
    });
  } catch (err) {
    console.error('Error connecting to MongoDB', err);
    process.exit(1);
  }
};

module.exports = connectDB;
