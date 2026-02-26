import Notification from "../models/Notification";
import Admin from "../models/Admin";
import Seller from "../models/Seller";
import Customer from "../models/Customer";
import Delivery from "../models/Delivery";

/**
 * Send notification to specific user
 */
export const sendNotification = async (
  recipientType: "Admin" | "Seller" | "Customer" | "Delivery",
  recipientId: string,
  title: string,
  message: string,
  options?: {
    type?:
    | "Info"
    | "Success"
    | "Warning"
    | "Error"
    | "Order"
    | "Payment"
    | "System";
    link?: string;
    actionLabel?: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
    expiresAt?: Date;
    data?: Record<string, string>;
    idempotencyKey?: string;
  },
) => {
  try {
    // 1. Check for duplicates if idempotencyKey is provided
    if (options?.idempotencyKey) {
      const existing = await Notification.findOne({
        idempotencyKey: options.idempotencyKey,
      });
      if (existing) {
        console.log(`Duplicate notification suppressed: ${options.idempotencyKey}`);
        return existing;
      }
    } else {
      // Internal duplicate check: No same title/message to same user in last 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const recent = await Notification.findOne({
        recipientId,
        title,
        message,
        createdAt: { $gte: twoMinutesAgo },
      });
      if (recent) {
        console.log(`Similar notification sent recently to ${recipientId}. Suppressing.`);
        return recent;
      }
    }

    // 2. Create database record
    const notification = await Notification.create({
      recipientType,
      recipientId,
      title,
      message,
      type: options?.type || "Info",
      link: options?.link,
      actionLabel: options?.actionLabel,
      priority: options?.priority || "Medium",
      expiresAt: options?.expiresAt,
      data: options?.data,
      idempotencyKey: options?.idempotencyKey,
      isRead: false,
    });

    // 3. Send Push Notification via Firebase
    const { sendNotificationToUser } = await import("./firebaseAdmin");

    // Construct payload for FCM
    const payload = {
      title,
      body: message,
      data: {
        ...(options?.data || {}),
        type: options?.type || "Info",
        link: options?.link || "",
        notificationId: notification._id.toString(),
      }
    };

    const pushResponse = await sendNotificationToUser(
      recipientId,
      recipientType,
      payload
    );

    if (pushResponse) {
      notification.sentAt = new Date();
      await notification.save();
    }

    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    // Continue - don't crash the main process for notification failures
    return null;
  }
};

/**
 * Send notification to all users of a type
 */
export const sendBroadcastNotification = async (
  recipientType: "Admin" | "Seller" | "Customer" | "Delivery",
  title: string,
  message: string,
  options?: {
    type?:
    | "Info"
    | "Success"
    | "Warning"
    | "Error"
    | "Order"
    | "Payment"
    | "System";
    link?: string;
    actionLabel?: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
    expiresAt?: Date;
  },
) => {
  // Get all users of the specified type
  let userIds: string[] = [];

  switch (recipientType) {
    case "Admin":
      const admins = await Admin.find().select("_id");
      userIds = admins.map((a) => a._id.toString());
      break;
    case "Seller":
      const sellers = await Seller.find().select("_id");
      userIds = sellers.map((s) => s._id.toString());
      break;
    case "Customer":
      const customers = await Customer.find().select("_id");
      userIds = customers.map((c) => c._id.toString());
      break;
    case "Delivery":
      const deliveries = await Delivery.find().select("_id");
      userIds = deliveries.map((d) => d._id.toString());
      break;
  }

  // Create notifications for all users
  const notifications = await Promise.all(
    userIds.map((userId) =>
      Notification.create({
        recipientType,
        recipientId: userId,
        title,
        message,
        type: options?.type || "Info",
        link: options?.link,
        actionLabel: options?.actionLabel,
        priority: options?.priority || "Medium",
        expiresAt: options?.expiresAt,
        isRead: false,
      }),
    ),
  );

  return notifications;
};

/**
 * Send order status notification to Customer
 */
export const sendOrderStatusNotification = async (
  orderNo: string,
  orderId: string,
  customerId: string,
  status: string,
  total: number
) => {
  const statusMessages: Record<string, { title: string; body: string; data: any }> = {
    Processed: {
      title: "Order Confirmed!",
      body: `Your order #${orderNo} for ₹${total} is confirmed.`,
      data: { type: "ORDER", id: orderId }
    },
    Shipped: {
      title: "Out for Delivery",
      body: `Your order #${orderNo} is on its way.`,
      data: { type: "ORDER", id: orderId }
    },
    "Out for Delivery": {
      title: "Out for Delivery",
      body: `Your order #${orderNo} is out for delivery with our partner.`,
      data: { type: "ORDER", id: orderId }
    },
    Delivered: {
      title: "Freshness Delivered!",
      body: `Hope you enjoy your veggies! Rate your experience for order #${orderNo}.`,
      data: { type: "ORDER", id: orderId }
    },
    Cancelled: {
      title: "Order Cancelled",
      body: `Order #${orderNo} was cancelled. Refund processed to wallet.`,
      data: { type: "WALLET" }
    },
  };

  const statusInfo = statusMessages[status];
  if (!statusInfo) return;

  return sendNotification(
    "Customer",
    customerId,
    statusInfo.title,
    statusInfo.body,
    {
      type: "Order",
      link: `/orders/${orderId}`,
      priority: status === "Cancelled" ? "High" : "Medium",
      data: statusInfo.data,
      idempotencyKey: `order_status_${orderId}_${status}`
    },
  );
};

/**
 * Send New Order Notification to Seller
 */
export const sendNewOrderNotification = async (
  sellerId: string,
  orderId: string,
  orderNo: string,
  amount: number
) => {
  return sendNotification(
    "Seller",
    sellerId,
    "✨ New Order!",
    `You received a new order #${orderNo} for ₹${amount}.`,
    {
      type: "Order",
      link: `/orders/${orderId}`,
      priority: "High",
      data: { type: "NEW_ORDER", id: orderId },
      idempotencyKey: `new_order_${orderId}_${sellerId}`
    }
  );
};

/**
 * Send Task Available Notification to Delivery Partners
 */
export const sendTaskAvailableNotification = async (
  deliveryId: string,
  orderId: string,
  orderNo: string
) => {
  return sendNotification(
    "Delivery",
    deliveryId,
    "🚚 New Task Available",
    `A new delivery task #${orderNo} is available near you. Accept now!`,
    {
      type: "Order",
      link: `/delivery/orders/pending`,
      priority: "High",
      data: { type: "TASK", id: orderId },
      idempotencyKey: `task_avail_${orderId}_${deliveryId}`
    }
  );
}

/**
 * Send Withdrawal Request Notification to Admin
 */
export const sendWithdrawalRequestNotification = async (
  adminId: string,
  sellerName: string,
  amount: number,
  requestId: string
) => {
  return sendNotification(
    "Admin",
    adminId,
    "Payout Request",
    `${sellerName} requested a withdrawal of ₹${amount}.`,
    {
      type: "Payment",
      link: `/admin/withdrawals`,
      priority: "Medium",
      data: { type: "WITHDRAWAL", id: requestId },
      idempotencyKey: `withdrawal_${requestId}`
    }
  );
};

/**
 * Send product approval notification
 */
export const sendProductApprovalNotification = async (
  sellerId: string,
  productId: string,
  status: "Approved" | "Rejected",
  rejectionReason?: string,
) => {
  const title = status === "Approved" ? "Product Approved" : "Product Rejected";
  const message =
    status === "Approved"
      ? "Your product has been approved and is now live on the platform."
      : `Your product has been rejected. Reason: ${rejectionReason || "Not specified"
      }`;

  return sendNotification("Seller", sellerId, title, message, {
    type: status === "Approved" ? "Success" : "Error",
    link: `/products/${productId}`,
    priority: "Medium",
  });
};
