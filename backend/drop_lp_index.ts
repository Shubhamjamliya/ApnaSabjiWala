import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, ".env") });

async function dropIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");

    // Access the lowestpricesproducts collection
    const collection = mongoose.connection.collection("lowestpricesproducts");
    
    await collection.dropIndex("product_1").catch(() => console.log("Index product_1 not found or already dropped."));

    console.log("Old index dropped successfully.");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

dropIndex();
