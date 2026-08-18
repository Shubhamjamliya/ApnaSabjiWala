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
        type: options?.data?.type || options?.type || "Info",
        notificationType: options?.type || "Info",
        link: options?.link || "",
        notificationId: notification._id.toString(),
      }
    };

    const pushResponse = await sendNotificationToUser(
      recipientId,
      recipientType,
      payload
    );

    // Failure results are still objects, so only record a real delivery.
    if (pushResponse.successCount > 0) {
      notification.sentAt = new Date();
      await notification.save();
    } else {
      console.warn(
        `Push notification ${notification._id} was saved but not delivered: ${pushResponse.error || "all device deliveries failed"}`,
      );
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
    Received: {
      title: "Order Placed! 🛒",
      body: `Your order #${orderNo} for ₹${total} has been received.`,
      data: { type: "ORDER", id: orderId }
    },
    Accepted: {
      title: "Order Accepted! 👨‍🍳",
      body: `The store has accepted your order #${orderNo} and is preparing it.`,
      data: { type: "ORDER", id: orderId }
    },
    Processed: {
      title: "Order Confirmed! ✅",
      body: `Your order #${orderNo} for ₹${total} is confirmed and packed.`,
      data: { type: "ORDER", id: orderId }
    },
    "Ready for pickup": {
      title: "Order Ready! 📦",
      body: `Your order #${orderNo} is packed and ready for delivery partner pickup.`,
      data: { type: "ORDER", id: orderId }
    },
    "Picked up": {
      title: "Order Picked Up! 🛵",
      body: `Delivery partner has picked up your order #${orderNo}.`,
      data: { type: "ORDER", id: orderId }
    },
    "Picked Up": {
      title: "Order Picked Up! 🛵",
      body: `Delivery partner has picked up your order #${orderNo}.`,
      data: { type: "ORDER", id: orderId }
    },
    Shipped: {
      title: "Out for Delivery 🚚",
      body: `Your order #${orderNo} is on its way.`,
      data: { type: "ORDER", id: orderId }
    },
    "On the way": {
      title: "Out for Delivery 🚚",
      body: `Your order #${orderNo} is on its way to you.`,
      data: { type: "ORDER", id: orderId }
    },
    "Out for Delivery": {
      title: "Out for Delivery 🚚",
      body: `Your order #${orderNo} is out for delivery with our partner.`,
      data: { type: "ORDER", id: orderId }
    },
    Delivered: {
      title: "Freshness Delivered! 🎉",
      body: `Hope you enjoy your veggies! Rate your experience for order #${orderNo}.`,
      data: { type: "ORDER", id: orderId }
    },
    Cancelled: {
      title: "Order Cancelled ❌",
      body: `Order #${orderNo} was cancelled. Refund processed to wallet if applicable.`,
      data: { type: "WALLET" }
    },
    "Cancelled by Seller": {
      title: "Order Cancelled by Store ❌",
      body: `Store was unable to fulfill order #${orderNo}. Refund processed to wallet.`,
      data: { type: "WALLET" }
    },
    Rejected: {
      title: "Order Rejected ❌",
      body: `Order #${orderNo} could not be accepted at this time.`,
      data: { type: "WALLET" }
    },
    Returned: {
      title: "Order Returned 📦",
      body: `Return processed for order #${orderNo}.`,
      data: { type: "ORDER", id: orderId }
    }
  };

  const statusInfo = statusMessages[status] || {
    title: `Order Update: ${status}`,
    body: `Your order #${orderNo} status is now ${status}.`,
    data: { type: "ORDER", id: orderId }
  };

  return sendNotification(
    "Customer",
    customerId,
    statusInfo.title,
    statusInfo.body,
    {
      type: "Order",
      link: `/orders/${orderId}`,
      priority: status === "Cancelled" || status === "Cancelled by Seller" ? "High" : "Medium",
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
      link: `/seller/orders/${orderId}`,
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
