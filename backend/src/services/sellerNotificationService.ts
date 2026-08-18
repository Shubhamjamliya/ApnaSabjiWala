import { Server as SocketIOServer } from 'socket.io';
import OrderItem from '../models/OrderItem';
import Order from '../models/Order';
import mongoose from 'mongoose';

export interface SellerOrderNotificationPayload {
    type: 'NEW_ORDER' | 'STATUS_UPDATE' | 'ORDER_CANCELLED';
    orderId: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    customer: { name: string; email: string; phone: string; address: any };
    items: Array<{
        productName: string;
        quantity: number;
        price: number;
        total: number;
        variation?: string;
    }>;
    totalAmount: number;
    timestamp: Date;
}

const buildSellerNotification = (
    order: any,
    sellerItems: any[],
    type: SellerOrderNotificationPayload['type'],
): SellerOrderNotificationPayload => ({
    type,
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    customer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        address: order.deliveryAddress,
    },
    items: sellerItems.map((item: any) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.unitPrice,
        total: item.total,
        variation: item.variation,
    })),
    totalAmount: sellerItems.reduce(
        (amount: number, item: any) => amount + (Number(item.total) || 0),
        0,
    ),
    timestamp: order.orderDate || order.createdAt || new Date(),
});

/** Orders that still require this seller to accept or reject them. */
export async function getPendingSellerOrderNotifications(
    sellerId: string,
): Promise<SellerOrderNotificationPayload[]> {
    if (!mongoose.Types.ObjectId.isValid(sellerId)) return [];

    const orderIds = await OrderItem.find({ seller: sellerId }).distinct('order');
    if (orderIds.length === 0) return [];

    const orders = await Order.find({
        _id: { $in: orderIds },
        $or: [
            { status: 'Received' },
            { status: 'Pending', paymentStatus: 'Paid' },
        ],
    })
        .sort({ orderDate: 1 })
        .limit(50)
        .lean();

    if (orders.length === 0) return [];

    const sellerItems = await OrderItem.find({
        seller: sellerId,
        order: { $in: orders.map(order => order._id) },
    }).lean();

    const itemsByOrder = new Map<string, any[]>();
    sellerItems.forEach((item: any) => {
        const orderId = String(item.order);
        const items = itemsByOrder.get(orderId) || [];
        items.push(item);
        itemsByOrder.set(orderId, items);
    });

    return orders.map(order =>
        buildSellerNotification(
            order,
            itemsByOrder.get(String(order._id)) || [],
            'NEW_ORDER',
        ),
    );
}

/**
 * Notify all sellers involved in an order about a new order or status change
 */
export async function notifySellersOfOrderUpdate(
    io: SocketIOServer,
    order: any,
    type: 'NEW_ORDER' | 'STATUS_UPDATE' | 'ORDER_CANCELLED'
): Promise<void> {
    try {
        if (!io) {
            console.error('Socket.io server not provided to notifySellersOfOrderUpdate');
            return;
        }

        // Get all unique seller IDs from order items
        // If items are populated, we can get them directly, otherwise we need to query
        let orderItems = Array.isArray(order.items) ? order.items : [];

        // If items are just IDs or empty, fetch the full OrderItem details
        if (orderItems.length === 0 || typeof orderItems[0] === 'string' || orderItems[0] instanceof mongoose.Types.ObjectId) {
            orderItems = await OrderItem.find({ order: order._id });
        }

        // Safer seller ID extraction: handle cases where seller could be a string, ObjectId or populated object
        const sellerIds = [...new Set(
            orderItems
                .map((item: any) => {
                    if (!item.seller) return null;
                    return item.seller._id ? item.seller._id.toString() : item.seller.toString();
                })
                .filter((id: string | null) => !!id)
        )] as string[];

        console.log(`🔔 Notifying ${sellerIds.length} sellers about ${type} for order ${order.orderNumber}`);

        for (const sellerId of sellerIds) {
            // Get only items belonging to this seller
            const sellerSpecificItems = orderItems.filter((item: any) => {
                const itemSellerId = item.seller?._id ? item.seller._id.toString() : item.seller?.toString();
                return itemSellerId === sellerId;
            });

            const notificationData = buildSellerNotification(order, sellerSpecificItems, type);

            // Emit to seller-specific room
            io.to(`seller-${sellerId}`).emit('seller-notification', notificationData);
            console.log(`📤 Emitted notification to seller-${sellerId}`);
        }
    } catch (error) {
        console.error('Error in notifySellersOfOrderUpdate:', error);
    }
}
