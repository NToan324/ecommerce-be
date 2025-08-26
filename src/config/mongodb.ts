import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

export default async function connectDB() {
  const url = process.env.MONGODB_URL || "";

  try {
    // Await the connection to ensure the app won't proceed without connecting
    await mongoose.connect(url);
    console.log(`MongoDB connected`);
  } catch (error) {
    console.error(`Error connecting to the database: ${error}`);
    process.exit(1); // Exit the process if unable to connect
  }

  const dbConnection = mongoose.connection;
  dbConnection.on("error", (err) => {
    console.error(`Connection failed: ${err.message}`);
  });
}
