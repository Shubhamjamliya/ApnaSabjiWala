import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import RewardItem from "../../../models/RewardItem";
import RewardOrder from "../../../models/RewardOrder";

/**
 * Add a new reward item
 */
export const addRewardItem = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, coinsRequired, imageUrl, stock, isActive } = req.body;

  const rewardItem = await RewardItem.create({
    name,
    description,
    coinsRequired,
    imageUrl,
    stock,
    isActive,
  });

  return res.status(201).json({
    success: true,
    message: "Reward item added successfully",
    data: rewardItem,
  });
});

/**
 * Get all reward items (including inactive)
 */
export const getRewardItems = asyncHandler(async (_req: Request, res: Response) => {
  const items = await RewardItem.find().sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    message: "Reward items fetched successfully",
    data: items,
  });
});

/**
 * Update a reward item
 */
export const updateRewardItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const item = await RewardItem.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Reward item not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Reward item updated successfully",
    data: item,
  });
});

/**
 * Delete a reward item
 */
export const deleteRewardItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const item = await RewardItem.findByIdAndDelete(id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Reward item not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Reward item deleted successfully",
  });
});

/**
 * Get all reward redemptions
 */
export const getRewardOrders = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await RewardOrder.find()
    .populate("customer", "name email phone")
    .populate("rewardItem", "name imageUrl")
    .sort({ orderDate: -1 });

  return res.status(200).json({
    success: true,
    message: "Reward orders fetched successfully",
    data: orders,
  });
});

// Update reward order status (e.g. Fulfilled)
export const updateRewardOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Pending', 'Fulfilled', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    });
  }

  const order = await RewardOrder.findByIdAndUpdate(id, { status }, { new: true })
    .populate("customer", "name email phone")
    .populate("rewardItem", "name imageUrl");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Reward order not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: `Reward order marked as ${status}`,
    data: order,
  });
});
