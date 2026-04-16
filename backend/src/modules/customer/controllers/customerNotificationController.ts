import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Notification from "../../../models/Notification";

/**
 * Get notifications for the current customer
 */
export const getMyNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const customerId = req.user?.userId;

    const query = {
      $or: [
        { recipientType: "All" },
        { recipientType: "Customer", recipientId: customerId },
      ],
      $and: [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gte: new Date() } },
          ],
        },
      ],
    };

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Notification.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: notifications,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }
);

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const customerId = req.user?.userId;

    const notification = await Notification.findOne({
      _id: id,
      $or: [
        { recipientType: "All" },
        { recipientType: "Customer", recipientId: customerId },
      ],
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  }
);

/**
 * Mark all notifications as read for the current customer
 */
export const markAllAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const customerId = req.user?.userId;

    const query = {
      $or: [
        { recipientType: "All" },
        { recipientType: "Customer", recipientId: customerId },
      ],
      isRead: false,
    };

    await Notification.updateMany(query, {
      isRead: true,
      readAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  }
);
