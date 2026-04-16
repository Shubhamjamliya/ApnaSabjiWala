import { Router } from "express";
import * as customerNotificationController from "../controllers/customerNotificationController";
import { authenticate, requireUserType } from "../../../middleware/auth";

const router = Router();

// All notification routes are protected and for customers only
router.use(authenticate, requireUserType("Customer"));

// Get customer's notifications
router.get("/", customerNotificationController.getMyNotifications);

// Mark a notification as read
router.patch("/:id/read", customerNotificationController.markNotificationAsRead);

// Mark all notifications as read
router.post("/mark-all-read", customerNotificationController.markAllAsRead);

export default router;
