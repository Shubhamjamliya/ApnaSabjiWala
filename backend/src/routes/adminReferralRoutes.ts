import { Router } from "express";
import {
  getAdminReferralSettings,
  updateAdminReferralSettings,
  getAdminReferralList,
} from "../modules/admin/controllers/adminReferralController";
import { authenticate, requireUserType } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireUserType("Admin"));

router.get("/settings", getAdminReferralSettings);
router.put("/settings", updateAdminReferralSettings);
router.get("/list", getAdminReferralList);

export default router;
