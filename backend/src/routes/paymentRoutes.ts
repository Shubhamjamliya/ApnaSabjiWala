import { Router } from 'express';
import { authenticate, requireUserType } from '../middleware/auth';
import { Request, Response } from 'express';
import { createRazorpayOrder, capturePayment, handleWebhook } from '../services/paymentService';
import Order from '../models/Order';

const router = Router();

/**
 * Create Razorpay order for payment
 */
router.post('/create-order', authenticate, requireUserType('Customer'), async (req: Request, res: Response) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required',
            });
        }

        const order = await Order.findById(orderId);

        let totalToPay = 0;
        let customerId;

        if (order) {
            totalToPay = order.total;
            customerId = order.customer.toString();
        } else {
            const NextDayOrder = (await import("../models/NextDayOrder")).default;
            const ndOrder = await NextDayOrder.findById(orderId);
            if (!ndOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found',
                });
            }
            totalToPay = ndOrder.total;
            customerId = ndOrder.customer.toString();
        }

        // Verify order belongs to customer
        if (customerId !== req.user!.userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access to order',
            });
        }

        const result = await createRazorpayOrder(orderId, totalToPay);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Error creating Razorpay order:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create payment order',
        });
    }
});

/**
 * Verify payment after Razorpay checkout
 */
router.post('/verify', authenticate, requireUserType('Customer'), async (req: Request, res: Response) => {
    try {
        const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: 'Missing required payment verification parameters',
            });
        }

        const order = await Order.findById(orderId);

        let customerId;

        if (order) {
            customerId = order.customer.toString();
        } else {
            const NextDayOrder = (await import("../models/NextDayOrder")).default;
            const ndOrder = await NextDayOrder.findById(orderId);
            if (!ndOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found',
                });
            }
            customerId = ndOrder.customer.toString();
        }

        // Verify order belongs to customer
        if (customerId !== req.user!.userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access to order',
            });
        }

        const result = await capturePayment(
            orderId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            !order // Pass boolean flag indicating if it's a next day order (if original order lookup failed)
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Send notifications to sellers now that the order is confirmed
        try {
            const io = req.app.get("io");
            const OrderItem = (await import('../models/OrderItem')).default;
            const { notifySellersOfOrderUpdate } = await import('../services/sellerNotificationService');

            const updatedOrder = order || await (await import("../models/NextDayOrder")).default.findById(orderId).lean();

            if (updatedOrder) {
                const orderItems = await OrderItem.find({ order: updatedOrder._id });
                const orderWithItems = { ...updatedOrder.toObject ? updatedOrder.toObject() : updatedOrder, items: orderItems };

                if (io) {
                    await notifySellersOfOrderUpdate(io, orderWithItems, 'NEW_ORDER');
                }

                try {
                    const { sendNewOrderNotification, sendOrderStatusNotification } = await import('../services/notificationService');
                    const sellerIdsInOrder = [...new Set(orderItems.map((i: any) => i.seller?.toString()).filter((id: any) => id))];
                    for (const sellerId of sellerIdsInOrder) {
                        await sendNewOrderNotification(sellerId as string, String(updatedOrder._id), (updatedOrder as any).orderNumber, updatedOrder.total);
                    }

                    // Push notification to customer confirming payment and order
                    await sendOrderStatusNotification(
                        (updatedOrder as any).orderNumber,
                        updatedOrder._id.toString(),
                        customerId,
                        'Processed',
                        updatedOrder.total
                    );
                } catch (pushErr) {
                    console.error("Error sending push notifications after payment:", pushErr);
                }
            }
        } catch (notificationError) {
            console.error("Error notifying parties after payment:", notificationError);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Error verifying payment:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify payment',
        });
    }
});

/**
 * Razorpay webhook endpoint
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-razorpay-signature'] as string;

        if (!signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing x-razorpay-signature header',
            });
        }

        const rawBody: Buffer = Buffer.isBuffer(req.body)
            ? req.body
            : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

        const io = req.app.get('io');
        const result = await handleWebhook(rawBody, signature, io);

        return res.status(result.statusCode || (result.success ? 200 : 400)).json(result);
    } catch (error: any) {
        console.error('Unhandled error in webhook endpoint:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal webhook handler error',
        });
    }
});

export default router;
