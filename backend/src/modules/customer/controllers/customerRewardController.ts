import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import RewardItem from "../../../models/RewardItem";
import RewardOrder from "../../../models/RewardOrder";
import Customer from "../../../models/Customer";

/**
 * Get available reward items and user's coin balance
 */
export const getRewards = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.userId;

  const [customer, items] = await Promise.all([
    Customer.findById(customerId).select("rewardCoins"),
    RewardItem.find({ isActive: true, stock: { $gt: 0 } }).sort({ coinsRequired: 1 }),
  ]);

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Rewards fetched successfully",
    data: {
      coins: customer.rewardCoins || 0,
      items,
    },
  });
});

/**
 * Redeem a reward
 */
export const redeemReward = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // RewardItem ID
  const customerId = req.user?.userId;

  const customer = await Customer.findById(customerId);
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  const rewardItem = await RewardItem.findById(id);
  if (!rewardItem) {
    return res.status(404).json({
      success: false,
      message: "Reward item not found",
    });
  }

  if (!rewardItem.isActive || rewardItem.stock <= 0) {
    return res.status(400).json({
      success: false,
      message: "Reward item is no longer available",
    });
  }

  const currentCoins = customer.rewardCoins || 0;
  if (currentCoins < rewardItem.coinsRequired) {
    return res.status(400).json({
      success: false,
      message: `Not enough coins. You need ${rewardItem.coinsRequired} but have ${currentCoins}.`,
    });
  }

  // Deduct coins & reduce stock
  customer.rewardCoins -= rewardItem.coinsRequired;
  rewardItem.stock -= 1;

  await Promise.all([
    customer.save(),
    rewardItem.save()
  ]);

  // Create RewardOrder
  const rewardOrder = await RewardOrder.create({
    customer: customerId,
    rewardItem: rewardItem._id,
    coinsSpent: rewardItem.coinsRequired,
    status: 'Pending',
  });

  return res.status(200).json({
    success: true,
    message: "Reward redeemed successfully!",
    data: {
      coinsRemaining: customer.rewardCoins,
      rewardOrder,
    },
  });
});

/**
 * Get user's past redemptions 
 */
export const getMyRedemptions = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.userId;

  const redemptions = await RewardOrder.find({ customer: customerId })
    .populate("rewardItem", "name imageUrl")
    .sort({ orderDate: -1 });

  return res.status(200).json({
    success: true,
    message: "Redemptions fetched successfully",
    data: redemptions,
  });
});
