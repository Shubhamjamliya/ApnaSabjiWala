import { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler';
import Payment from '../../../models/Payment';
import Order from '../../../models/Order';
import Refund from '../../../models/Refund';
import CodPayment from '../../../models/CodPayment';
import PaymentMethod from '../../../models/PaymentMethod';
import { processRefund, getRazorpayInstance } from '../../../services/paymentService';

/**
 * Get list of all payments with filters and pagination
 */
export const getAllPayments = asyncHandler(async (req: Request, res: Response) => {
    const {
        page = 1,
        limit = 20,
        status,
        paymentMethod,
        startDate,
        endDate,
        search,
    } = req.query;

    const query: any = {};

    if (status) {
        query.status = status;
    }

    if (paymentMethod) {
        query.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate as string);
        if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    if (search) {
        query.$or = [
            { razorpayOrderId: { $regex: search, $options: 'i' } },
            { razorpayPaymentId: { $regex: search, $options: 'i' } },
            { transactionId: { $regex: search, $options: 'i' } },
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
        Payment.find(query)
            .populate('customer', 'name email phone')
            .populate('order', 'orderNumber status total')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Payment.countDocuments(query),
    ]);

    return res.status(200).json({
        success: true,
        data: payments,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
        },
    });
});

/**
 * Get details of a specific payment by ID
 */
export const getPaymentDetails = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const payment = await Payment.findById(id)
        .populate('customer', 'name email phone')
        .populate({
            path: 'order',
            populate: [
                { path: 'items', populate: { path: 'product', select: 'productName price' } },
                { path: 'deliveryBoy', select: 'name mobile' },
            ],
        });

    if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Fetch related refunds
    const refunds = await Refund.find({ payment: payment._id });

    // Fetch related COD collection record if applicable
    const codRecord = await CodPayment.findOne({ order: payment.order });

    return res.status(200).json({
        success: true,
        data: {
            payment,
            refunds,
            codRecord,
        },
    });
});

/**
 * Issue refund for a payment from admin panel
 */
export const issueRefund = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount, reason } = req.body;
    const adminId = req.user?.userId;

    const payment = await Payment.findById(id);
    if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status !== 'Completed') {
        return res.status(400).json({
            success: false,
            message: `Cannot refund payment with status: ${payment.status}`,
        });
    }

    const refundAmount = amount ? Number(amount) : payment.amount;

    const result = await processRefund(
        payment.order.toString(),
        refundAmount,
        reason || 'Admin initiated refund',
        adminId
    );

    if (!result.success) {
        return res.status(400).json(result);
    }

    return res.status(200).json(result);
});

/**
 * List all COD collections
 */
export const getCodCollections = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status, deliveryBoyId } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (deliveryBoyId) query.deliveryBoy = deliveryBoyId;

    const skip = (Number(page) - 1) * Number(limit);

    const [collections, total] = await Promise.all([
        CodPayment.find(query)
            .populate('deliveryBoy', 'name mobile')
            .populate('customer', 'name phone')
            .populate('order', 'orderNumber total status')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        CodPayment.countDocuments(query),
    ]);

    return res.status(200).json({
        success: true,
        data: collections,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
        },
    });
});

/**
 * Reconcile / sync payment status with Razorpay for an order
 */
export const reconcileOrderPayment = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const payment = await Payment.findOne({ order: orderId });
    if (!payment?.razorpayOrderId) {
        return res.status(400).json({
            success: false,
            message: 'No Razorpay Order ID found for this order',
        });
    }

    const razorpay = getRazorpayInstance();
    const paymentsList: any = await razorpay.orders.fetchPayments(payment.razorpayOrderId);

    const capturedPayment = paymentsList?.items?.find(
        (p: any) => p.status === 'captured' || p.status === 'authorized'
    );

    if (capturedPayment) {
        payment.status = 'Completed';
        payment.razorpayPaymentId = capturedPayment.id;
        payment.paidAt = new Date(capturedPayment.created_at * 1000);
        await payment.save();

        order.paymentStatus = 'Paid';
        order.paymentId = capturedPayment.id;
        if (order.status === 'Pending') {
            order.status = 'Received';
        }
        await order.save();

        return res.status(200).json({
            success: true,
            message: 'Payment verified and reconciled successfully',
            data: {
                orderId: order._id,
                paymentId: capturedPayment.id,
                paymentStatus: 'Paid',
            },
        });
    }

    return res.status(200).json({
        success: true,
        message: 'No captured payments found on gateway for this order',
        data: {
            orderStatus: order.status,
            paymentStatus: order.paymentStatus,
            gatewayPaymentsCount: paymentsList?.count || 0,
        },
    });
});

/**
 * Backward compatibility helpers for PaymentMethod management
 */
export const getPaymentMethods = asyncHandler(async (_req: Request, res: Response) => {
    const paymentMethods = await PaymentMethod.find().sort({ order: 1 });
    return res.status(200).json({
        success: true,
        data: paymentMethods,
    });
});

export const getPaymentMethodById = asyncHandler(async (req: Request, res: Response) => {
    const paymentMethod = await PaymentMethod.findById(req.params.id);
    if (!paymentMethod) {
        return res.status(404).json({ success: false, message: 'Payment method not found' });
    }
    return res.status(200).json({
        success: true,
        data: paymentMethod,
    });
});

export const updatePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const paymentMethod = await PaymentMethod.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!paymentMethod) {
        return res.status(404).json({ success: false, message: 'Payment method not found' });
    }
    return res.status(200).json({
        success: true,
        data: paymentMethod,
    });
});

export const updatePaymentMethodStatus = asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = req.body;
    const paymentMethod = await PaymentMethod.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
    );
    if (!paymentMethod) {
        return res.status(404).json({ success: false, message: 'Payment method not found' });
    }
    return res.status(200).json({
        success: true,
        data: paymentMethod,
    });
});
