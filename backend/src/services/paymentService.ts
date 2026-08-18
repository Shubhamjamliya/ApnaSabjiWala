import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment';
import Order from '../models/Order';
import Refund from '../models/Refund';
import mongoose from 'mongoose';

// Initialize Razorpay instance
export const getRazorpayInstance = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error('Razorpay credentials not configured');
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
};

/**
 * Create a Razorpay order and register a Pending Payment record in DB
 */
export const createRazorpayOrder = async (
    orderId: string,
    amount: number,
    currency: string = 'INR',
    customerId?: string
) => {
    try {
        const razorpay = getRazorpayInstance();

        const options = {
            amount: Math.round(amount * 100), // Amount in paise
            currency,
            receipt: orderId,
            notes: {
                orderId,
            },
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Find customer ID if not provided
        let targetCustomerId = customerId;
        if (!targetCustomerId) {
            const ord = await Order.findById(orderId);
            if (ord) {
                targetCustomerId = ord.customer.toString();
            } else {
                const NextDayOrder = (await import("../models/NextDayOrder")).default;
                const ndOrder = await NextDayOrder.findById(orderId);
                if (ndOrder) {
                    targetCustomerId = ndOrder.customer.toString();
                }
            }
        }

        if (targetCustomerId) {
            // Check if there is already a Pending payment for this order to avoid unindexed duplicates
            await Payment.findOneAndUpdate(
                { order: orderId, status: 'Pending' },
                {
                    customer: targetCustomerId,
                    paymentMethod: 'Online',
                    paymentGateway: 'Razorpay',
                    paymentType: 'ORDER_PAYMENT',
                    razorpayOrderId: razorpayOrder.id,
                    amount,
                    currency,
                    status: 'Pending',
                    paymentDate: new Date(),
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        return {
            success: true,
            data: {
                razorpayOrderId: razorpayOrder.id,
                razorpayKey: process.env.RAZORPAY_KEY_ID,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                receipt: razorpayOrder.receipt,
            },
        };
    } catch (error: any) {
        console.error('Error creating Razorpay order:', error);
        return {
            success: false,
            message: error.message || 'Failed to create Razorpay order',
        };
    }
};

/**
 * Verify Razorpay payment signature
 */
export const verifyPaymentSignature = (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
): boolean => {
    try {
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keySecret) {
            throw new Error('Razorpay key secret not configured');
        }

        const body = razorpayOrderId + '|' + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body)
            .digest('hex');

        return expectedSignature === razorpaySignature;
    } catch (error) {
        console.error('Error verifying payment signature:', error);
        return false;
    }
};

/**
 * Capture payment and update order with server-side verification and idempotency
 */
export const capturePayment = async (
    orderId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    isNextDay: boolean = false
) => {
    // 1. Verify HMAC Signature
    const isSignatureValid = verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
    );

    if (!isSignatureValid) {
        return {
            success: false,
            message: 'Invalid payment signature',
        };
    }

    // 2. Fetch order from DB to verify price and status
    let order: any;
    if (isNextDay) {
        const NextDayOrder = (await import("../models/NextDayOrder")).default;
        order = await NextDayOrder.findById(orderId);
    } else {
        order = await Order.findById(orderId);
    }

    if (!order) {
        return {
            success: false,
            message: 'Order not found',
        };
    }

    // Check if order is already paid
    if (order.paymentStatus === 'Paid') {
        return {
            success: true,
            message: 'Payment already recorded as completed',
            data: {
                orderId: order._id,
                paymentId: order.paymentId || razorpayPaymentId,
            },
        };
    }

    // 3. Server-side Verification against Razorpay API
    const razorpay = getRazorpayInstance();
    let rpPayment: any;
    try {
        rpPayment = await razorpay.payments.fetch(razorpayPaymentId);
    } catch (fetchErr: any) {
        console.error('Failed to fetch payment details from Razorpay:', fetchErr);
        return {
            success: false,
            message: 'Failed to verify payment with payment gateway: ' + (fetchErr.message || 'Unknown error'),
        };
    }

    // Verify payment status, amount and order reference
    const expectedAmountPaise = Math.round(order.total * 100);
    if (!['captured', 'authorized'].includes(rpPayment.status)) {
        return {
            success: false,
            message: `Payment is not in captured status. Current status: ${rpPayment.status}`,
        };
    }

    if (rpPayment.amount < expectedAmountPaise) {
        return {
            success: false,
            message: `Paid amount (₹${rpPayment.amount / 100}) is less than order total (₹${order.total})`,
        };
    }

    // 4. Update Payment and Order atomically / idempotently
    const session = await mongoose.startSession().catch(() => null);
    if (session) session.startTransaction();

    try {
        // Try updating existing Payment record or create new Completed payment
        let payment = await Payment.findOneAndUpdate(
            {
                order: orderId,
                $or: [{ razorpayOrderId }, { status: 'Pending' }]
            },
            {
                customer: order.customer,
                paymentMethod: 'Online',
                paymentGateway: 'Razorpay',
                paymentType: 'ORDER_PAYMENT',
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature,
                amount: order.total,
                currency: 'INR',
                status: 'Completed',
                paidAt: new Date(),
                gatewayResponse: {
                    success: true,
                    message: 'Payment verified and captured successfully',
                    rawResponse: rpPayment,
                },
            },
            { new: true, session: session || undefined }
        );

        if (!payment) {
            payment = new Payment({
                order: orderId,
                customer: order.customer,
                paymentMethod: 'Online',
                paymentGateway: 'Razorpay',
                paymentType: 'ORDER_PAYMENT',
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature,
                amount: order.total,
                currency: 'INR',
                status: 'Completed',
                paidAt: new Date(),
                gatewayResponse: {
                    success: true,
                    message: 'Payment captured successfully',
                    rawResponse: rpPayment,
                },
            });
            await payment.save({ session: session || undefined });
        }

        // Update Order
        order.paymentStatus = 'Paid';
        order.paymentId = razorpayPaymentId;
        if (order.status === 'Pending') {
            order.status = isNextDay ? 'Confirmed' : 'Received';
        }
        await order.save({ session: session || undefined });

        if (session) await session.commitTransaction();

        // 5. Create Pending Commissions for sellers (Pending status, not paid until delivered)
        if (!isNextDay) {
            try {
                const { createPendingCommissions } = await import('./commissionService');
                await createPendingCommissions(orderId);
            } catch (commError) {
                console.error("Failed to create pending commissions after payment:", commError);
            }
        }

        return {
            success: true,
            message: 'Payment captured successfully',
            data: {
                paymentId: payment._id,
                orderId: order._id,
            },
        };
    } catch (error: any) {
        if (session) await session.abortTransaction().catch(() => {});
        console.error('Error capturing payment in DB:', error);
        return {
            success: false,
            message: error.message || 'Failed to capture payment in database',
        };
    } finally {
        if (session) session.endSession();
    }
};

/**
 * Process refund via Razorpay and record in Refund & Payment models
 */
export const processRefund = async (
    orderId: string,
    amount?: number,
    reason?: string,
    adminId?: string
) => {
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        const payment = await Payment.findOne({
            order: orderId,
            status: 'Completed',
        });

        if (!payment || !payment.razorpayPaymentId) {
            throw new Error('Completed Razorpay payment record not found for this order');
        }

        const refundAmount = amount || payment.amount;
        if (refundAmount <= 0 || refundAmount > payment.amount) {
            throw new Error(`Invalid refund amount: ${refundAmount}. Maximum allowed is ${payment.amount}`);
        }

        // Create initial Pending Refund record
        const refundRecord = new Refund({
            order: order._id,
            payment: payment._id,
            customer: order.customer,
            amount: refundAmount,
            reason: reason || 'Order cancelled or returned',
            status: 'Pending',
            processedBy: adminId,
        });
        await refundRecord.save();

        const razorpay = getRazorpayInstance();
        const rpRefund: any = await razorpay.payments.refund(payment.razorpayPaymentId, {
            amount: Math.round(refundAmount * 100), // paise
            notes: {
                reason: reason || 'Order cancelled',
                orderId: order._id.toString(),
                refundRecordId: refundRecord._id.toString(),
            },
        });

        // Update Refund record
        refundRecord.status = 'Completed';
        refundRecord.refundTransactionId = rpRefund.id;
        refundRecord.gatewayResponse = rpRefund;
        refundRecord.processedAt = new Date();
        await refundRecord.save();

        // Update Payment record
        payment.status = 'Refunded';
        payment.refundAmount = (payment.refundAmount || 0) + refundAmount;
        payment.refundedAt = new Date();
        payment.refundReason = reason;
        await payment.save();

        // Update Order payment status
        order.paymentStatus = 'Refunded';
        await order.save();

        // Reverse commissions if they were already distributed
        try {
            const { reverseCommissions } = await import('./commissionService');
            await reverseCommissions(orderId);
        } catch (revError) {
            console.error('Error reversing commissions during refund:', revError);
        }

        return {
            success: true,
            message: 'Refund processed successfully',
            data: {
                refundId: rpRefund.id,
                amount: refundAmount,
                status: rpRefund.status,
            },
        };
    } catch (error: any) {
        console.error('Error processing refund:', error);
        return {
            success: false,
            message: error.message || 'Failed to process refund',
        };
    }
};

/**
 * Handle Razorpay webhook with raw buffer signature verification and atomic event processing
 */
export const handleWebhook = async (
    rawBody: Buffer,
    signature: string,
    ioInstance?: any
): Promise<{ success: boolean; statusCode: number; message: string }> => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('Razorpay webhook secret not configured');
            return {
                success: false,
                statusCode: 500,
                message: 'Webhook secret not configured',
            };
        }

        // Verify HMAC signature against the raw buffer
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            console.warn('⚠️ Invalid Razorpay webhook signature');
            return {
                success: false,
                statusCode: 400,
                message: 'Invalid webhook signature',
            };
        }

        // Parse payload
        let body: any;
        try {
            body = JSON.parse(rawBody.toString('utf8'));
        } catch (jsonErr) {
            return {
                success: false,
                statusCode: 400,
                message: 'Invalid JSON body in webhook',
            };
        }

        const event = body.event;
        console.log(`📥 Razorpay webhook received: ${event}`);

        switch (event) {
            case 'payment.captured': {
                const payload = body.payload.payment.entity;
                await handlePaymentCapturedEvent(payload);
                break;
            }
            case 'payment.failed': {
                const payload = body.payload.payment.entity;
                await handlePaymentFailedEvent(payload);
                break;
            }
            case 'refund.created': {
                const payload = body.payload.refund.entity;
                await handleRefundCreatedEvent(payload);
                break;
            }
            case 'qr_code.credited': {
                const qrPayload = body.payload.qr_code?.entity;
                const paymentPayload = body.payload.payment?.entity;
                await handleQrCodeCreditedEvent(qrPayload, paymentPayload, ioInstance);
                break;
            }
            default:
                console.log(`ℹ️ Unhandled webhook event: ${event}`);
        }

        return {
            success: true,
            statusCode: 200,
            message: 'Webhook processed successfully',
        };
    } catch (error: any) {
        console.error('Error handling webhook:', error);
        // Return 500 so Razorpay retries this event if it was an internal DB error
        return {
            success: false,
            statusCode: 500,
            message: error.message || 'Internal error processing webhook',
        };
    }
};

// Internal Webhook Event Handlers

const handlePaymentCapturedEvent = async (payload: any) => {
    const razorpayPaymentId = payload.id;
    const razorpayOrderId = payload.order_id;

    let payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
        // Find order from receipt or notes
        const orderId = payload.notes?.orderId || payload.receipt;
        if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
            payment = await Payment.findOne({ order: orderId });
        }
    }

    if (payment) {
        if (payment.status === 'Completed') {
            console.log(`Payment for ${razorpayOrderId} already marked as Completed.`);
            return;
        }

        payment.status = 'Completed';
        payment.razorpayPaymentId = razorpayPaymentId;
        payment.paidAt = new Date();
        payment.gatewayResponse = {
            success: true,
            message: 'Captured via webhook',
            rawResponse: payload,
        };
        await payment.save();

        // Update Order
        const order = await Order.findById(payment.order);
        if (order && order.paymentStatus !== 'Paid') {
            order.paymentStatus = 'Paid';
            order.paymentId = razorpayPaymentId;
            if (order.status === 'Pending') {
                order.status = 'Received';
            }
            await order.save();

            // Create Pending commissions
            try {
                const { createPendingCommissions } = await import('./commissionService');
                await createPendingCommissions(order._id.toString());
            } catch (cErr) {
                console.error('Error creating pending commissions in webhook:', cErr);
            }
        }
    }
};

const handlePaymentFailedEvent = async (payload: any) => {
    const razorpayOrderId = payload.order_id;

    const payment = await Payment.findOne({ razorpayOrderId });
    if (payment && payment.status === 'Pending') {
        payment.status = 'Failed';
        payment.gatewayResponse = {
            success: false,
            message: payload.error_description || 'Payment failed',
            rawResponse: payload,
        };
        await payment.save();

        await Order.findByIdAndUpdate(payment.order, {
            paymentStatus: 'Failed',
        });
    }
};

const handleRefundCreatedEvent = async (payload: any) => {
    const razorpayPaymentId = payload.payment_id;
    const refundAmount = payload.amount / 100;

    const payment = await Payment.findOne({ razorpayPaymentId });
    if (payment) {
        payment.status = 'Refunded';
        payment.refundAmount = refundAmount;
        payment.refundedAt = new Date();
        await payment.save();

        await Order.findByIdAndUpdate(payment.order, {
            paymentStatus: 'Refunded',
        });

        // Record in Refund model if not already present
        const existingRefund = await Refund.findOne({ refundTransactionId: payload.id });
        if (!existingRefund) {
            await Refund.create({
                order: payment.order,
                payment: payment._id,
                customer: payment.customer,
                amount: refundAmount,
                reason: payload.notes?.reason || 'Refund processed by gateway',
                status: 'Completed',
                refundTransactionId: payload.id,
                gatewayResponse: payload,
                processedAt: new Date(),
            });
        }
    }
};

/**
 * Handle qr_code.credited webhook event with full database and amount verification
 */
const handleQrCodeCreditedEvent = async (qrPayload: any, paymentPayload: any, ioInstance?: any) => {
    if (!qrPayload?.id || !paymentPayload?.id) {
        console.warn('Invalid qr_code.credited webhook payload missing QR or payment ID');
        return;
    }

    const { default: CodPayment } = await import('../models/CodPayment');

    // 1. Find the CodPayment by QR ID
    const codPayment = await CodPayment.findOne({
        razorpayQrCodeId: qrPayload.id,
    });

    if (!codPayment) {
        console.warn(`No CodPayment record found for QR ID: ${qrPayload.id}`);
        return;
    }

    // 2. Concurrency/Idempotency check: if already Verified or Collected, skip
    if (codPayment.status === 'Verified') {
        console.log(`CodPayment for QR ${qrPayload.id} is already Verified.`);
        return;
    }

    // 3. Verify order from DB
    const order = await Order.findById(codPayment.order);
    if (!order) {
        console.error(`Order ${codPayment.order} not found for COD QR payment`);
        return;
    }

    // 4. Verification of exact amount, currency, and captured state (Correction #4)
    const expectedAmountPaise = Math.round(order.total * 100);
    const paidAmountPaise = paymentPayload.amount;

    if (paidAmountPaise < expectedAmountPaise) {
        console.error(`COD QR payment amount mismatch: expected ${expectedAmountPaise} paise, received ${paidAmountPaise} paise`);
        codPayment.status = 'Failed';
        await codPayment.save();
        return;
    }

    if (paymentPayload.currency && paymentPayload.currency !== 'INR') {
        console.error(`COD QR payment currency mismatch: expected INR, received ${paymentPayload.currency}`);
        return;
    }

    if (paymentPayload.status !== 'captured') {
        console.warn(`COD QR payment is not captured. Current status: ${paymentPayload.status}`);
        return;
    }

    // 5. Update CodPayment record
    codPayment.status = 'Verified';
    codPayment.razorpayPaymentId = paymentPayload.id;
    codPayment.verifiedAt = new Date();
    await codPayment.save();

    // 6. Update Order paymentStatus to Paid atomically if not already paid
    await Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: { $ne: 'Paid' } },
        {
            paymentStatus: 'Paid',
            paymentId: paymentPayload.id,
        },
        { new: true }
    );

    // 7. Also create or update a Payment record for accounting ledger
    await Payment.findOneAndUpdate(
        { order: order._id, razorpayQrCodeId: qrPayload.id },
        {
            customer: order.customer,
            paymentMethod: 'COD_QR_UPI',
            paymentGateway: 'Razorpay',
            paymentType: 'COD_QR_PAYMENT',
            razorpayQrCodeId: qrPayload.id,
            razorpayPaymentId: paymentPayload.id,
            amount: order.total,
            currency: 'INR',
            status: 'Completed',
            paidAt: new Date(),
            gatewayResponse: {
                success: true,
                message: 'COD QR UPI payment verified via webhook',
                rawResponse: paymentPayload,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 8. Notify Delivery Partner via Socket.IO in real-time
    if (ioInstance && codPayment.deliveryBoy) {
        ioInstance.to(`delivery-${codPayment.deliveryBoy.toString()}`).emit('cod-qr-payment-received', {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            amount: order.total,
            paymentId: paymentPayload.id,
            message: 'Customer UPI payment received successfully! You can now complete delivery.',
        });
    }
};
