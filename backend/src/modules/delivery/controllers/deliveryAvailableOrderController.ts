import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import Delivery from '../../../models/Delivery';
import Order from '../../../models/Order';
import { asyncHandler } from '../../../utils/asyncHandler';
import {
  findDeliveryBoysNearSellerLocations,
  getNotificationState,
  handleOrderAcceptance,
  handleOrderRejection,
  registerDeliveryBoyForOrderNotification,
} from '../../../services/orderNotificationService';

const formatAvailableOrder = (order: any) => ({
  orderId: order._id.toString(),
  orderNumber: order.orderNumber,
  customerName: order.customerName,
  customerPhone: order.customerPhone,
  deliveryAddress: {
    address: order.deliveryAddress?.address || '',
    city: order.deliveryAddress?.city || '',
    state: order.deliveryAddress?.state || '',
    pincode: order.deliveryAddress?.pincode || '',
    landmark: order.deliveryAddress?.landmark || '',
  },
  total: Number(order.total) || 0,
  subtotal: Number(order.subtotal) || 0,
  shipping: Number(order.shipping) || 0,
  createdAt: order.createdAt,
});

const registerEligiblePartners = async (order: any, deliveryBoyId: string) => {
  const orderId = String(order._id);
  const currentState = getNotificationState(orderId);
  if (currentState?.rejectedDeliveryBoys.has(deliveryBoyId)) return false;
  if (currentState?.notifiedDeliveryBoys.has(deliveryBoyId)) return true;

  const nearbyDeliveryBoys = await findDeliveryBoysNearSellerLocations(order);
  nearbyDeliveryBoys.forEach(id => {
    registerDeliveryBoyForOrderNotification(orderId, id.toString());
  });
  return nearbyDeliveryBoys.some(id => id.toString() === deliveryBoyId);
};

const getEligibleOrder = async (orderId: string, deliveryBoyId: string) => {
  const deliveryBoy = await Delivery.findOne({
    _id: deliveryBoyId,
    isOnline: true,
    status: 'Active',
  }).select('_id');
  if (!deliveryBoy) return null;

  const activeOrderCount = await Order.countDocuments({
    deliveryBoy: deliveryBoy._id,
    deliveryBoyStatus: { $in: ['Assigned', 'Picked Up', 'In Transit'] },
    status: { $nin: ['Delivered', 'Cancelled', 'Rejected', 'Returned'] },
  });
  if (activeOrderCount >= 5) return null;

  const order = await Order.findOne({
    _id: orderId,
    status: 'Accepted',
    $or: [
      { deliveryBoy: { $exists: false } },
      { deliveryBoy: null },
    ],
  }).populate({
    path: 'items',
    populate: { path: 'seller' },
  });

  if (!order || !(await registerEligiblePartners(order, deliveryBoyId))) return null;
  return order;
};

export const getAvailableOrders = asyncHandler(async (req: Request, res: Response) => {
  const deliveryBoyId = req.user!.userId;
  const deliveryBoy = await Delivery.findById(deliveryBoyId).select('isOnline status');

  if (!deliveryBoy || !deliveryBoy.isOnline || deliveryBoy.status !== 'Active') {
    return res.status(200).json({ success: true, data: [] });
  }

  const activeOrderCount = await Order.countDocuments({
    deliveryBoy: deliveryBoy._id,
    deliveryBoyStatus: { $in: ['Assigned', 'Picked Up', 'In Transit'] },
    status: { $nin: ['Delivered', 'Cancelled', 'Rejected', 'Returned'] },
  });

  if (activeOrderCount >= 5) {
    return res.status(200).json({ success: true, data: [] });
  }

  const candidates = await Order.find({
    status: 'Accepted',
    $or: [
      { deliveryBoy: { $exists: false } },
      { deliveryBoy: null },
    ],
  })
    .populate({
      path: 'items',
      populate: { path: 'seller' },
    })
    .sort({ createdAt: 1 })
    .limit(20)
    .lean();

  const availableOrders = [];
  for (const order of candidates) {
    const orderId = String(order._id);
    const state = getNotificationState(orderId);

    if (state?.acceptedBy || state?.rejectedDeliveryBoys.has(deliveryBoyId)) {
      continue;
    }

    const isEligible = await registerEligiblePartners(order, deliveryBoyId);

    if (!isEligible) continue;

    registerDeliveryBoyForOrderNotification(orderId, deliveryBoyId);
    availableOrders.push(formatAvailableOrder(order));
  }

  return res.status(200).json({ success: true, data: availableOrders });
});

export const acceptAvailableOrder = asyncHandler(async (req: Request, res: Response) => {
  const deliveryBoyId = req.user!.userId;
  const orderId = req.params.id;
  const io = req.app.get('io') as SocketIOServer;

  if (!(await getEligibleOrder(orderId, deliveryBoyId))) {
    return res.status(409).json({ success: false, message: 'Order is no longer available to you' });
  }
  const result = await handleOrderAcceptance(io, orderId, deliveryBoyId);
  return res.status(result.success ? 200 : 409).json(result);
});

export const rejectAvailableOrder = asyncHandler(async (req: Request, res: Response) => {
  const deliveryBoyId = req.user!.userId;
  const orderId = req.params.id;
  const io = req.app.get('io') as SocketIOServer;

  if (!(await getEligibleOrder(orderId, deliveryBoyId))) {
    return res.status(409).json({ success: false, message: 'Order is no longer available to you' });
  }
  const result = await handleOrderRejection(io, orderId, deliveryBoyId);
  return res.status(result.success ? 200 : 409).json(result);
});
