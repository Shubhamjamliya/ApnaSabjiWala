import Order from '../models/Order';
import Payment from '../models/Payment';
import OrderItem from '../models/OrderItem';
import Product from '../models/Product';
import { getRazorpayInstance } from '../services/paymentService';

/**
 * Background job to cleanup or reconcile stale online Pending orders (older than 30 minutes)
 * Implements Correction #3: Always verifies with Razorpay before cancelling / restoring stock.
 */
export const cleanupStalePendingOrders = async () => {
    try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        // Find stale online orders stuck in Pending
        const staleOrders = await Order.find({
            status: 'Pending',
            paymentMethod: 'Online',
            paymentStatus: 'Pending',
            createdAt: { $lt: thirtyMinutesAgo },
        });

        if (staleOrders.length === 0) {
            return;
        }

        console.log(`🔍 [PaymentCleanupJob] Found ${staleOrders.length} stale pending online orders. Checking with Razorpay...`);

        const razorpay = getRazorpayInstance();

        for (const order of staleOrders) {
            try {
                // Find associated Payment record
                const pendingPayment = await Payment.findOne({
                    order: order._id,
                    razorpayOrderId: { $exists: true, $ne: null },
                });

                let wasActuallyPaid = false;
                let capturedPaymentEntity: any = null;

                if (pendingPayment?.razorpayOrderId) {
                    try {
                        const paymentsList: any = await razorpay.orders.fetchPayments(pendingPayment.razorpayOrderId);
                        if (paymentsList?.items && paymentsList.items.length > 0) {
                            capturedPaymentEntity = paymentsList.items.find(
                                (p: any) => p.status === 'captured' || p.status === 'authorized'
                            );
                            if (capturedPaymentEntity) {
                                wasActuallyPaid = true;
                            }
                        }
                    } catch (rpErr: any) {
                        console.error(`Error querying Razorpay for order ${order.orderNumber}:`, rpErr.message);
                    }
                }

                if (wasActuallyPaid && capturedPaymentEntity) {
                    // PAYMENT WAS ACTUALLY RECEIVED: Reconcile, do NOT cancel or restore stock!
                    console.log(`✅ [PaymentCleanupJob] Order ${order.orderNumber} was paid on Razorpay (Payment: ${capturedPaymentEntity.id}). Reconciling to Paid...`);

                    pendingPayment!.status = 'Completed';
                    pendingPayment!.razorpayPaymentId = capturedPaymentEntity.id;
                    pendingPayment!.paidAt = new Date(capturedPaymentEntity.created_at * 1000);
                    await pendingPayment!.save();

                    order.paymentStatus = 'Paid';
                    order.paymentId = capturedPaymentEntity.id;
                    order.status = 'Received';
                    await order.save();

                    // Create pending commissions
                    try {
                        const { createPendingCommissions } = await import('../services/commissionService');
                        await createPendingCommissions(order._id.toString());
                    } catch (cErr) {
                        console.error('Error creating pending commissions in cleanup job:', cErr);
                    }
                } else {
                    // PAYMENT WAS NOT MADE: Safely cancel order and restore stock
                    console.log(`🚫 [PaymentCleanupJob] Cancelling unpaid expired order ${order.orderNumber} and restoring stock...`);

                    // Restore stock for order items
                    for (const itemId of order.items) {
                        const orderItem = await OrderItem.findById(itemId);
                        if (orderItem) {
                            const product = await Product.findById(orderItem.product);
                            if (product) {
                                if (orderItem.variation && product.variations) {
                                    const vIdx = product.variations.findIndex(
                                        (v: any) =>
                                            v.name === orderItem.variation ||
                                            v.value === orderItem.variation ||
                                            v.title === orderItem.variation
                                    );
                                    if (vIdx !== -1) {
                                        product.variations[vIdx].stock += orderItem.quantity;
                                    }
                                }
                                product.stock += orderItem.quantity;
                                await product.save();
                            }
                            orderItem.status = 'Cancelled';
                            await orderItem.save();
                        }
                    }

                    order.status = 'Cancelled';
                    order.paymentStatus = 'Failed';
                    order.cancellationReason = 'Payment timed out after 30 minutes without completion';
                    order.cancelledAt = new Date();
                    await order.save();

                    // Cancel pending payment records
                    await Payment.updateMany(
                        { order: order._id, status: 'Pending' },
                        { status: 'Cancelled' }
                    );
                }
            } catch (orderErr) {
                console.error(`Error processing stale order ${order._id}:`, orderErr);
            }
        }
    } catch (jobErr) {
        console.error('Error running PaymentCleanupJob:', jobErr);
    }
};
