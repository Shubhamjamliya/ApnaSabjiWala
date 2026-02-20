import express from "express";
import { authenticate as protect, requireUserType } from "../middleware/auth";
import { getPageConfig, updatePageConfig } from "../controllers/pageConfigController";

const router = express.Router();

const admin = requireUserType("Admin");

router.get("/:page", protect, admin, getPageConfig);
router.post("/:page", protect, admin, updatePageConfig);

export default router;
