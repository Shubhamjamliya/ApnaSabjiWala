import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import AppSettings from "../../../models/AppSettings";
import Referral from "../../../models/Referral";

/**
 * Get Referral Settings for Admin
 */
export const getAdminReferralSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await AppSettings.getSettings();
  const referralSettings = settings.referralSettings || {
    enabled: true,
    referrerCoins: 10,
    refereeCoins: 5,
    rewardTrigger: "signup",
    minOrderAmount: 0,
  };

  return res.status(200).json({
    success: true,
    data: referralSettings,
  });
});

/**
 * Update Referral Settings by Admin
 */
export const updateAdminReferralSettings = asyncHandler(async (req: Request, res: Response) => {
  const { enabled, referrerCoins, refereeCoins, rewardTrigger, minOrderAmount } = req.body;

  const settings = await AppSettings.getSettings();

  settings.referralSettings = {
    enabled: typeof enabled === "boolean" ? enabled : true,
    referrerCoins: Number(referrerCoins) || 0,
    refereeCoins: Number(refereeCoins) || 0,
    rewardTrigger: rewardTrigger === "first_order_delivered" ? "first_order_delivered" : "signup",
    minOrderAmount: Number(minOrderAmount) || 0,
  };

  await settings.save();

  return res.status(200).json({
    success: true,
    message: "Referral settings updated successfully",
    data: settings.referralSettings,
  });
});

/**
 * Get All Referral Logs / History
 */
export const getAdminReferralList = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const [referrals, total] = await Promise.all([
    Referral.find()
      .populate("referrer", "name phone email")
      .populate("referee", "name phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Referral.countDocuments(),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      referrals,
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  });
});
