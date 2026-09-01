import { Router } from "express";
import {
  applyReferralCode,
  getReferralDetails,
} from "../modules/customer/controllers/customerReferralController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireUserType("Customer"));

router.get("/details", getReferralDetails);
router.post("/apply", applyReferralCode);

export default router;
