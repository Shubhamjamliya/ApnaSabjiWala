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
  PRODUCTS: "barodamart/products",
  PRODUCT_GALLERY: "barodamart/products/gallery",
  CATEGORIES: "barodamart/categories",
  SUBCATEGORIES: "barodamart/subcategories",
  COUPONS: "barodamart/coupons",
  SELLERS: "barodamart/sellers",
  SELLER_PROFILE: "barodamart/sellers/profile",
  SELLER_DOCUMENTS: "barodamart/sellers/documents",
  DELIVERY: "barodamart/delivery",
  DELIVERY_DOCUMENTS: "barodamart/delivery/documents",
  STORES: "barodamart/stores",
  USERS: "barodamart/users",
} as const;
