import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import PromoStrip from "../../../models/PromoStrip";
import { cache } from "../../../utils/cache";
import Category from "../../../models/Category";
import Product from "../../../models/Product";
import HeaderCategory from "../../../models/HeaderCategory";

/**
 * Create a new PromoStrip
 */
export const createPromoStrip = asyncHandler(async (req: Request, res: Response) => {
  const {
    headerCategorySlug,
    productCategoryId,
    heading,
    saleText,
    startDate,
    endDate,
    categoryCards,
    featuredProducts,
    isActive = true,
    order = 0,
  } = req.body;

  // Validation
  if (!headerCategorySlug || !heading || !saleText || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Header category slug, heading, sale text, start date, and end date are required",
    });
  }

  // Validate header category exists (allow "all" as a special case)
  if (headerCategorySlug.toLowerCase() !== "all") {
    const headerCategory = await HeaderCategory.findOne({ slug: headerCategorySlug });
    if (!headerCategory) {
      return res.status(404).json({
        success: false,
        message: `Header category with slug "${headerCategorySlug}" not found`,
      });
    }
  }

  // Validate product category if provided
  if (productCategoryId) {
    const category = await Category.findById(productCategoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Product category with ID "${productCategoryId}" not found`,
      });
    }
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) {
    return res.status(400).json({
      success: false,
      message: "End date must be after start date",
    });
  }

  // Validate category cards (subcategories)
  if (categoryCards && Array.isArray(categoryCards)) {
    for (const card of categoryCards) {
      if (!card.subCategoryId && !card.productId) {
        return res.status(400).json({
          success: false,
          message: "Either SubCategory ID or Product ID is required for each shortcut card",
        });
      }
      // Assuming we don't strictly need to check SubCategory existence here for performance, 
      // but if we do, it's safer.
    }
  }

  // Sanitize empty strings to null to prevent Cast to ObjectId errors
  const sanitizedProductCategoryId = productCategoryId === "" ? null : productCategoryId;
  const sanitizedCards = (categoryCards || []).map((card: any) => ({
    ...card,
    subCategoryId: card.subCategoryId === "" ? null : card.subCategoryId,
    productId: card.productId === "" ? null : card.productId,
  }));
  const sanitizedFeaturedProducts = (featuredProducts || []).filter((id: string) => id !== "");

  // Validate featured products
  for (const productId of sanitizedFeaturedProducts) {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID "${productId}" not found`,
      });
    }
  }

  const promoStrip = await PromoStrip.create({
    headerCategorySlug: headerCategorySlug.toLowerCase(),
    productCategoryId: sanitizedProductCategoryId,
    heading,
    saleText,
    startDate: start,
    endDate: end,
    categoryCards: sanitizedCards,
    featuredProducts: sanitizedFeaturedProducts,
    isActive,
    order,
  });

  const populated = await PromoStrip.findById(promoStrip._id)
    .populate("productCategoryId", "name slug")
    .populate("categoryCards.subCategoryId", "name image")
    .populate("categoryCards.productId", "productName mainImage")
    .populate("featuredProducts", "productName mainImage price mrp");

  // Invalidate cache for this header category slug
  cache.delete(`promoStrip-${headerCategorySlug.toLowerCase()}`);

  return res.status(201).json({
    success: true,
    message: "PromoStrip created successfully",
    data: populated,
  });
});

/**
 * Get all PromoStrips
 */
export const getAllPromoStrips = asyncHandler(async (req: Request, res: Response) => {
  const { headerCategorySlug, isActive, sortBy = "order", sortOrder = "asc" } = req.query;

  let query: any = {};

  if (headerCategorySlug) {
    query.headerCategorySlug = (headerCategorySlug as string).toLowerCase();
  }

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const sort: any = {};
  if (sortBy === "order") {
    sort.order = sortOrder === "desc" ? -1 : 1;
    sort.createdAt = -1;
  } else {
    sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;
  }

  const promoStrips = await PromoStrip.find(query)
    .populate("productCategoryId", "name slug")
    .populate("categoryCards.subCategoryId", "name image")
    .populate("categoryCards.productId", "productName mainImage")
    .populate("featuredProducts", "productName mainImage price mrp")
    .sort(sort);

  return res.status(200).json({
    success: true,
    message: "PromoStrips fetched successfully",
    data: promoStrips,
  });
});

/**
 * Get PromoStrip by ID
 */
export const getPromoStripById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const promoStrip = await PromoStrip.findById(id)
    .populate("productCategoryId", "name slug")
    .populate("categoryCards.subCategoryId", "name image")
    .populate("categoryCards.productId", "productName mainImage")
    .populate("featuredProducts", "productName mainImage price mrp");

  if (!promoStrip) {
    return res.status(404).json({
      success: false,
      message: "PromoStrip not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "PromoStrip fetched successfully",
    data: promoStrip,
  });
});

/**
 * Update PromoStrip
 */
export const updatePromoStrip = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    headerCategorySlug,
    productCategoryId,
    heading,
    saleText,
    startDate,
    endDate,
    categoryCards,
    featuredProducts,
    isActive,
    order,
  } = req.body;

  const promoStrip = await PromoStrip.findById(id);
  if (!promoStrip) {
    return res.status(404).json({
      success: false,
      message: "PromoStrip not found",
    });
  }

  // Validate header category if provided (allow "all" as a special case)
  if (headerCategorySlug) {
    if (headerCategorySlug.toLowerCase() !== "all") {
      const headerCategory = await HeaderCategory.findOne({ slug: headerCategorySlug });
      if (!headerCategory) {
        return res.status(404).json({
          success: false,
          message: `Header category with slug "${headerCategorySlug}" not found`,
        });
      }
    }
    promoStrip.headerCategorySlug = headerCategorySlug.toLowerCase();
  }

  // Validate dates if provided
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : promoStrip.startDate;
    const end = endDate ? new Date(endDate) : promoStrip.endDate;
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }
    if (startDate) promoStrip.startDate = start;
    if (endDate) promoStrip.endDate = end;
  }

  if (heading !== undefined) promoStrip.heading = heading;
  if (saleText !== undefined) promoStrip.saleText = saleText;
  if (isActive !== undefined) promoStrip.isActive = isActive;
  if (order !== undefined) promoStrip.order = order;
  
  // Sanitize empty string to null for productCategoryId
  if (productCategoryId !== undefined) {
    promoStrip.productCategoryId = productCategoryId === "" ? null : (productCategoryId as any);
  }

  // Sanitize empty strings in categoryCards if provided
  if (categoryCards && Array.isArray(categoryCards)) {
    (promoStrip as any).categoryCards = categoryCards.map((card: any) => ({
      ...card,
      subCategoryId: card.subCategoryId === "" ? null : card.subCategoryId,
      productId: card.productId === "" ? null : card.productId,
    }));
  }

  // Sanitize and validate featured products if provided
  if (featuredProducts && Array.isArray(featuredProducts)) {
    const sanitizedFeaturedProducts = featuredProducts.filter((id: string) => id !== "");
    for (const productId of sanitizedFeaturedProducts) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID "${productId}" not found`,
        });
      }
    }
    promoStrip.featuredProducts = sanitizedFeaturedProducts as any;
  }

  await promoStrip.save();

  const populated = await PromoStrip.findById(promoStrip._id)
    .populate("productCategoryId", "name slug")
    .populate("categoryCards.subCategoryId", "name image")
    .populate("categoryCards.productId", "productName mainImage")
    .populate("featuredProducts", "productName mainImage price mrp");

  // Invalidate cache for this header category slug
  cache.delete(`promoStrip-${promoStrip.headerCategorySlug.toLowerCase()}`);

  return res.status(200).json({
    success: true,
    message: "PromoStrip updated successfully",
    data: populated,
  });
});

/**
 * Delete PromoStrip
 */
export const deletePromoStrip = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const promoStrip = await PromoStrip.findById(id);
  if (!promoStrip) {
    return res.status(404).json({
      success: false,
      message: "PromoStrip not found",
    });
  }

  // No longer blocking deletion of "all" strip as user has full control now.

  await PromoStrip.findByIdAndDelete(id);

  // Invalidate cache for this header category slug
  cache.delete(`promoStrip-${promoStrip.headerCategorySlug.toLowerCase()}`);

  return res.status(200).json({
    success: true,
    message: "PromoStrip deleted successfully",
  });
});

