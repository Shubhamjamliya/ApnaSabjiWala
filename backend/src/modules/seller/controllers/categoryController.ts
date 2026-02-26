import { Request, Response } from "express";
import mongoose from "mongoose";
import Category from "../../../models/Category";
import SubCategory from "../../../models/SubCategory";
import Product from "../../../models/Product";
import HeaderCategory from "../../../models/HeaderCategory";
import { asyncHandler } from "../../../utils/asyncHandler";

/**
 * Get all categories (parent categories only by default)
 */
export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { includeSubcategories, search } = req.query;

    // Build query - by default, get only parent categories (no parentId)
    const query: any = { parentId: null };

    // If includeSubcategories is true, get all categories
    if (includeSubcategories === "true") {
      delete query.parentId;
    }

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const categories = await Category.find(query)
      .populate("headerCategoryId", "name slug")
      .sort({ name: 1 });

    // Get subcategory and product counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const subcategoryCount = await SubCategory.countDocuments({
          category: category._id,
        });

        const productCount = await Product.countDocuments({
          category: category._id, // Note: Product model uses 'category', not 'categoryId'
        });

        return {
          ...category.toObject(),
          totalSubcategory: subcategoryCount,
          totalProduct: productCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categoriesWithCounts,
    });
  }
);

/**
 * Get category by ID
 */
export const getCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    let category: any;

    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findById(id);
    } else {
      category = await Category.findOne({ slug: id });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get counts
    const subcategoryCount = await Category.countDocuments({
      parentId: category._id,
    });

    const productCount = await Product.countDocuments({
      categoryId: category._id,
    });

    const categoryWithCounts = {
      ...category.toObject(),
      totalSubcategory: subcategoryCount,
      totalProduct: productCount,
    };

    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      data: categoryWithCounts,
    });
  }
);

/**
 * Get subcategories by parent category ID
 * Supports both old SubCategory model and new Category model (with parentId)
 */
export const getSubcategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      search,
      page = "1",
      limit = "10",
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    // Verify parent category exists - Try slug if ID is not valid, otherwise Try Category, then HeaderCategory, then SubCategory
    let parentCategory: any = null;
    let isHeaderCategory = false;
    let connectedCategoryId: string | null | undefined = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      parentCategory = await Category.findById(id);

      if (!parentCategory) {
        // Check if it's a HeaderCategory
        const headerCategory = await HeaderCategory.findById(id);
        if (headerCategory) {
          parentCategory = headerCategory;
          isHeaderCategory = true;
          connectedCategoryId = headerCategory.relatedCategory;
        } else {
          // Finally check if it's a SubCategory (from the old model)
          const subCategoryParent = await SubCategory.findById(id);
          if (subCategoryParent) {
            parentCategory = subCategoryParent;
          }
        }
      }
    } else {
      // It's a slug - check Category first, then HeaderCategory
      parentCategory = await Category.findOne({ slug: id });
      if (!parentCategory) {
        const headerCategory = await HeaderCategory.findOne({ slug: id });
        if (headerCategory) {
          parentCategory = headerCategory;
          isHeaderCategory = true;
          connectedCategoryId = headerCategory.relatedCategory;
        }
      }
    }

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: "Parent category not found",
      });
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort: any = {};
    const sortField =
      sortBy === "subcategoryName" ? "name" : (sortBy as string);
    sort[sortField] = sortOrder === "asc" ? 1 : -1;

    // Build search query
    const searchQuery = search
      ? { $regex: search as string, $options: "i" }
      : undefined;

    let subcategoriesWithCounts: any[] = [];
    let total = 0;

    // SCENARIO 1: Parent is a HeaderCategory or connected to one
    if (isHeaderCategory) {
      // If header is connected to a category, we fetch that category's subcategories
      if (connectedCategoryId) {
        // Fetch from old SubCategory model
        const oldQuery: any = { category: connectedCategoryId };
        if (searchQuery) oldQuery.name = searchQuery;

        const subs = await SubCategory.find(oldQuery)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean();

        // Also fetch from new Category model (nested subcategories)
        const catQuery: any = { parentId: connectedCategoryId, status: "Active" };
        if (searchQuery) catQuery.name = searchQuery;

        const catSubs = await Category.find(catQuery)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean();

        // Combine
        const combined = [
          ...catSubs.map((c: any) => ({
            _id: c._id.toString(),
            name: c.name,
            subcategoryName: c.name,
            categoryName: parentCategory.name,
            image: c.image,
            subcategoryImage: c.image,
            order: c.order || 0,
            isNewModel: true,
          })),
          ...subs.map((s: any) => ({
            _id: s._id.toString(),
            name: s.name,
            subcategoryName: s.name,
            categoryName: parentCategory.name,
            image: s.image,
            subcategoryImage: s.image,
            order: s.order || 0,
            isNewModel: false,
          })),
        ];

        // Filter uniques and get counts
        const unique = Array.from(new Map(combined.map(v => [v._id, v])).values());
        subcategoriesWithCounts = await Promise.all(unique.map(async (sub: any) => {
          const p1 = await Product.countDocuments({ subcategory: sub._id });
          const p2 = await Product.countDocuments({ category: sub._id });
          return { ...sub, totalProduct: p1 + p2 };
        }));

        const t1 = await SubCategory.countDocuments(oldQuery);
        const t2 = await Category.countDocuments(catQuery);
        total = t1 + t2;
      } else {
        // Fallback: search for categories referencing this header (old way)
        const query: any = { headerCategoryId: parentCategory._id, parentId: null, status: "Active" };
        if (searchQuery) query.name = searchQuery;

        const categories = await Category.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean();

        subcategoriesWithCounts = categories.map((cat: any) => ({
          _id: cat._id.toString(),
          name: cat.name,
          subcategoryName: cat.name,
          categoryName: parentCategory.name,
          image: cat.image,
          subcategoryImage: cat.image,
          order: cat.order || 0,
          totalProduct: 0, // Simplified for fallback
          isNewModel: true,
        }));
        total = await Category.countDocuments(query);
      }
    }
    // SCENARIO 2: Parent is a Category (Root or Child)
    else {
      // Prepare queries for Category and SubCategory models
      const categorySubQuery: any = { parentId: parentCategory._id, status: "Active" };
      if (searchQuery) categorySubQuery.name = searchQuery;

      const oldSubQuery: any = { category: parentCategory._id };
      if (searchQuery) oldSubQuery.name = searchQuery;

      // 1. Get from new Category model (recursive)
      const categorySubcategories = await Category.find(categorySubQuery)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // 2. Get from old SubCategory model
      const oldSubcategories = await SubCategory.find(oldSubQuery)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Combine both results
      const allSubcategories = [
        ...categorySubcategories.map((cat: any) => ({
          _id: cat._id.toString(),
          id: cat._id.toString(),
          name: cat.name,
          subcategoryName: cat.name,
          categoryName: parentCategory.name,
          image: cat.image,
          subcategoryImage: cat.image,
          order: cat.order || 0,
          totalProduct: 0,
          isNewModel: true,
        })),
        ...oldSubcategories.map((sub: any) => ({
          _id: sub._id.toString(),
          id: sub._id.toString(),
          name: sub.name,
          subcategoryName: sub.name,
          categoryName: parentCategory.name,
          image: sub.image,
          subcategoryImage: sub.image,
          order: sub.order || 0,
          totalProduct: 0,
          isNewModel: false,
        })),
      ];

      // Filter uniques
      const uniqueSubcategories = Array.from(
        new Map(
          allSubcategories.map((item) => [item._id.toString(), item])
        ).values()
      ).sort((a: any, b: any) => {
        const aVal = a[sortField] || "";
        const bVal = b[sortField] || "";
        return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });

      // Apply pagination to combined
      const paginated = uniqueSubcategories.slice(skip, skip + limitNum);

      // Get counts
      subcategoriesWithCounts = await Promise.all(
        paginated.map(async (sub: any) => {
          const productCountOld = await Product.countDocuments({ subcategory: sub._id });
          const productCountNew = await Product.countDocuments({ category: sub._id });
          return { ...sub, totalProduct: productCountOld + productCountNew };
        })
      );

      const totalNew = await Category.countDocuments(categorySubQuery);
      const totalOld = await SubCategory.countDocuments(oldSubQuery);
      total = totalNew + totalOld;
    }

    return res.status(200).json({
      success: true,
      message: "Subcategories fetched successfully",
      data: subcategoriesWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  }
);

/**
 * Get all categories with their subcategories nested
 */
export const getAllCategoriesWithSubcategories = asyncHandler(
  async (_req: Request, res: Response) => {
    // Get all parent categories
    const parentCategories = await Category.find({ parentId: null }).sort({
      name: 1,
    });

    // Get all subcategories grouped by parent
    const categoriesWithSubcategories = await Promise.all(
      parentCategories.map(async (category) => {
        const subcategories = await SubCategory.find({
          category: category._id,
        }).sort({ name: 1 });

        // Get product counts
        const subcategoriesWithCounts = await Promise.all(
          subcategories.map(async (subcategory) => {
            const productCount = await Product.countDocuments({
              subcategory: subcategory._id,
            });

            return {
              ...subcategory.toObject(),
              totalProduct: productCount,
            };
          })
        );

        const subcategoryCount = subcategories.length;
        const productCount = await Product.countDocuments({
          category: category._id,
        });

        return {
          ...category.toObject(),
          totalSubcategory: subcategoryCount,
          totalProduct: productCount,
          subcategories: subcategoriesWithCounts,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Categories with subcategories fetched successfully",
      data: categoriesWithSubcategories,
    });
  }
);

/**
 * Get all subcategories (across all categories)
 */
export const getAllSubcategories = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      search,
      page = "1",
      limit = "10",
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    const query: any = {};

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort: any = {};
    const sortField =
      sortBy === "subcategoryName" ? "name" : (sortBy as string);
    sort[sortField] = sortOrder === "asc" ? 1 : -1;

    // Fetch subcategories from the SubCategory model instead of Category model
    // This fixes the issue where subcategories created by Admin (in SubCategory collection)
    // were not visible to Sellers because this controller was looking in Category collection
    const subcategories = await SubCategory.find(query)
      .populate("category", "name image")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get product counts and format response
    const subcategoriesWithCounts = await Promise.all(
      subcategories.map(async (subcategory) => {
        const productCount = await Product.countDocuments({
          subcategory: subcategory._id, // Note: Product model uses 'subcategory', not 'subcategoryId'
        });

        const parentCategory = subcategory.category as any;

        return {
          id: subcategory._id,
          categoryName: parentCategory?.name || "Unknown",
          subcategoryName: subcategory.name,
          subcategoryImage: subcategory.image || "",
          totalProduct: productCount,
        };
      })
    );

    const total = await SubCategory.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Subcategories fetched successfully",
      data: subcategoriesWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  }
);

/**
 * Get sub-subcategories by subcategory ID
 */
export const getSubSubCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { subCategoryId } = req.params;
    const { search, isActive } = req.query;

    // Query Category model where parentId is the subcategory ID
    const query: any = { parentId: subCategoryId };

    if (isActive === "true") {
      query.status = "Active";
    }

    if (search) {
      query.name = { $regex: search as string, $options: "i" };
    }

    const subSubCategories = await Category.find(query)
      .sort({ order: 1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Sub-subcategories fetched successfully",
      data: subSubCategories,
    });
  }
);
