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
      if (!card.subCategoryId) {
        return res.status(400).json({
          success: false,
          message: "SubCategory ID is required for each shortcut card",
        });
      }
      // Assuming we don't strictly need to check SubCategory existence here for performance, 
      // but if we do, it's safer.
    }
  }

  // Validate featured products
  if (featuredProducts && Array.isArray(featuredProducts)) {
    for (const productId of featuredProducts) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID "${productId}" not found`,
        });
      }
    }
  }

  const promoStrip = await PromoStrip.create({
    headerCategorySlug: headerCategorySlug.toLowerCase(),
    productCategoryId,
    heading,
    saleText,
    startDate: start,
    endDate: end,
    categoryCards: categoryCards || [],
    featuredProducts: featuredProducts || [],
    isActive,
    order,
  });

  const populated = await PromoStrip.findById(promoStrip._id)
    .populate("productCategoryId", "name slug")
    .populate("categoryCards.subCategoryId", "name image")
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
    .populate("featuredProducts", "productName mainImage price mrp")
    .sort(sort);

  // Ensure HOME (all) always exists by default
  const homeStripExists = await PromoStrip.findOne({ headerCategorySlug: "all" });
  if (!homeStripExists) {
    // Fetch some default subcategories and products to seed
    const defaultCats = await Category.find({ parentId: null }).limit(4).lean();
    const defaultProducts = await Product.find({ status: "Active" }).limit(4).lean();

    const newHomeStrip = await PromoStrip.create({
      headerCategorySlug: "all",
      heading: "HOUSEFULL SALE",
      saleText: "FLAT 50% OFF",
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      isActive: true,
      order: 0,
      categoryCards: defaultCats.map((c, i) => ({
        subCategoryId: c._id,
        title: (c as any).name,
        badge: "MIN 50% OFF",
        discountPercentage: 50,
        order: i,
        images: (c as any).image ? [(c as any).image] : []
      })),
      featuredProducts: defaultProducts.map(p => p._id),
      crazyDealsTitle: "CRAZY DEALS"
    });

    const populatedHome = await PromoStrip.findById(newHomeStrip._id)
      .populate("productCategoryId", "name slug")
      .populate("categoryCards.subCategoryId", "name image")
      .populate("featuredProducts", "productName mainImage price mrp");

    if (populatedHome) {
      promoStrips.unshift(populatedHome as any);
    }
  }

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

  // Validate category cards if provided
  if (categoryCards && Array.isArray(categoryCards)) {
    for (const card of categoryCards) {
      if (card.subCategoryId) {
        // Validation could be added here if needed, but subCategoryId is correctly mapped
      }
    }
    promoStrip.categoryCards = categoryCards;
  }

  // Validate featured products if provided
  if (featuredProducts && Array.isArray(featuredProducts)) {
    for (const productId of featuredProducts) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID "${productId}" not found`,
        });
      }
    }
    promoStrip.featuredProducts = featuredProducts;
  }

  if (heading !== undefined) promoStrip.heading = heading;
  if (saleText !== undefined) promoStrip.saleText = saleText;
  if (isActive !== undefined) promoStrip.isActive = isActive;
  if (order !== undefined) promoStrip.order = order;
  if (productCategoryId !== undefined) promoStrip.productCategoryId = productCategoryId;

  await promoStrip.save();

  const populated = await PromoStrip.findById(promoStrip._id)
    .populate("productCategoryId", "name slug")
    .populate("categoryCards.subCategoryId", "name image")
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

  // Prevent deletion of system default HOME strip
  if (promoStrip.headerCategorySlug === 'all') {
    return res.status(403).json({
      success: false,
      message: "The HOME system campaign cannot be deleted. You can only deactivate or edit it.",
    });
  }

  await PromoStrip.findByIdAndDelete(id);

  // Invalidate cache for this header category slug
  cache.delete(`promoStrip-${promoStrip.headerCategorySlug.toLowerCase()}`);

  return res.status(200).json({
    success: true,
    message: "PromoStrip deleted successfully",
  });
});

