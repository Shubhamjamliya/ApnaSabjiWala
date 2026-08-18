import Order from '../models/Order';
import Payment from '../models/Payment';
import CodPayment from '../models/CodPayment';
import { getRazorpayInstance } from './paymentService';
import mongoose from 'mongoose';

/**
 * Generate a dynamic Razorpay UPI QR Code for COD payment collection
 */
export const generateCodQrCode = async (orderId: string, deliveryBoyId: string) => {
    // 1. Fetch order and validate
    const order = await Order.findById(orderId);
    if (!order) {
        throw new Error('Order not found');
    }

    if (order.deliveryBoy?.toString() !== deliveryBoyId) {
        throw new Error('This order is not assigned to you');
    }

    if (order.paymentStatus === 'Paid') {
        throw new Error('Order has already been paid');
    }

    // 2. Check if a non-expired Pending QR already exists for this order
    const existingCodPayment = await CodPayment.findOne({
        order: orderId,
        collectionMethod: 'QR_UPI',
        status: 'Pending',
        expiresAt: { $gt: new Date() },
    });

    if (existingCodPayment && existingCodPayment.razorpayQrImageUrl) {
        return {
            success: true,
            data: {
                qrCodeId: existingCodPayment.razorpayQrCodeId,
                qrImageUrl: existingCodPayment.razorpayQrImageUrl,
                amount: existingCodPayment.amount,
                expiresAt: existingCodPayment.expiresAt,
            },
        };
    }

    // 3. Create dynamic single-use UPI QR code via Razorpay
    const razorpay = getRazorpayInstance();
    const expiryTimestamp = Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes validity
    const amountInPaise = Math.round(order.total * 100);

    const qrCode = await razorpay.qrCode.create({
        type: 'upi_qr',
        name: `Order #${order.orderNumber}`,
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: amountInPaise,
        description: `COD Payment for Order #${order.orderNumber}`,
        close_by: expiryTimestamp,
        notes: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            deliveryBoyId,
        },
    });

    // 4. Save COD payment record in DB
    const codPayment = await CodPayment.findOneAndUpdate(
        { order: orderId, collectionMethod: 'QR_UPI' },
        {
            deliveryBoy: deliveryBoyId,
            customer: order.customer,
            amount: order.total,
            collectionMethod: 'QR_UPI',
            razorpayQrCodeId: qrCode.id,
            razorpayQrImageUrl: qrCode.image_url,
            status: 'Pending',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
        success: true,
        data: {
            qrCodeId: qrCode.id,
            qrImageUrl: qrCode.image_url,
            amount: order.total,
            expiresAt: codPayment.expiresAt,
        },
    };
};

/**
 * Mark COD payment as collected via Cash (Atomic & Idempotent)
 */
export const markCashCollected = async (orderId: string, deliveryBoyId: string) => {
    const session = await mongoose.startSession().catch(() => null);
    if (session) session.startTransaction();

    try {
        // 1. Fetch order and validate
        const order = await Order.findById(orderId).session(session || null);
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.deliveryBoy?.toString() !== deliveryBoyId) {
            throw new Error('This order is not assigned to you');
        }

        // 2. Atomic protection against double-collection
        if (order.paymentStatus === 'Paid') {
            return {
                success: true,
                message: 'Payment has already been received for this order',
                data: {
                    orderId: order._id,
                    paymentStatus: order.paymentStatus,
                },
            };
        }

        // 3. Atomically transition order paymentStatus to Paid
        const updatedOrder = await Order.findOneAndUpdate(
            { _id: orderId, paymentStatus: { $ne: 'Paid' } },
            {
                paymentStatus: 'Paid',
                paymentMethod: 'COD',
            },
            { new: true, session: session || undefined }
        );

        if (!updatedOrder) {
            return {
                success: true,
                message: 'Payment already collected simultaneously',
                data: { orderId: order._id },
            };
        }

        // 4. Create or update CodPayment record
        await CodPayment.findOneAndUpdate(
            { order: orderId, collectionMethod: 'CASH' },
            {
                deliveryBoy: deliveryBoyId,
                customer: order.customer,
                amount: order.total,
                collectionMethod: 'CASH',
                status: 'Collected',
                collectedAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true, session: session || undefined }
        );

        // 5. If any pending QR payment existed, mark it as closed/expired
        await CodPayment.updateMany(
            { order: orderId, collectionMethod: 'QR_UPI', status: 'Pending' },
            { status: 'Expired' },
            { session: session || undefined }
        );

        // 6. Record in Payment model for accounting ledger
        await Payment.findOneAndUpdate(
            { order: orderId, paymentMethod: 'COD' },
            {
                customer: order.customer,
                paymentMethod: 'COD',
                paymentType: 'ORDER_PAYMENT',
                amount: order.total,
                currency: 'INR',
                status: 'Completed',
                paidAt: new Date(),
                notes: `Cash collected by delivery boy ${deliveryBoyId}`,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true, session: session || undefined }
        );

        if (session) await session.commitTransaction();

        return {
            success: true,
            message: 'Cash payment marked as collected successfully',
            data: {
                orderId: updatedOrder._id,
                amount: updatedOrder.total,
                paymentStatus: updatedOrder.paymentStatus,
            },
        };
    } catch (error: any) {
        if (session) await session.abortTransaction().catch(() => {});
        console.error('Error marking cash collected:', error);
        throw error;
    } finally {
        if (session) session.endSession();
    }
};

/**
 * Verify Razorpay QR Code payment status by polling gateway API (Atomic & Concurrency-Safe)
 */
export const verifyCodQrPayment = async (orderId: string, deliveryBoyId: string) => {
    // 1. Fetch order and validate assignment
    const order = await Order.findById(orderId);
    if (!order) {
        throw new Error('Order not found');
    }

    if (order.deliveryBoy?.toString() !== deliveryBoyId) {
        throw new Error('This order is not assigned to you');
    }

    // If order already paid, return success immediately
    if (order.paymentStatus === 'Paid') {
        return {
            success: true,
            verified: true,
            message: 'Payment already verified and received',
            data: {
                orderId: order._id,
                paymentId: order.paymentId,
                paymentStatus: order.paymentStatus,
            },
        };
    }

    // 2. Fetch COD QR record
    const codPayment = await CodPayment.findOne({
        order: orderId,
        collectionMethod: 'QR_UPI',
    });

    if (!codPayment || !codPayment.razorpayQrCodeId) {
        return {
            success: false,
            verified: false,
            message: 'No active QR payment found for this order. Please generate a QR code first.',
        };
    }

    // 3. Query Razorpay API for QR code status and payments
    const razorpay = getRazorpayInstance();
    let qrCodeData: any;
    try {
        qrCodeData = await razorpay.qrCode.fetch(codPayment.razorpayQrCodeId);
    } catch (fetchErr: any) {
        console.error('Error fetching QR code status from Razorpay:', fetchErr);
        return {
            success: false,
            verified: false,
            message: 'Unable to check QR status with payment gateway: ' + (fetchErr.message || 'Unknown error'),
        };
    }

    // Check if payments were received on this QR
    let paymentReceived = false;
    let paymentEntity: any = null;

    if (qrCodeData.payments_count_received > 0 || qrCodeData.status === 'closed') {
        try {
            const paymentsList: any = await (razorpay.qrCode as any).fetchAllPayments(codPayment.razorpayQrCodeId);
            if (paymentsList?.items && paymentsList.items.length > 0) {
                const successfulPayment = paymentsList.items.find(
                    (p: any) => p.status === 'captured' || p.status === 'authorized'
                );
                if (successfulPayment) {
                    paymentReceived = true;
                    paymentEntity = successfulPayment;
                }
            }
        } catch (payListErr) {
            console.error('Error fetching payments list for QR:', payListErr);
        }
    }

    if (!paymentReceived || !paymentEntity) {
        return {
            success: true,
            verified: false,
            message: 'Payment not yet received. Please ask customer to complete the UPI payment.',
            data: {
                qrStatus: qrCodeData.status,
            },
        };
    }

    // 4. Validate exact amount and currency (Correction #4)
    const expectedAmountPaise = Math.round(order.total * 100);
    if (paymentEntity.amount < expectedAmountPaise) {
        throw new Error(`Payment amount (₹${paymentEntity.amount / 100}) is less than order total (₹${order.total})`);
    }

    // 5. Atomic DB update
    const session = await mongoose.startSession().catch(() => null);
    if (session) session.startTransaction();

    try {
        codPayment.status = 'Verified';
        codPayment.razorpayPaymentId = paymentEntity.id;
        codPayment.verifiedAt = new Date();
        await codPayment.save({ session: session || undefined });

        // Update Order paymentStatus to Paid
        await Order.findOneAndUpdate(
            { _id: orderId, paymentStatus: { $ne: 'Paid' } },
            {
                paymentStatus: 'Paid',
                paymentId: paymentEntity.id,
            },
            { new: true, session: session || undefined }
        );

        // Record in Payment model for accounting ledger
        await Payment.findOneAndUpdate(
            { order: orderId, razorpayQrCodeId: codPayment.razorpayQrCodeId },
            {
                customer: order.customer,
                paymentMethod: 'COD_QR_UPI',
                paymentGateway: 'Razorpay',
                paymentType: 'COD_QR_PAYMENT',
                razorpayQrCodeId: codPayment.razorpayQrCodeId,
                razorpayPaymentId: paymentEntity.id,
                amount: order.total,
                currency: 'INR',
                status: 'Completed',
                paidAt: new Date(),
                gatewayResponse: {
                    success: true,
                    message: 'COD QR payment verified by delivery partner poll',
                    rawResponse: paymentEntity,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true, session: session || undefined }
        );

        if (session) await session.commitTransaction();

        return {
            success: true,
            verified: true,
            message: 'Payment received and verified successfully!',
            data: {
                orderId: order._id,
                paymentId: paymentEntity.id,
                amount: order.total,
                paymentStatus: 'Paid',
            },
        };
    } catch (dbErr: any) {
        if (session) await session.abortTransaction().catch(() => {});
        console.error('Error saving verified QR payment to DB:', dbErr);
        throw dbErr;
    } finally {
        if (session) session.endSession();
    }
};
