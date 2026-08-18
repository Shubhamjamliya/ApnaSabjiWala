import { Router } from "express";
import adminAuthRoutes from "./adminAuthRoutes";
import sellerAuthRoutes from "./sellerAuthRoutes";
import dashboardRoutes from "./dashboardRoutes";
import customerAuthRoutes from "./customerAuthRoutes";
import deliveryRoutes from "./deliveryRoutes";
import deliveryAuthRoutes from "./deliveryAuthRoutes";

import { authenticate, requireUserType } from "../middleware/auth";
import customerRoutes from "./customerRoutes";
import sellerRoutes from "./sellerRoutes";
import uploadRoutes from "./uploadRoutes";
import productRoutes from "./productRoutes";
import headerCategoryRoutes from "./headerCategoryRoutes";
import categoryRoutes from "./categoryRoutes";
import orderRoutes from "./orderRoutes";
import returnRoutes from "./returnRoutes";
import reportRoutes from "./reportRoutes";
import walletRoutes from "./walletRoutes";
import taxRoutes from "./taxRoutes";
import customerProductRoutes from "./customerProductRoutes";
import customerCategoryRoutes from "./customerCategoryRoutes";
import customerCouponRoutes from "./customerCouponRoutes";
import customerAddressRoutes from "./customerAddressRoutes";
import customerHomeRoutes from "./customerHomeRoutes";
import customerCartRoutes from "./customerCartRoutes";
import wishlistRoutes from "./wishlistRoutes";
import productReviewRoutes from "./productReviewRoutes";
import adminRoutes from "./adminRoutes";
import customerTrackingRoutes from "../modules/customer/routes/trackingRoutes";
import deliveryTrackingRoutes from "../modules/delivery/routes/trackingRoutes";
import fcmTokenRoutes from "./fcmTokenRoutes";
import paymentRoutes from "./paymentRoutes";
import sellerWalletRoutes from "./sellerWalletRoutes";
import deliveryWalletRoutes from "./deliveryWalletRoutes";
import adminWithdrawalRoutes from "./adminWithdrawalRoutes";
import nextDayRoutes from "./nextDay.routes";
import adminRewardRoutes from "./adminRewardRoutes";
import customerRewardRoutes from "./customerRewardRoutes";
import customerNotificationRoutes from "../modules/customer/routes/notificationRoutes";
import adminPaymentRoutes from "./adminPaymentRoutes";
import AppSettings from "../models/AppSettings";

import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderNotes,
} from "../modules/customer/controllers/customerOrderController";

const router = Router();

// Health check route
router.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    message: "API is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Public App Settings
router.get("/app-settings", async (_req, res) => {
  try {
    const settings = await AppSettings.getSettings();
    res.json({
      success: true,
      data: {
        appName: settings.appName || "BarodaMart",
        appLogo: settings.appLogo || "",
        userLogo: settings.userLogo || settings.appLogo || "",
        adminLogo: settings.adminLogo || "",
        sellerLogo: settings.sellerLogo || "",
        deliveryLogo: settings.deliveryLogo || "",
        modules: settings.modules,
        appPolicies: settings.appPolicies,
        appTerms: settings.appTerms,
        appSupport: settings.appSupport,
        needHelpSettings: settings.needHelpSettings,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching app settings" });
  }
});

// Authentication routes
router.use("/auth/admin", adminAuthRoutes);
router.use("/auth/seller", sellerAuthRoutes);
router.use("/auth/customer", customerAuthRoutes);
router.use("/auth/delivery", deliveryAuthRoutes);

// FCM Token routes (protected - requires authentication)
router.use("/fcm-tokens", authenticate, fcmTokenRoutes);

// Delivery routes (protected)
router.use(
  "/delivery",
  authenticate,
  requireUserType("Delivery"),
  deliveryRoutes
);
router.use(
  "/delivery",
  authenticate,
  requireUserType("Delivery"),
  deliveryTrackingRoutes
);

// Customer routes - Specific routes MUST be registered before general /customer route
router.use("/customer/products", customerProductRoutes);
router.use("/customer/categories", customerCategoryRoutes);

// Next Day Booking Routes
router.use("/next-day", nextDayRoutes);

// Tracking routes
router.use("/customer", customerTrackingRoutes);

// Customer orders route - direct registration
router.post(
  "/customer/orders",
  authenticate,
  requireUserType("Customer"),
  createOrder
);
router.get("/customer/orders", authenticate, requireUserType("Customer"), getMyOrders);
router.get("/customer/orders/:id", authenticate, requireUserType("Customer"), getOrderById);
router.post("/customer/orders/:id/cancel", authenticate, requireUserType("Customer"), cancelOrder);
router.patch("/customer/orders/:id/notes", authenticate, requireUserType("Customer"), updateOrderNotes);

router.use("/customer/coupons", customerCouponRoutes);
router.use("/customer/addresses", customerAddressRoutes);
router.use("/customer/home", customerHomeRoutes);
router.use("/customer/cart", customerCartRoutes);
router.use("/customer/wishlist", wishlistRoutes);
router.use("/customer/reviews", productReviewRoutes);
router.use("/customer/rewards", customerRewardRoutes);
router.use("/customer/notifications", customerNotificationRoutes);

// General customer route
router.use("/customer", customerRoutes);

// Seller dashboard routes
router.use("/seller/dashboard", dashboardRoutes);

// Seller management routes (protected, admin only)
router.use("/sellers", sellerRoutes);

// Admin routes (protected, admin only)
router.use("/admin/payments", authenticate, requireUserType("Admin"), adminPaymentRoutes);
router.use("/admin/rewards", authenticate, requireUserType("Admin"), adminRewardRoutes);
router.use("/admin", adminRoutes);

// Upload routes (protected)
router.use("/upload", uploadRoutes);

// Product routes (protected, seller only)
router.use("/products", productRoutes);

// Category routes (protected, seller/admin)
router.use("/categories", categoryRoutes);

// Header Category Routes
router.use("/header-categories", headerCategoryRoutes);

// Order routes (protected, seller only)
router.use("/orders", orderRoutes);

// Return routes (protected, seller only)
router.use("/returns", returnRoutes);

// Report routes (protected, seller only)
router.use("/seller/reports", reportRoutes);

// Wallet routes (protected, seller only)
router.use("/seller/wallet", walletRoutes);

// Tax routes (protected, seller/admin)
router.use("/seller/taxes", taxRoutes);

// Payment routes (Razorpay integration)
router.use("/payment", paymentRoutes);

// Seller wallet routes (protected, seller only)
router.use("/seller/wallet-new", authenticate, requireUserType("Seller"), sellerWalletRoutes);

// Delivery wallet routes (protected, delivery only)
router.use("/delivery/wallet", authenticate, requireUserType("Delivery"), deliveryWalletRoutes);

// Admin withdrawal management routes (protected, admin only)
router.use("/admin/withdrawals", authenticate, requireUserType("Admin"), adminWithdrawalRoutes);

export default router;
