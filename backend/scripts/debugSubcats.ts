import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../src/config/db";
import Category from "../src/models/Category";
import SubCategory from "../src/models/SubCategory";
import HomeSection from "../src/models/HomeSection";

dotenv.config();

async function debug() {
  try {
    await connectDB();

    console.log("Searching for 'Vegetables' category...");
    // Use regex to be flexible
    const categories = await Category.find({ name: { $regex: /vegetable/i } });

    if (categories.length === 0) {
      console.log("No categories found matching 'vegetable'");
    } else {
      for (const cat of categories) {
        console.log(`Category: ${cat.name} (${cat._id})`);
        const subcats = await SubCategory.find({ category: cat._id });
        console.log(`  Subcategories found: ${subcats.length}`);
        subcats.forEach(s => console.log(`    - ${s.name} (${s._id})`));
      }
    }

    console.log("\nSearching HomeSections...");
    const sections = await HomeSection.find().populate("categories");
    for (const s of sections) {
      console.log(`Section: ${s.title}`);
      if (s.categories && s.categories.length > 0) {
        for (const c of s.categories) {
          // c might be populated or ID
          const anyC = c as any;
          if (anyC.name) {
            console.log(`  - Category: ${anyC.name} (${anyC._id})`);
          } else {
            console.log(`  - Category ID (unpopulated): ${anyC}`);
          }
        }
      } else {
        console.log("  No categories.");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

debug();
