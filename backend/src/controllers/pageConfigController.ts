import { Request, Response } from "express";
import PageConfig from "../models/PageConfig";

export const getPageConfig = async (req: Request, res: Response) => {
  try {
    const { page } = req.params;
    const config = await PageConfig.findOne({ page }).populate("sections");

    // If we want to return just the ID list or full objects, populate handles objects. 
    // Admin might need full objects to show details, or just IDs if we list all separately.
    // Let's return populated for preview/list.

    if (!config) {
      return res.status(200).json({ success: true, data: { page, sections: [] } });
    }
    return res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error("Error fetching page config:", error);
    return res.status(500).json({ success: false, message: "Error fetching page config", error });
  }
};

export const updatePageConfig = async (req: Request, res: Response) => {
  try {
    const { page } = req.params;
    const { sections } = req.body; // Expecting array of HomeSection IDs

    if (!Array.isArray(sections)) {
      return res.status(400).json({ success: false, message: "Sections must be an array of IDs" });
    }

    const config = await PageConfig.findOneAndUpdate(
      { page },
      { sections },
      { new: true, upsert: true }
    ).populate("sections");

    return res.status(200).json({ success: true, data: config, message: "Page configuration updated" });
  } catch (error) {
    console.error("Error updating page config:", error);
    return res.status(500).json({ success: false, message: "Error updating page config", error });
  }
};

