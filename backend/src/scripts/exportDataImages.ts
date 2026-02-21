import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load models
import Category from '../models/Category';
import SubCategory from '../models/SubCategory';
import Product from '../models/Product';
import HeaderCategory from '../models/HeaderCategory';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ApnaSabjiWala';

async function exportImagesData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    // 1. Export Header Categories
    console.log('Fetching Header Categories...');
    const headerCategories = await HeaderCategory.find({});
    const headerData = headerCategories.map(h => ({
      name: h.name,
      slug: h.slug,
      image: (h as any).image // Checking if it exists
    }));

    // 2. Export Categories
    console.log('Fetching Categories...');
    const categories = await Category.find({}).populate('headerCategoryId');
    const categoryData = categories.map(c => ({
      name: c.name,
      slug: c.slug,
      image: c.image,
      headerCategory: (c.headerCategoryId as any)?.name || null
    }));

    // 3. Export SubCategories
    console.log('Fetching SubCategories...');
    const subCategories = await SubCategory.find({}).populate('category');
    const subCategoryData = subCategories.map(s => ({
      name: s.name,
      image: s.image,
      category: (s.category as any)?.name || null
    }));

    // 4. Export Products
    console.log('Fetching Products...');
    const products = await Product.find({}).populate('category subcategory');
    const productData = products.map(p => ({
      name: p.productName,
      mainImage: p.mainImage,
      galleryImages: p.galleryImages,
      category: (p.category as any)?.name || null,
      subcategory: (p.subcategory as any)?.name || null
    }));

    const finalData = {
      headerCategories: headerData,
      categories: categoryData,
      subCategories: subCategoryData,
      products: productData,
      exportedAt: new Date().toISOString()
    };

    const outputPath = path.join(__dirname, '../../all_data_images_backup.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));

    console.log(`Successfully exported data to ${outputPath}`);
    console.log(`Summary:`);
    console.log(`- Header Categories: ${headerData.length}`);
    console.log(`- Categories: ${categoryData.length}`);
    console.log(`- SubCategories: ${subCategoryData.length}`);
    console.log(`- Products: ${productData.length}`);

  } catch (error) {
    console.error('Error during export:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

exportImagesData();
