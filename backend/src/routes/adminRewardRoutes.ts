import { Router } from "express";
import {
  addRewardItem,
  getRewardItems,
  updateRewardItem,
  deleteRewardItem,
  getRewardOrders,
  updateRewardOrderStatus,
  addRewardRule,
  getRewardRules,
  updateRewardRule,
  deleteRewardRule,
} from "../modules/admin/controllers/adminRewardController";

const router = Router();

router.post("/items", addRewardItem);
router.get("/items", getRewardItems);
router.put("/items/:id", updateRewardItem);
router.delete("/items/:id", deleteRewardItem);

router.get("/orders", getRewardOrders);
router.put("/orders/:id/status", updateRewardOrderStatus);

router.post("/rules", addRewardRule);
router.get("/rules", getRewardRules);
router.put("/rules/:id", updateRewardRule);
router.delete("/rules/:id", deleteRewardRule);

export default router;
