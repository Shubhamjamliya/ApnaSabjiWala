import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate configuration
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.warn("⚠️  Cloudinary credentials not found in environment variables");
}

export default cloudinary;

// Folder structure constants
export const CLOUDINARY_FOLDERS = {
  PRODUCTS: "apnasabjiwala/products",
  PRODUCT_GALLERY: "apnasabjiwala/products/gallery",
  CATEGORIES: "apnasabjiwala/categories",
  SUBCATEGORIES: "apnasabjiwala/subcategories",
  COUPONS: "apnasabjiwala/coupons",
  SELLERS: "apnasabjiwala/sellers",
  SELLER_PROFILE: "apnasabjiwala/sellers/profile",
  SELLER_DOCUMENTS: "apnasabjiwala/sellers/documents",
  DELIVERY: "apnasabjiwala/delivery",
  DELIVERY_DOCUMENTS: "apnasabjiwala/delivery/documents",
  STORES: "apnasabjiwala/stores",
  USERS: "apnasabjiwala/users",
} as const;
