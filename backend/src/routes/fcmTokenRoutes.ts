import { Router, Request, Response } from "express";
import { sendPushNotification } from "../services/firebaseAdmin";
import Customer from "../models/Customer";
import Admin from "../models/Admin";
import Seller from "../models/Seller";
import Delivery from "../models/Delivery";

const router = Router();

const userModels = [Customer, Admin, Seller, Delivery];

const getUserModel = (userType: string) => {
  switch (userType) {
    case "Customer":
      return Customer;
    case "Admin":
      return Admin;
    case "Seller":
      return Seller;
    case "Delivery":
      return Delivery;
    default:
      return null;
  }
};

/**
 * Save FCM token for authenticated user
 * POST /api/v1/fcm-tokens/save
 * Body: { token: string, platform: 'web' | 'app' }
 */
router.post("/save", async (req: Request, res: Response): Promise<void> => {
  try {
    const { platform = "web" } = req.body;
    const token = req.body.token || req.body.fcmToken;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    if (typeof token !== "string" || !token.trim()) {
      res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
      return;
    }

    if (!userId || !userType) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (platform !== "web" && platform !== "app") {
      res.status(400).json({
        success: false,
        message: 'Platform must be either "web" or "app"',
      });
      return;
    }

    const UserModel = getUserModel(userType);
    if (!UserModel) {
      res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
      return;
    }

    const normalizedToken = token.trim();

    const user = await UserModel.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // One Firebase device token must belong to only one authenticated account.
    // Remove stale ownership across every role before assigning it below.
    await Promise.all(
      userModels.map((model) =>
        model.updateMany(
          {
            $or: [
              { fcmTokens: normalizedToken },
              { fcmTokenMobile: normalizedToken },
            ],
          },
          {
            $pull: {
              fcmTokens: normalizedToken,
              fcmTokenMobile: normalizedToken,
            },
          },
        )
      )
    );

    // Keep this loaded document in sync with the cleanup before assigning it
    // to the requested platform and saving.
    user.fcmTokens = (user.fcmTokens || []).filter(
      (savedToken: string) => savedToken !== normalizedToken,
    );
    user.fcmTokenMobile = (user.fcmTokenMobile || []).filter(
      (savedToken: string) => savedToken !== normalizedToken,
    );

    // Add token to appropriate array based on platform
    if (platform === "web") {
      if (!user.fcmTokens) {
        user.fcmTokens = [];
      }
      // Only add if not already present
      if (!user.fcmTokens.includes(normalizedToken)) {
        user.fcmTokens.push(normalizedToken);
        // Limit to 10 tokens per platform
        if (user.fcmTokens.length > 10) {
          user.fcmTokens = user.fcmTokens.slice(-10);
        }
      }
    } else if (platform === "app") {
      if (!user.fcmTokenMobile) {
        user.fcmTokenMobile = [];
      }
      if (!user.fcmTokenMobile.includes(normalizedToken)) {
        user.fcmTokenMobile.push(normalizedToken);
        if (user.fcmTokenMobile.length > 10) {
          user.fcmTokenMobile = user.fcmTokenMobile.slice(-10);
        }
      }
    }

    await user.save();

    console.log(
      `✅ FCM token saved for ${userType} user ${userId} (${platform})`,
    );

    res.json({
      success: true,
      message: "FCM token saved successfully",
      platform,
    });
  } catch (error: any) {
    console.error("Error saving FCM token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save FCM token",
      error: error.message,
    });
  }
});

/**
 * Remove FCM token for authenticated user
 * DELETE /api/v1/fcm-tokens/remove
 * Body: { token: string, platform: 'web' | 'app' }
 */
router.delete("/remove", async (req: Request, res: Response): Promise<void> => {
  try {
    const { platform = "web" } = req.body;
    const token = req.body.token || req.body.fcmToken;
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    if (typeof token !== "string" || !token.trim()) {
      res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
      return;
    }

    if (!userId || !userType) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (platform !== "web" && platform !== "app") {
      res.status(400).json({
        success: false,
        message: 'Platform must be either "web" or "app"',
      });
      return;
    }

    const UserModel = getUserModel(userType);
    if (!UserModel) {
      res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
      return;
    }

    const normalizedToken = token.trim();
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        $pull: {
          // Remove from both arrays so logout also cleans up tokens that were
          // previously registered with the wrong platform value.
          fcmTokens: normalizedToken,
          fcmTokenMobile: normalizedToken,
        },
      },
      { new: true },
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    console.log(
      `✅ FCM token removed for ${userType} user ${userId} (${platform})`,
    );

    res.json({
      success: true,
      message: "FCM token removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing FCM token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove FCM token",
      error: error.message,
    });
  }
});

/**
 * Send test notification to authenticated user
 * POST /api/v1/fcm-tokens/test
 */
router.post("/test", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userType = req.user?.userType;

    if (!userId || !userType) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    // Dynamically import the appropriate model
    let UserModel: any;
    switch (userType) {
      case "Customer":
        UserModel = (await import("../models/Customer")).default;
        break;
      case "Admin":
        UserModel = (await import("../models/Admin")).default;
        break;
      case "Seller":
        UserModel = (await import("../models/Seller")).default;
        break;
      case "Delivery":
        UserModel = (await import("../models/Delivery")).default;
        break;
      default:
        res.status(400).json({
          success: false,
          message: "Invalid user type",
        });
        return;
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Collect all tokens
    const tokens = [...(user.fcmTokens || []), ...(user.fcmTokenMobile || [])];

    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      res.json({
        success: false,
        message:
          "No FCM tokens found for this user. Please register a token first.",
      });
      return;
    }

    // Send test notification
    const response = await sendPushNotification(uniqueTokens, {
      title: "🔔 Test Notification",
      body: "This is a test push notification from BarodaMart!",
      data: {
        type: "test",
        timestamp: new Date().toISOString(),
        link: "/",
      },
      icon: "/favicon.png",
    });

    console.log(`✅ Test notification sent to ${userType} user ${userId}`);

    res.json({
      success: true,
      message: "Test notification sent successfully",
      details: {
        totalTokens: uniqueTokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
      },
    });
  } catch (error: any) {
    console.error("Error sending test notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test notification",
      error: error.message,
    });
  }
});

export default router;
