import { Request, Response } from "express";
import Product from "../../../models/Product";
import Category from "../../../models/Category";
import SubCategory from "../../../models/SubCategory";
import Shop from "../../../models/Shop";
import Seller from "../../../models/Seller";
import HeaderCategory from "../../../models/HeaderCategory";
import HomeSection from "../../../models/HomeSection";
import PromoStrip from "../../../models/PromoStrip";
import mongoose from "mongoose";
import { findSellersWithinRange } from "../../../utils/locationHelper";

// Helper function to fetch data for a home section based on its configuration
async function fetchSectionData(
  section: any,
  nearbySellerIds?: mongoose.Types.ObjectId[]
): Promise<any[]> {
  try {
    const { categories, subCategories, products, displayType, limit } = section;

    // 1. If section has manual products, fetch those directly (Simple mode)
    if (products && products.length > 0) {
      const manualProducts = await Product.find({
        _id: { $in: products },
        status: "Active",
        publish: true,
      })
        .select("productName mainImage price mrp discount rating reviewsCount pack seller")
        .lean();

      // Sort according to the order in the products array
      const productMap = new Map(manualProducts.map((p: any) => [p._id.toString(), p]));
      const sortedProducts = products
        .map((id: any) => productMap.get(id.toString()))
        .filter(Boolean);

      return sortedProducts.map((p: any) => {
        const isAvailable = nearbySellerIds && nearbySellerIds.length > 0 && p.seller
          ? nearbySellerIds.some(id => id.toString() === p.seller.toString())
          : false;

        return {
          id: p._id.toString(),
          productId: p._id.toString(),
          name: p.productName,
          productName: p.productName,
          image: p.mainImage,
          mainImage: p.mainImage,
          price: p.price,
          mrp: p.mrp || p.price,
          discount: p.discount || (p.mrp && p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0),
          rating: p.rating || 0,
          reviewsCount: p.reviewsCount || 0,
          pack: p.pack || "",
          type: "product",
          isAvailable,
          seller: p.seller,
        };
      });
    }

    // 2. Fallback to category-based fetching (Automated mode)
    if (displayType === "subcategories" && categories && categories.length > 0) {
      const categoryIds = categories.map((cat: any) => cat._id || cat);
      const subcategories = await SubCategory.find({
        category: { $in: categoryIds },
      })
        .select("name image order category")
        .sort({ order: 1 })
        .limit(limit || 10)
        .lean();

      return subcategories.map((sub: any) => ({
        id: sub._id.toString(),
        subcategoryId: sub._id.toString(),
        categoryId: sub.category?.toString() || "",
        name: sub.name,
        image: sub.image || "",
        slug: sub.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        type: "subcategory",
      }));
    }

    if (displayType === "products") {
      const query: any = {
        status: "Active",
        publish: true,
        $or: [
          { isShopByStoreOnly: { $ne: true } },
          { isShopByStoreOnly: { $exists: false } },
        ],
      };

      if (categories && categories.length > 0) {
        const categoryIds = categories.map((cat: any) => cat._id || cat).filter(Boolean);
        if (categoryIds.length > 0) query.category = { $in: categoryIds };
      }

      if (subCategories && subCategories.length > 0) {
        const subCategoryIds = subCategories.map((sub: any) => sub._id || sub).filter(Boolean);
        if (subCategoryIds.length > 0) query.subcategory = { $in: subCategoryIds };
      }

      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .limit(limit || 8)
        .select("productName mainImage price mrp discount rating reviewsCount pack seller")
        .lean();

      return products.map((p: any) => {
        const isAvailable = nearbySellerIds && nearbySellerIds.length > 0 && p.seller
          ? nearbySellerIds.some(id => id.toString() === p.seller.toString())
          : false;

        return {
          id: p._id.toString(),
          productId: p._id.toString(),
          name: p.productName,
          productName: p.productName,
          image: p.mainImage,
          mainImage: p.mainImage,
          price: p.price,
          mrp: p.mrp || p.price,
          discount: p.discount || (p.mrp && p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0),
          rating: p.rating || 0,
          reviewsCount: p.reviewsCount || 0,
          pack: p.pack || "",
          type: "product",
          isAvailable,
          seller: p.seller,
        };
      });
    }

    if (displayType === "categories" && categories && categories.length > 0) {
      const categoryIds = categories.map((cat: any) => cat._id || cat);
      const fetchedCategories = await Category.find({
        _id: { $in: categoryIds },
        status: "Active",
      })
        .select("name image slug")
        .sort({ order: 1 })
        .limit(limit || 8)
        .lean();

      return fetchedCategories.map((c: any) => ({
        id: c._id.toString(),
        categoryId: c._id.toString(),
        name: c.name,
        image: c.image,
        slug: c.slug,
        type: "category",
      }));
    }

    return [];
  } catch (error) {
    console.error("Error fetching section data:", error);
    return [];
  }
}

// Get Home Page Content
export const getHomeContent = async (req: Request, res: Response) => {
  const { headerCategorySlug, latitude, longitude } = req.query;

  try {
    // 1. Find sellers within range for availability check
    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;

    let nearbySellerIds: mongoose.Types.ObjectId[] = [];
    if (userLat !== null && userLng !== null) {
      nearbySellerIds = await findSellersWithinRange(userLat, userLng);
    }

    // 2. Header Category Identification
    let headerCatId: any = null;
    if (headerCategorySlug && headerCategorySlug !== "all") {
      const headerCat = await HeaderCategory.findOne({ slug: headerCategorySlug }).select("_id");
      if (headerCat) headerCatId = headerCat._id;
    }

    // 3. Fetch Root Categories (Hierarchy Backbone) - Filtered by Header Category if applicable
    const categoryQuery: any = { status: "Active", parentId: null };
    if (headerCatId) {
      categoryQuery.headerCategoryId = headerCatId;
    }

    const allCategoriesRaw = await Category.find(categoryQuery)
      .select("name image icon color slug")
      .sort({ order: 1 })
      .lean();

    const allCategories = allCategoriesRaw.map((c: any) => ({
      ...c,
      id: c._id.toString(),
      categoryId: c._id.toString(),
      type: "category"
    }));

    // 4. Fetch Subcategories for the specific tab (Simple Navigation)
    let subcategories: any[] = [];
    if (headerCatId && allCategoriesRaw.length > 0) {
      const catIds = allCategoriesRaw.map(c => c._id);
      const subs = await SubCategory.find({ category: { $in: catIds } })
        .sort({ order: 1 })
        .limit(20)
        .lean();

      subcategories = subs.map(s => ({
        id: s._id.toString(),
        subcategoryId: s._id.toString(),
        categoryId: s.category?.toString() || "",
        name: s.name,
        image: s.image || "",
        type: "subcategory"
      }));
    }

    const baseProductQuery: any = {
      status: "Active",
      publish: true,
      ...(nearbySellerIds.length > 0 ? { seller: { $in: nearbySellerIds } } : {}),
      ...(headerCatId ? { headerCategoryId: headerCatId } : {})
    };

    // -> Bestsellers (Popular Products)
    const bestsellers = await Product.find({
      ...baseProductQuery,
      popular: true,
    })
      .limit(12)
      .select("productName mainImage price mrp discount rating reviewsCount pack seller category")
      .lean();

    const formattedBestsellers = bestsellers.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      name: p.productName,
      imageUrl: p.mainImage,
      mrp: p.mrp || p.price,
      categoryId: p.category?.toString()
    }));

    // -> Lowest Prices (Highest Discount Products)
    const lowestPrices = await Product.find({
      ...baseProductQuery,
      discount: { $gt: 0 },
    })
      .sort({ discount: -1 })
      .limit(12)
      .select("productName mainImage price mrp discount rating reviewsCount pack seller category")
      .lean();

    const formattedLowestPrices = lowestPrices.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      name: p.productName,
      imageUrl: p.mainImage,
      mrp: p.mrp || p.price,
      categoryId: p.category?.toString()
    }));

    // -> Trending/Deal of the Day
    const trending = await Product.find({
      ...baseProductQuery,
      dealOfDay: true,
    })
      .limit(12)
      .select("productName mainImage price mrp discount rating reviewsCount pack seller category")
      .lean();

    const formattedTrending = trending.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      name: p.productName,
      imageUrl: p.mainImage,
      mrp: p.mrp || p.price,
      categoryId: p.category?.toString()
    }));

    // -> Shop by Store (Curated Shops + Nearby Sellers Fallback)
    let formattedShops: any[] = [];

    // 1. First, try to fetch curated Shop documents (Marketing collections)
    const shopQuery: any = { isActive: true };
    if (headerCatId) {
      shopQuery.headerCategoryId = headerCatId;
    }

    const curatedShops = await Shop.find(shopQuery)
      .sort({ order: 1 })
      .limit(12)
      .select("name image description storeId")
      .lean();

    if (curatedShops.length > 0) {
      formattedShops = curatedShops.map((s: any) => ({
        id: s._id.toString(),
        name: s.name,
        title: s.name,
        image: s.image || "",
        imageUrl: s.image || "",
        description: s.description || "",
        type: "shop",
        categoryId: s.storeId || s._id.toString()
      }));
    }
    // 2. If no curated shops, fallback to nearby sellers if location is available
    else if (nearbySellerIds.length > 0) {
      const sellersRaw = await Seller.find({
        status: "Approved",
        _id: { $in: nearbySellerIds }
      })
        .limit(12)
        .select("storeName logo storeDescription city")
        .lean();

      formattedShops = sellersRaw.map((s: any) => ({
        id: s._id.toString(),
        name: s.storeName,
        title: s.storeName,
        image: s.logo || "",
        imageUrl: s.logo || "",
        description: s.storeDescription || s.city || "",
        type: "seller",
        categoryId: s._id.toString()
      }));
    }
    // 3. Final fallback: If no curated shops and no location, show global approved sellers
    else if (!headerCategorySlug || headerCategorySlug === "all") {
      const globalSellers = await Seller.find({ status: "Approved" })
        .limit(12)
        .select("storeName logo storeDescription city")
        .lean();

      formattedShops = globalSellers.map((s: any) => ({
        id: s._id.toString(),
        name: s.storeName,
        title: s.storeName,
        image: s.logo || "",
        imageUrl: s.logo || "",
        description: s.storeDescription || s.city || "",
        type: "seller",
        categoryId: s._id.toString()
      }));
    }

    // -> Promo Strip (Real Data from Database)
    let promoStrip: any = null;
    const dbPromoStrip = await PromoStrip.findOne({
      headerCategorySlug: headerCategorySlug === "all" ? "all" : headerCategorySlug,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    })
      .populate("categoryCards.subCategoryId", "name image icon subcategoryName")
      .populate("productCategoryId", "name icon image color slug")
      .populate({
        path: "featuredProducts",
        select: "productName mainImage price mrp discount rating reviewsCount pack seller category",
      })
      .sort({ order: 1 })
      .lean();

    if (dbPromoStrip) {
      promoStrip = {
        ...dbPromoStrip,
        categoryCards: dbPromoStrip.categoryCards.map((card: any) => ({
          ...card,
          id: card._id,
          categoryId: card.subCategoryId?._id || card.subCategoryId,
          title: card.title || card.subCategoryId?.subcategoryName || card.subCategoryId?.name || "Offer",
          badge: card.badge || `Save ${card.discountPercentage || 0}%`,
        })),
        featuredProducts: dbPromoStrip.featuredProducts.map((p: any) => ({
          ...p,
          id: p._id.toString(),
          name: p.productName,
          imageUrl: p.mainImage,
          mrp: p.mrp || p.price,
          categoryId: p.category?.toString(),
        })),
      };
    } else {
      // Fallback: Default mock data if no PromoStrip exists in DB
      promoStrip = {
        isActive: true,
        heading: headerCategorySlug === "fruits-veg" ? "FRESH HARVEST" : "HOUSEFULL SALE",
        saleText: "FLAT 50% OFF",
        crazyDealsTitle: "CRAZY DEALS",
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        categoryCards: allCategories.slice(0, 4).map((c, i) => ({
          id: c.id,
          categoryId: c.id,
          title: c.name,
          badge: `Min ${30 + i * 5}% OFF`,
          discountPercentage: 30 + i * 5,
          order: i
        })),
        featuredProducts: formattedTrending.slice(0, 5)
      };
    }

    // 3. Fetch Simplified Home Sections (Title + Manual Products)
    const homeSectionQuery: any = { isActive: true };

    if (headerCategorySlug && headerCategorySlug !== "all") {
      const headerCategory = await HeaderCategory.findOne({
        slug: headerCategorySlug,
        status: "Published",
      }).select("_id");

      if (headerCategory) {
        homeSectionQuery.headerCategory = headerCategory._id;
      } else {
        homeSectionQuery.headerCategory = new mongoose.Types.ObjectId();
      }
    } else {
      homeSectionQuery.$or = [
        { headerCategory: null },
        { headerCategory: { $exists: false } },
        { isGlobal: true },
      ];
    }

    const homeSections = await HomeSection.find(homeSectionQuery)
      .sort({ order: 1 })
      .lean();

    const dynamicSections = await Promise.all(
      homeSections.map(async (section: any) => {
        const sectionData = await fetchSectionData(section, nearbySellerIds);
        return {
          id: section._id.toString(),
          title: section.title,
          slug: section.slug,
          displayType: section.displayType,
          columns: section.columns,
          data: sectionData,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        categories: allCategories, // Category tiles (dynamic based on tab)
        subcategories: subcategories, // Subcategory tiles for the tab
        homeSections: dynamicSections.filter(s => s.data.length > 0), // Products grouped by sections
        bestsellers: formattedBestsellers,
        lowestPrices: formattedLowestPrices,
        shops: formattedShops,
        trending: formattedTrending,
        cookingIdeas: [],
        promoCards: [],
        promoStrip: promoStrip,
        promoBanners: []
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching home content",
      error: error.message,
    });
  }
};

// Get Products for a specific "Store" (Campaign/Collection)
// Fetch products based on store configuration from database
export const getStoreProducts = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { latitude, longitude } = req.query; // User location for filtering
    let query: any = {
      status: "Active",
      publish: true,
      // Only show shop-by-store-only products in shop by store section
      isShopByStoreOnly: true,
    };

    console.log(`[getStoreProducts] Looking for shop with storeId: ${storeId}`);

    // Build shop query - only include _id if storeId is a valid ObjectId
    const shopQuery: any = { isActive: true };
    if (mongoose.Types.ObjectId.isValid(storeId)) {
      shopQuery.$or = [
        { storeId: storeId.toLowerCase() },
        { _id: new mongoose.Types.ObjectId(storeId) }
      ];
    } else {
      shopQuery.storeId = storeId.toLowerCase();
    }

    // Find the shop by storeId or _id
    const shop = await Shop.findOne(shopQuery)
      .populate("category", "_id name slug image")
      .populate("subCategory", "_id name")
      .lean();

    console.log(`[getStoreProducts] Shop found:`, shop ? { name: shop.name, productsCount: shop.products?.length || 0, category: shop.category, image: shop.image } : 'NOT FOUND');

    let shopData: any = null;

    if (shop) {
      shopData = {
        name: shop.name,
        image: shop.image,
        description: shop.description || '',
        category: shop.category,
      };

      // Convert products array to ObjectIds if needed
      // When using .lean(), products array contains ObjectIds directly
      let productIds: mongoose.Types.ObjectId[] = [];
      if (shop.products && shop.products.length > 0) {
        productIds = shop.products.map((p: any) => {
          // Handle different formats: ObjectId, string, or object with _id
          if (mongoose.Types.ObjectId.isValid(p)) {
            return typeof p === 'string' ? new mongoose.Types.ObjectId(p) : p;
          }
          return p._id ? (typeof p._id === 'string' ? new mongoose.Types.ObjectId(p._id) : p._id) : p;
        }).filter(Boolean);
      }

      console.log(`[getStoreProducts] Shop has ${productIds.length} products assigned`);

      // Get shop ID for filtering
      const shopId = (shop as any)._id;

      // If shop has specific products assigned, use those
      if (productIds.length > 0) {
        query._id = { $in: productIds };
        // Also filter by shopId to ensure products belong to this shop
        query.shopId = shopId;
        console.log(`[getStoreProducts] Filtering by product IDs: ${productIds.length} products and shopId: ${shopId}`);
      }
      // Otherwise, filter by shopId and category/subcategory
      else {
        // Filter by shopId to show only products assigned to this shop
        query.shopId = shopId;
        console.log(`[getStoreProducts] Filtering by shopId: ${shopId}`);

        if (shop.category) {
          const categoryId = (shop.category as any)._id || (shop.category as any);
          query.category = categoryId;
          console.log(`[getStoreProducts] Also filtering by category: ${categoryId}`);

          // If subcategory is also specified, filter by both
          if (shop.subCategory) {
            const subCategoryId = (shop.subCategory as any)._id || (shop.subCategory as any);
            query.$or = [
              { category: categoryId, shopId: shopId },
              { subcategory: subCategoryId, shopId: shopId },
            ];
            console.log(`[getStoreProducts] Also filtering by subcategory: ${subCategoryId}`);
          }
        }
      }
    } else {
      // Fallback: try to match by category name (legacy support)
      const categoryId = await getCategoryIdByName(storeId);
      if (categoryId) {
        query.category = categoryId;
        // Try to get category details for shop data
        const category = await Category.findById(categoryId).select("name slug image").lean();
        if (category) {
          shopData = {
            name: category.name,
            image: category.image || '',
            description: '',
            category: category,
          };
        }
      } else {
        // No matching shop or category found
        return res.status(200).json({
          success: true,
          data: [],
          shop: null,
          message: "Store not found"
        });
      }
    }

    // Location-based filtering: Only show products from sellers within user's range
    const userLat = latitude ? parseFloat(latitude as string) : null;
    const userLng = longitude ? parseFloat(longitude as string) : null;

    console.log(`[getStoreProducts] User location: lat=${userLat}, lng=${userLng}`);

    if (userLat && userLng && !isNaN(userLat) && !isNaN(userLng)) {
      const nearbySellerIds = await findSellersWithinRange(userLat, userLng);
      console.log(`[getStoreProducts] Found ${nearbySellerIds.length} sellers within range`);

      if (nearbySellerIds.length === 0) {
        // No sellers within range, return shop data but empty products
        console.log(`[getStoreProducts] No sellers in range, returning empty products`);
        return res.status(200).json({
          success: true,
          data: [],
          shop: shopData,
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
            pages: 0,
          },
          message: "No sellers available in your area. Please update your location.",
        });
      }

      // Filter products by sellers within range
      query.seller = { $in: nearbySellerIds };
      console.log(`[getStoreProducts] Added seller filter to query`);
    } else {
      // If no location provided, return empty (require location for marketplace)
      console.log(`[getStoreProducts] No location provided, returning empty products`);
      return res.status(200).json({
        success: true,
        data: [],
        shop: shopData,
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
        },
        message: "Location is required to view products. Please enable location access.",
      });
    }

    console.log(`[getStoreProducts] Final query:`, JSON.stringify(query, null, 2));

    const products = await Product.find(query)
      .populate("category", "name icon image")
      .populate("subcategory", "name")
      .populate("brand", "name")
      .populate("seller", "storeName")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean({ virtuals: true });

    const total = await Product.countDocuments(query);

    console.log(`[getStoreProducts] Found ${total} products matching query, returning ${products.length}`);

    return res.status(200).json({
      success: true,
      data: products.map(p => ({ ...p, isAvailable: true })),
      shop: shopData,
      pagination: {
        page: 1,
        limit: 50,
        total,
        pages: Math.ceil(total / 50),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error fetching store products",
      error: error.message,
    });
  }
};

// Helper
async function getCategoryIdByName(name: string) {
  const cat = await Category.findOne({
    name: { $regex: new RegExp(name, "i") },
  });
  return cat ? cat._id : null;
}
