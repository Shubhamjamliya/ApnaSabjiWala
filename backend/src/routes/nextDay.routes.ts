import express from "express";
import {
  getNextDaySlots,
  getNextDayProducts,
  placeNextDayOrder,
  createDailySlots,
  getNextDayContent,
  getSellerNextDayOrders,
  getSellerNextDayOrderById,
  updateSellerNextDayOrderStatus,
} from "../controllers/nextDayController";
import { authenticate as protect, requireUserType } from "../middleware/auth"; // Corrected import based on index.ts usage

const router = express.Router();

// Middleware helper for Admin check
const admin = requireUserType("Admin");
const seller = requireUserType("Seller");

// Public / User Routes
router.get("/slots", getNextDaySlots);
router.get("/products", getNextDayProducts);
router.get("/content", getNextDayContent);
router.post("/order", protect, requireUserType("Customer"), placeNextDayOrder);

// Seller Routes
router.get("/seller/orders", protect, seller, getSellerNextDayOrders);
router.get("/seller/orders/:id", protect, seller, getSellerNextDayOrderById);
router.patch("/seller/orders/:id/status", protect, seller, updateSellerNextDayOrderStatus);

// Admin Routes
router.post("/admin/slots", protect, admin, createDailySlots);

export default router;
