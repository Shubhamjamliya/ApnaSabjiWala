import { Router } from "express";
import {
  getRewards,
  redeemReward,
  getMyRedemptions
} from "../modules/customer/controllers/customerRewardController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireUserType("Customer"));

router.get("/", getRewards);
router.post("/redeem/:id", redeemReward);
router.get("/redemptions", getMyRedemptions);

export default router;
