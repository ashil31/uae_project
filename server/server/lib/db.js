// In your db.js file (or wherever your connection code is)
import mongoose from 'mongoose';
import dotenv from 'dotenv'

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting MongoDB: ${error.message}`);
    process.exit(1);
  }
};


export default connectDB;