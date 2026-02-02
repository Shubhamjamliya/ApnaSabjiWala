import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../src/config/db";
import Category from "../src/models/Category";

dotenv.config();

async function debug() {
  try {
    await connectDB();
    const childId = "694bb1cee56a2d681f83ed35";
    const cat = await Category.findById(childId).populate("parentId");
    console.log(`Category: ${cat?.name}`);
    console.log(`Parent: ${(cat?.parentId as any)?.name} (${(cat?.parentId as any)?._id})`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

debug();
