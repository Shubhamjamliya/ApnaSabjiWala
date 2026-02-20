import express from "express";
import {
  getNextDaySlots,
  getNextDayProducts,
  placeNextDayOrder,
  createDailySlots,
  getNextDayContent,
} from "../controllers/nextDayController";
import { authenticate as protect, requireUserType } from "../middleware/auth"; // Corrected import based on index.ts usage

const router = express.Router();

// Middleware helper for Admin check
const admin = requireUserType("Admin");

// Public / User Routes
router.get("/slots", getNextDaySlots);
router.get("/products", getNextDayProducts);
router.get("/content", getNextDayContent);
router.post("/order", protect, placeNextDayOrder);

// Admin Routes
router.post("/admin/slots", protect, admin, createDailySlots);

export default router;
