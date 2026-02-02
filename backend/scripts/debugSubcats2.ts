import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../src/config/db";
import Category from "../src/models/Category";
import SubCategory from "../src/models/SubCategory";
import Product from "../src/models/Product";

dotenv.config();

async function debug() {
  try {
    await connectDB();

    console.log("Listing ALL Subcategories:");
    const subcats = await SubCategory.find().populate("category", "name");
    console.log(`Total Subcategories: ${subcats.length}`);
    if (subcats.length > 0) {
      subcats.forEach(s => {
        const catName = (s.category as any)?.name || "UNKNOWN_CATEGORY";
        const catId = (s.category as any)?._id || s.category;
        console.log(`- ${s.name} (Parent: ${catName} [${catId}])`);
      });
    }

    console.log("\nChecking Products under 'Vegetables' (694bb1cee56a2d681f83ed31)...");
    const vegId = "694bb1cee56a2d681f83ed31";
    const products = await Product.find({ category: vegId });
    console.log(`Total Products under Vegetables: ${products.length}`);
    products.slice(0, 5).forEach(p => console.log(` - ${p.productName} (Subcat: ${p.subcategory})`));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

debug();
