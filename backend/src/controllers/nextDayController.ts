import { Request, Response } from "express";
import Product from "../models/Product";
import Category from "../models/Category";
import SubCategory from "../models/SubCategory";
import Customer from "../models/Customer";
import NextDayOrder from "../models/NextDayOrder";
import DeliverySlot from "../models/DeliverySlot";

// Hardcoded for now, can be moved to AppSettings later
const CUT_OFF_TIME_HOUR = 21; // 9 PM
const CUT_OFF_TIME_MINUTE = 30; // 30 Minutes

const isBookingOpen = (): boolean => {
  const now = new Date();
  const cutOff = new Date();
  cutOff.setHours(CUT_OFF_TIME_HOUR, CUT_OFF_TIME_MINUTE, 0, 0);
  return now < cutOff;
};

const getTomorrowDate = (): Date => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Normalize to midnight
  return tomorrow;
};

// --- CLIENT APIS ---

export const getNextDaySlots = async (_req: Request, res: Response) => {
  try {
    const bookingOpen = isBookingOpen();
    if (!bookingOpen) {
      return res.json({
        success: false,
        message: "Booking is closed for tomorrow. Please try again tomorrow for next day delivery.",
        bookingClosed: true,
      });
    }

    const tomorrow = getTomorrowDate();
    const nextDay = new Date(tomorrow);
    nextDay.setDate(tomorrow.getDate() + 1);

    let slots = await DeliverySlot.find({
      date: { $gte: tomorrow, $lt: nextDay },
      isActive: true,
    }).sort({ startTime: 1 });

    // Fallback: If no slots created by admin for tomorrow, provide default morning slots
    if (slots.length === 0) {
      try {
        const defaultSlotsToCreate = [
          { date: tomorrow, startTime: '07:00 AM', endTime: '09:00 AM', maxCapacity: 20, bookedCount: 0, isActive: true },
          { date: tomorrow, startTime: '09:00 AM', endTime: '11:00 AM', maxCapacity: 20, bookedCount: 0, isActive: true }
        ];
        slots = await DeliverySlot.insertMany(defaultSlotsToCreate);
      } catch (e) {
        // In case multiple concurrent requests try to insert default slots simultaneously
        slots = await DeliverySlot.find({
          date: { $gte: tomorrow, $lt: nextDay },
          isActive: true,
        }).sort({ startTime: 1 });
      }
    }

    // Transform to show availability
    const availableSlots = slots.map((slot) => ({
      _id: slot._id,
      timeRange: slot.timeRange || `${slot.startTime} - ${slot.endTime}`,
      available: (slot.bookedCount || 0) < (slot.maxCapacity || 20),
      maxCapacity: slot.maxCapacity || 20,
      bookedCount: slot.bookedCount || 0,
    }));

    return res.json({
      success: true,
      data: availableSlots,
      bookingClosed: false,
      targetDate: tomorrow,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getNextDayProducts = async (_req: Request, res: Response) => {
  try {
    // Determine category based on query if needed, or return all enabled
    const products = await Product.find({
      "nextDay.enabled": true,
      publish: true, // Should still be published globally? Assuming yes
      status: "Active",
    }).select("productName productImages price mainImage nextDay unit"); // Select relevant fields

    // Map to simplified structure for frontend card
    const mappedProducts = products.map((p) => {
      // Fallback to regular price if nextDay price not set
      const price = p.nextDay?.price || p.price;
      const stock = p.nextDay?.stock || 0;

      return {
        _id: p._id,
        name: p.productName,
        image: p.mainImage || (p.galleryImages && p.galleryImages[0]) || "",
        price: price,
        originalPrice: p.price, // For comparison if needed
        stock: stock,
        maxQuantity: 10, // Default max per user?
      };
    });

    return res.json({
      success: true,
      data: mappedProducts,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getNextDayContent = async (_req: Request, res: Response) => {
  try {
    // 1. Fetch all active root categories
    const categories = await Category.find({ status: "Active", parentId: null })
      .sort({ order: 1 })
      .lean();

    // 2. Fetch all products enabled for next day
    const nextDayProducts = await Product.find({
      "nextDay.enabled": true,
      status: "Active",
      publish: true
    })
      .select("productName price discPrice compareAtPrice mainImage galleryImages stock nextDay unit category subcategory variations variationType pack discount totalAllowedQuantity isReturnable shelfLife marketer")
      .lean();

    // 3. Build hierarchy: Category -> Subcategory -> Products
    const enhancedSections = await Promise.all(categories.map(async (cat: any) => {
      // Find subcategories for this category
      const subcategories = await SubCategory.find({ category: cat._id })
        .sort({ order: 1 })
        .lean();

      // Find products for this category
      const catProducts = nextDayProducts.filter(p => p.category?.toString() === cat._id.toString());

      if (catProducts.length === 0) return null;

      const mappedProducts = catProducts.map(p => {
        const sellingPrice = p.nextDay?.price || p.discPrice || p.price;
        const mrpPrice = p.compareAtPrice || p.price;
        const stock = p.nextDay?.stock !== undefined ? p.nextDay.stock : p.stock;

        return {
          ...p,
          _id: p._id,
          id: p._id,
          productName: p.productName,
          name: p.productName,
          image: p.mainImage,
          price: sellingPrice,
          discPrice: sellingPrice,
          compareAtPrice: mrpPrice,
          mrp: mrpPrice,
          originalPrice: mrpPrice,
          stock: stock,
          unit: p.unit || p.pack,
          pack: p.pack || p.unit,
          imageUrl: p.mainImage,
          galleryImages: p.galleryImages || []
        };
      });

      return {
        _id: cat._id,
        id: cat._id,
        title: cat.name,
        name: cat.name,
        displayType: "products",
        products: mappedProducts,
        subcategories: subcategories.map(s => ({
          _id: s._id,
          name: s.name,
          image: s.image
        }))
      };
    }));

    return res.json({
      success: true,
      data: enhancedSections.filter(Boolean),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const placeNextDayOrder = async (req: Request, res: Response) => {
  try {
    if (!isBookingOpen()) {
      return res.status(400).json({ success: false, message: "Booking closed for tomorrow" });
    }

    const { items, slotId, paymentMethod } = req.body;
    const customerId = (req as any).user?.userId;

    if (!customerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const slot = await DeliverySlot.findById(slotId);
    if (!slot) return res.status(400).json({ success: false, message: "Invalid slot" });

    if (slot.bookedCount >= slot.maxCapacity) {
      return res.status(400).json({ success: false, message: "Slot is full" });
    }

    // Load customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    let subtotal = 0;
    const orderItems = [];
    const sellers = new Set<string>();

    for (const item of items) {
      const product: any = await Product.findById(item.product).lean();
      if (!product) continue;

      const price = item.price || product.price;
      subtotal += price * item.quantity;

      const sellerId = product.seller || product.sellerId || (product as any).shopId; // Ensure seller ref is populated correctly later
      if (sellerId) sellers.add(sellerId.toString());

      orderItems.push({
        product: product._id,
        productName: product.productName,
        image: product.mainImage,
        price: price,
        quantity: item.quantity,
        unit: product.unit,
        pack: product.pack,
        seller: sellerId
      });
    }

    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const orderNumber = `NDO${timestamp}${random}`;

    const newOrder = new NextDayOrder({
      orderNumber,
      customer: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      address: {
        address: customer.address || "N/A",
        city: customer.city || "N/A",
        pincode: customer.pincode || "123456",
        latitude: customer.latitude,
        longitude: customer.longitude
      },
      slot: slot._id,
      deliveryDate: slot.date,
      timeRange: slot.timeRange || `${slot.startTime} - ${slot.endTime}`,
      items: orderItems,
      subtotal: subtotal,
      total: subtotal, // Add delivery charges if needed later
      status: "Pending",
      paymentMethod: paymentMethod || "COD",
      paymentStatus: "Pending",
      sellers: Array.from(sellers)
    });

    await newOrder.save();

    slot.bookedCount += 1;
    await slot.save();

    return res.json({
      success: true,
      message: "Order placed successfully for tomorrow!",
      orderId: newOrder._id
    });

  } catch (error: any) {
    console.error("placeNextDayOrder error:", error);
    return res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
};

// --- ADMIN APIS ---

export const createDailySlots = async (req: Request, res: Response) => {
  try {
    const { date, slots } = req.body; // slots: [{ startTime, endTime, maxCapacity }]
    const targetDate = new Date(date);

    const createdSlots = [];
    for (const s of slots) {
      const newSlot = await DeliverySlot.create({
        date: targetDate,
        startTime: s.startTime,
        endTime: s.endTime,
        maxCapacity: s.maxCapacity || 20
      });
      createdSlots.push(newSlot);
    }

    return res.json({ success: true, data: createdSlots });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- SELLER APIS ---

export const getSellerNextDayOrders = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.userId;
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Give the seller all next day orders that contain at least one of their products
    const orders = await NextDayOrder.find({ sellers: sellerId })
      .populate("slot", "date startTime endTime")
      .sort({ createdAt: -1 })
      .lean();

    // Map orders to show only relevant items for this seller
    const sellerOrders = orders.map((order: any) => {
      const myItems = order.items.filter((item: any) => item.seller?.toString() === sellerId);
      const mySubtotal = myItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        address: order.address,
        deliveryDate: order.deliveryDate,
        timeRange: order.timeRange,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        items: myItems,
        subtotal: mySubtotal
      };
    });

    return res.json({ success: true, data: sellerOrders });
  } catch (error: any) {
    console.error("getSellerNextDayOrders error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSellerNextDayOrderById = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.userId;
    const { id } = req.params;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const NextDayOrder = (await import("../models/NextDayOrder")).default;
    const orderDoc = await NextDayOrder.findOne({ _id: id, sellers: sellerId })
      .populate("slot", "date startTime endTime")
      .lean();

    if (!orderDoc) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderDoc as any;

    // Filter items inside order to only include seller's items
    const myItems = order.items.filter((item: any) => item.seller?.toString() === sellerId);

    // Transform into OrderDetail format
    const transformedOrder = {
      id: order._id,
      invoiceNumber: order.orderNumber,
      orderDate: (order as any).createdAt?.toISOString() || order.deliveryDate,
      deliveryDate: order.deliveryDate,
      timeSlot: order.timeRange || "N/A",
      status: order.status,
      customerName: order.customerName || "N/A",
      customerEmail: "N/A", // Email not collected yet
      customerPhone: order.customerPhone || "N/A",
      deliveryBoyName: "N/A",
      deliveryBoyPhone: "N/A",
      items: myItems.map((item: any, idx: number) => ({
        srNo: String(idx + 1),
        product: item.productName || "Unknown Product",
        soldBy: "N/A",
        unit: item.unit || item.pack || "N/A",
        price: item.price,
        tax: 0,
        taxPercent: 0,
        qty: item.quantity,
        subtotal: item.price * item.quantity
      })),
      subtotal: myItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
      tax: 0,
      grandTotal: myItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
      paymentMethod: order.paymentMethod || "COD",
      paymentStatus: order.paymentStatus || "Pending",
      deliveryAddress: order.address || {}
    };

    return res.json({ success: true, data: transformedOrder });
  } catch (error: any) {
    console.error("getSellerNextDayOrderById error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSellerNextDayOrderStatus = async (req: Request, res: Response) => {
  try {
    const sellerId = (req as any).user?.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const NextDayOrder = (await import("../models/NextDayOrder")).default;
    const order = await NextDayOrder.findOne({ _id: id, sellers: sellerId });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.status = status;
    await order.save();

    return res.json({ success: true, data: { id: order._id, status: order.status } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

