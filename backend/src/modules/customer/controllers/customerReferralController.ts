import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import Customer from "../../../models/Customer";
import Referral from "../../../models/Referral";
import AppSettings from "../../../models/AppSettings";
import CoinTransaction from "../../../models/CoinTransaction";

/**
 * Apply a referral code (Called after first login / welcome modal)
 */
export const applyReferralCode = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.userId;
  const { referralCode } = req.body;

  if (!referralCode || typeof referralCode !== "string" || !referralCode.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid referral code",
    });
  }

  const cleanCode = referralCode.trim().toUpperCase();

  // Get App Settings
  const settings = await AppSettings.getSettings();
  const referralConfig = settings.referralSettings;

  if (referralConfig && referralConfig.enabled === false) {
    return res.status(400).json({
      success: false,
      message: "Referral program is currently inactive",
    });
  }

  const referrerCoins = referralConfig?.referrerCoins ?? 10;
  const refereeCoins = referralConfig?.refereeCoins ?? 5;
  const rewardTrigger = referralConfig?.rewardTrigger ?? "signup";

  // Check if current user exists
  const referee = await Customer.findById(customerId);
  if (!referee) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Check if current user is already referred
  const existingReferral = await Referral.findOne({ referee: customerId });
  if (existingReferral) {
    return res.status(400).json({
      success: false,
      message: "You have already claimed a referral bonus",
    });
  }

  // Find referrer
  const referrer = await Customer.findOne({ refCode: cleanCode });
  if (!referrer) {
    return res.status(404).json({
      success: false,
      message: "Invalid referral code. No user found with this code.",
    });
  }

  // Prevent self-referral
  if (referrer._id.toString() === customerId?.toString()) {
    return res.status(400).json({
      success: false,
      message: "You cannot use your own referral code",
    });
  }

  // Check if reward is instant on signup
  if (rewardTrigger === "signup") {
    // Credit referee
    referee.rewardCoins = (referee.rewardCoins || 0) + refereeCoins;
    await referee.save();

    // Credit referrer
    referrer.rewardCoins = (referrer.rewardCoins || 0) + referrerCoins;
    await referrer.save();

    // Create Coin Transactions
    await Promise.all([
      CoinTransaction.create({
        customer: referee._id,
        type: "Earned",
        amount: refereeCoins,
        description: `Referral Welcome Bonus (Code: ${cleanCode})`,
      }),
      CoinTransaction.create({
        customer: referrer._id,
        type: "Earned",
        amount: referrerCoins,
        description: `Referral Reward for inviting ${referee.name || "a friend"}`,
      }),
      Referral.create({
        referrer: referrer._id,
        referee: referee._id,
        referralCode: cleanCode,
        referrerCoins,
        refereeCoins,
        status: "Completed",
        rewardTrigger: "signup",
        completedAt: new Date(),
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: `🎉 Success! You received ${refereeCoins} coins as a welcome bonus!`,
      data: {
        coinsAdded: refereeCoins,
        totalCoins: referee.rewardCoins,
      },
    });
  } else {
    // Reward on first order delivered
    await Referral.create({
      referrer: referrer._id,
      referee: referee._id,
      referralCode: cleanCode,
      referrerCoins,
      refereeCoins,
      status: "Pending",
      rewardTrigger: "first_order_delivered",
    });

    return res.status(200).json({
      success: true,
      message: `Referral code applied! You will receive ${refereeCoins} coins once your first order is delivered.`,
      data: {
        status: "Pending",
      },
    });
  }
});

/**
 * Get current user's referral info and history
 */
export const getReferralDetails = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.userId;

  const customer = await Customer.findById(customerId).select("refCode name rewardCoins");
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  }

  // Ensure refCode exists
  if (!customer.refCode) {
    const namePart = (customer.name || "USER")
      .replace(/\s+/g, "")
      .substring(0, 4)
      .toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    customer.refCode = `${namePart}${randomPart}`;
    await customer.save();
  }

  const settings = await AppSettings.getSettings();
  const config = settings.referralSettings || {
    enabled: true,
    referrerCoins: 10,
    refereeCoins: 5,
    rewardTrigger: "signup",
  };

  const referrals = await Referral.find({ referrer: customerId })
    .populate("referee", "name phone createdAt")
    .sort({ createdAt: -1 });

  const totalCoinsEarned = referrals
    .filter((r) => r.status === "Completed")
    .reduce((sum, r) => sum + (r.referrerCoins || 0), 0);

  return res.status(200).json({
    success: true,
    data: {
      refCode: customer.refCode,
      coins: customer.rewardCoins || 0,
      config,
      totalReferred: referrals.length,
      totalCoinsEarned,
      referrals,
    },
  });
});
