import { Request, Response } from "express";
import mongoose from "mongoose";
import AdBanner from "../../../models/AdBanner";
import { asyncHandler } from "../../../utils/asyncHandler";

const parseHttpUrl = (value: unknown, label: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized || normalized.length > 2048) {
    throw new Error(`${label} is required and must be 2048 characters or fewer`);
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${label} must start with http:// or https://`);
  }
  return parsed.toString();
};

const parsePayload = (body: any) => {
  const input = body?.adBanner;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Ads banner settings are required");
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length > 120) throw new Error("Banner title must be 120 characters or fewer");
  if (typeof input.isActive !== "boolean") throw new Error("Banner active status must be true or false");

  const order = Number(input.order);
  if (!Number.isInteger(order) || order < 0) throw new Error("Banner order must be a non-negative whole number");

  return {
    imageUrl: parseHttpUrl(input.imageUrl, "Banner image URL"),
    linkUrl: parseHttpUrl(input.linkUrl, "Banner link"),
    title,
    isActive: input.isActive,
    order,
  };
};

export const getAdBanners = asyncHandler(async (_req: Request, res: Response) => {
  const banners = await AdBanner.find().sort({ order: 1, createdAt: 1 });
  return res.status(200).json({ success: true, message: "Ads banners fetched successfully", data: banners });
});

export const createAdBanner = asyncHandler(async (req: Request, res: Response) => {
  try {
    const banner = await AdBanner.create(parsePayload(req.body));
    return res.status(201).json({ success: true, message: "Ads banner created successfully", data: banner });
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Invalid ads banner" });
  }
});

export const updateAdBanner = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid ads banner ID" });
  }

  try {
    const banner = await AdBanner.findByIdAndUpdate(req.params.id, parsePayload(req.body), {
      new: true,
      runValidators: true,
    });
    if (!banner) return res.status(404).json({ success: false, message: "Ads banner not found" });
    return res.status(200).json({ success: true, message: "Ads banner updated successfully", data: banner });
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Invalid ads banner" });
  }
});

export const deleteAdBanner = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid ads banner ID" });
  }
  const banner = await AdBanner.findByIdAndDelete(req.params.id);
  if (!banner) return res.status(404).json({ success: false, message: "Ads banner not found" });
  return res.status(200).json({ success: true, message: "Ads banner deleted successfully" });
});
