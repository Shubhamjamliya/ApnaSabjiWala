import { Request, Response } from "express";
import Product from "../../../models/Product";
import Category from "../../../models/Category";
import SubCategory from "../../../models/SubCategory";
import Shop from "../../../models/Shop";
import Seller from "../../../models/Seller";
import HeaderCategory from "../../../models/HeaderCategory";
import HomeSection from "../../../models/HomeSection";
import PromoStrip from "../../../models/PromoStrip";
import BestsellerCard from "../../../models/BestsellerCard";
import LowestPricesProduct from "../../../models/LowestPricesProduct";
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
        .select("productName mainImage price compareAtPrice discount rating reviewsCount pack seller variations")
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
          compareAtPrice: p.compareAtPrice,
          mrp: p.compareAtPrice || p.price,
          discount: p.discount || (p.compareAtPrice && p.price ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0),
          rating: p.rating || 0,
          reviewsCount: p.reviewsCount || 0,
          pack: p.pack || "",
          type: "product",
          isAvailable,
          seller: p.seller,
          variations: p.variations,
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
        .select("productName mainImage price compareAtPrice discount rating reviewsCount pack seller variations")
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
          compareAtPrice: p.compareAtPrice,
          mrp: p.compareAtPrice || p.price,
          discount: p.discount || (p.compareAtPrice && p.price ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0),
          rating: p.rating || 0,
          reviewsCount: p.reviewsCount || 0,
          pack: p.pack || "",
          type: "product",
          isAvailable,
          seller: p.seller,
          variations: p.variations,
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
    let effectiveHeaderSlug: string = (headerCategorySlug as string) || "all";

    if (headerCategorySlug && headerCategorySlug !== "all") {
      const headerCat = await HeaderCategory.findOne({ slug: headerCategorySlug }).select("_id slug");
      if (headerCat) {
        headerCatId = headerCat._id;
        effectiveHeaderSlug = headerCat.slug;
      }
    } else if (!headerCategorySlug || headerCategorySlug === "all") {
      // For the main Home tab, try to find the "HOME" header category to fetch its assigned content
      const homeHeader = await HeaderCategory.findOne({ name: { $regex: /home/i } }).select("_id slug");
      if (homeHeader) {
        headerCatId = homeHeader._id;
        // Use the real slug from DB so PromoStrip etc. can find it
        effectiveHeaderSlug = homeHeader.slug;
      }
    }

    const isMainHome = !headerCategorySlug ||
      headerCategorySlug === "all" ||
      (effectiveHeaderSlug && (
        effectiveHeaderSlug.toLowerCase().includes("home") ||
        effectiveHeaderSlug.toLowerCase().includes("all")
      ));

    // 3. Fetch Categories for the selected tab
    let connectedCategoryId: string | null = null;
    let headerCatObj: any = null;
    if (headerCatId) {
      headerCatObj = await HeaderCategory.findById(headerCatId).lean();
      if (headerCatObj && headerCatObj.relatedCategory) {
        connectedCategoryId = headerCatObj.relatedCategory;
      }
    }

    const categoryQuery: any = { status: "Active", parentId: null };
    if (headerCatId) {
      // Check if we have categories explicitly assigned to this header
      const explicitHomeCatsCount = await Category.countDocuments({
        headerCategoryId: headerCatId,
        status: "Active"
      });

      if (connectedCategoryId && !isMainHome) {
        // For sub-tabs (like 'winter' linked to 'Grocery'), restrict to that category
        categoryQuery.$or = [
          { _id: connectedCategoryId },
          { headerCategoryId: headerCatId }
        ];
      } else if (explicitHomeCatsCount > 0) {
        // If categories are explicitly assigned to this header (HOME or otherwise), show them
        categoryQuery.headerCategoryId = headerCatId;
      } else if (!isMainHome) {
        // For other tabs with no explicit categories, still filter by header
        categoryQuery.headerCategoryId = headerCatId;
      }
      // For HOME tab with no explicit categories, categoryQuery remains broad (all root categories)
    }

    const allCategoriesRaw = await Category.find(categoryQuery)
      .select("name image icon color slug")
      .sort({ order: 1 })
      .lean();

    const allCategories = allCategoriesRaw.map((c: any) => ({
      id: c._id.toString(),
      categoryId: c._id.toString(),
      name: c.name,
      image: c.image || "",
      icon: c.icon || "",
      color: c.color || "#FDE68A",
      slug: c.slug || c._id.toString(),
      type: "category",
    }));

    // 4. Fetch Subcategories for the specific tab
    let subcategories: any[] = [];
    if (headerCatId) {
      // Collect IDs of categories to fetch subcategories for
      const catIdsToFetch = allCategoriesRaw.map(c => c._id);

      // If we have a connected category, ensure its ID is included
      if (connectedCategoryId && !catIdsToFetch.some(id => id.toString() === connectedCategoryId)) {
        catIdsToFetch.push(new mongoose.Types.ObjectId(connectedCategoryId));
      }

      if (catIdsToFetch.length > 0) {
        const subs = await SubCategory.find({ category: { $in: catIdsToFetch } })
          .select("name image category")
          .sort({ order: 1 })
          .lean();

        subcategories = subs.map((s: any) => ({
          id: s._id.toString(),
          name: s.name,
          image: s.image,
          type: "subcategory",
          categoryId: s.category?.toString(),
        }));
      }
    }

    // (isMainHome already defined above)

    const baseProductQuery: any = {
      status: "Active",
      publish: true,
      ...(nearbySellerIds.length > 0 ? { seller: { $in: nearbySellerIds } } : {}),
      // Only restrict base query by header if we are NOT on the main HOME tab
      ...(!isMainHome && headerCatId ? { headerCategoryId: headerCatId } : {})
    };

    // -> Bestsellers (Popular Products)
    const bestsellers = await Product.find({
      ...baseProductQuery,
      popular: true,
    })
      .limit(12)
      .select("productName mainImage price compareAtPrice discount rating reviewsCount pack seller category variations")
      .lean();

    const formattedBestsellers = bestsellers.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      name: p.productName,
      imageUrl: p.mainImage,
      mrp: p.compareAtPrice || p.price,
      categoryId: p.category?.toString(),
      variations: p.variations
    }));

    // -> Lowest Prices Ever (Manual admin selection filtered by header)
    const lpQuery: any = { isActive: true };

    if (headerCatId) {
      if (isMainHome) {
        // For main Home, show both items explicitly assigned to 'HOME' header 
        // AND items with no header assigned (for backward compatibility)
        lpQuery.$or = [
          { headerCategoryId: headerCatId },
          { headerCategoryId: { $exists: false } },
          { headerCategoryId: null }
        ];
      } else {
        lpQuery.headerCategoryId = headerCatId;
      }
    } else {
      lpQuery.$or = [
        { headerCategoryId: { $exists: false } },
        { headerCategoryId: null }
      ];
    }

    let lpDocs = await LowestPricesProduct.find(lpQuery)
      .sort({ order: 1 })
      .populate({
        path: "product",
        select: "productName mainImage price compareAtPrice discount rating reviewsCount pack seller category variations",
      })
      .limit(12)
      .lean();

    // If no explicit products were assigned for this specific header, lpDocs remains as fetched above.

    let formattedLowestPrices = lpDocs.map((item: any) => {
      const p = item.product;
      if (!p) return null;
      return {
        ...p,
        id: p._id.toString(),
        name: p.productName,
        imageUrl: p.mainImage,
        mrp: p.compareAtPrice || p.price,
        categoryId: p.category?.toString(),
        variations: p.variations
      };
    }).filter(Boolean);

    // If manual selection is empty, fallback to automated discount-based products for this header
    if (formattedLowestPrices.length === 0) {
      const lowestPrices = await Product.find({
        ...baseProductQuery,
        $or: [
          { discount: { $gt: 0 } },
          {
            $and: [
              { compareAtPrice: { $exists: true } },
              { $expr: { $gt: ["$compareAtPrice", "$price"] } }
            ]
          }
        ]
      })
        .sort({ discount: -1 })
        .limit(12)
        .select("productName mainImage price compareAtPrice discount rating reviewsCount pack seller category variations")
        .lean();

      formattedLowestPrices = lowestPrices.map((p: any) => ({
        ...p,
        id: p._id.toString(),
        name: p.productName,
        imageUrl: p.mainImage,
        mrp: p.compareAtPrice || p.price,
        categoryId: p.category?.toString(),
        variations: p.variations
      }));
    }

    // -> Trending/Deal of the Day
    const trending = await Product.find({
      ...baseProductQuery,
      dealOfDay: true,
    })
      .limit(12)
      .select("productName mainImage price compareAtPrice discount rating reviewsCount pack seller category variations")
      .lean();

    const formattedTrending = trending.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      name: p.productName,
      imageUrl: p.mainImage,
      mrp: p.compareAtPrice || p.price,
      categoryId: p.category?.toString(),
      variations: p.variations
    }));

    // -> Shop by Store (Curated Shops + Nearby Sellers Fallback)
    let rawShops: any[] = [];
    let shopType: "shop" | "seller" = "shop";

    // 1. First, try to fetch curated Shop documents (Marketing collections)
    const shopQuery: any = { isActive: true };
    if (headerCatId) {
      // Show shops assigned to this specific header 
      // AND shops with no header assigned (for global visibility across all tabs)
      shopQuery.$or = [
        { headerCategoryId: headerCatId },
        { headerCategoryId: { $exists: false } },
        { headerCategoryId: null }
      ];
    } else {
      // If no header ID (though unlikely), show everything active
    }

    rawShops = await Shop.find(shopQuery)
      .sort({ order: 1 })
      .limit(12)
      .lean();

    // 2. If no curated shops, fallback to nearby sellers if location is available
    if (rawShops.length === 0 && nearbySellerIds.length > 0) {
      rawShops = await Seller.find({
        status: "Approved",
        _id: { $in: nearbySellerIds }
      })
        .limit(12)
        .lean();
      shopType = "seller";
    }

    // 3. Final fallback: If still no shops, show global approved sellers
    if (rawShops.length === 0) {
      rawShops = await Seller.find({ status: "Approved" })
        .limit(12)
        .sort({ createdAt: -1 })
        .lean();
      shopType = "seller";
    }

    const formattedShops = await Promise.all(
      rawShops.map(async (s: any) => {
        let productImages: string[] = [];

        if (shopType === "shop") {
          // Fetch images for products linked to this curated shop
          if (s.products && s.products.length > 0) {
            const pData = await Product.find({ _id: { $in: s.products.slice(0, 4) } })
              .select("mainImage")
              .lean();
            productImages = pData.map((p: any) => p.mainImage);
          }
        } else {
          // Fetch top products for this seller to show in the 2x2 grid
          const pData = await Product.find({ seller: s._id, status: "Active" })
            .limit(4)
            .select("mainImage")
            .sort({ rating: -1 })
            .lean();
          productImages = pData.map((p: any) => p.mainImage);
        }

        return {
          id: s._id.toString(),
          name: shopType === "shop" ? s.name : s.storeName,
          title: shopType === "shop" ? s.name : s.storeName,
          image: shopType === "shop" ? (s.image || "") : (s.logo || ""),
          imageUrl: shopType === "shop" ? (s.image || "") : (s.logo || ""),
          description: shopType === "shop" ? (s.description || "") : (s.storeDescription || s.city || ""),
          type: shopType,
          categoryId: shopType === "shop" ? (s.storeId || s._id.toString()) : s._id.toString(),
          productImages
        };
      })
    );

    // -> Promo Strip (Real Data from Database)
    let promoStrip: any = null;
    let dbPromoStrip = null;

    // 1. Try to find a strip specifically for this header category
    if (effectiveHeaderSlug && effectiveHeaderSlug !== "all") {
      dbPromoStrip = await PromoStrip.findOne({
        headerCategorySlug: effectiveHeaderSlug,
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      })
        .populate("categoryCards.subCategoryId", "name image icon subcategoryName slug")
        .populate("categoryCards.productId", "productName mainImage price mrp")
        .populate("productCategoryId", "name icon image color slug")
        .populate({
          path: "featuredProducts",
          select: "productName mainImage price mrp discount rating reviewsCount pack seller category variations",
        })
        .sort({ order: 1 })
        .lean();
    }

    // 2. If no specific strip found (or if we are on 'all' tab), fallback to 'all' strip
    if (!dbPromoStrip) {
      dbPromoStrip = await PromoStrip.findOne({
        headerCategorySlug: "all",
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      })
        .populate("categoryCards.subCategoryId", "name image icon subcategoryName slug")
        .populate("categoryCards.productId", "productName mainImage price mrp")
        .populate("productCategoryId", "name icon image color slug")
        .populate({
          path: "featuredProducts",
          select: "productName mainImage price mrp discount rating reviewsCount pack seller category variations",
        })
        .sort({ order: 1 })
        .lean();
    }

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
          variations: p.variations,
        })),
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

    // -> Bestseller Cards (2x2 Grid Cards)
    const bestsellerQuery: any = { isActive: true };
    if (headerCatId) {
      if (isMainHome) {
        // For main Home, show both items explicitly assigned to 'HOME' header 
        // AND items with no header assigned (for backward compatibility)
        bestsellerQuery.$or = [
          { headerCategoryId: headerCatId },
          { headerCategoryId: { $exists: false } },
          { headerCategoryId: null }
        ];
      } else {
        bestsellerQuery.headerCategoryId = headerCatId;
      }
    } else {
      bestsellerQuery.$or = [
        { headerCategoryId: { $exists: false } },
        { headerCategoryId: null }
      ];
    }

    let bestsellerCardsRaw = await BestsellerCard.find(bestsellerQuery)
      .sort({ order: 1 })
      .limit(10)
      .populate("category", "name slug")
      .lean();

    // If no explicit bestseller cards were assigned for this specific header, bestsellerCardsRaw remains as fetched above.

    const bestsellerCards = await Promise.all(
      bestsellerCardsRaw.map(async (card: any) => {
        let products = [];

        // 1. Check for manual products first
        if (card.products && card.products.length > 0) {
          products = await Product.find({
            _id: { $in: card.products },
            status: "Active",
            publish: true,
          })
            .select("mainImage productName")
            .lean();

          // Sort products according to the order in the card.products array
          const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));
          products = card.products
            .map((productId: any) => productMap.get(productId.toString()))
            .filter(Boolean);
        }

        // 2. Fallback: Fetch top 4 products for this category if no manual products or less than 4
        if (products.length < 4) {
          const remainingLimit = 4 - products.length;
          const existingIds = products.map((p: any) => p._id);

          const autoProductsFiltered = await Product.find({
            category: card.category?._id,
            _id: { $nin: existingIds },
            status: "Active",
            publish: true,
            ...(nearbySellerIds.length > 0 ? { seller: { $in: nearbySellerIds } } : {}),
          })
            .sort({ popular: -1, rating: -1 })
            .limit(remainingLimit)
            .select("mainImage productName")
            .lean();

          products = [...products, ...autoProductsFiltered];
        }

        return {
          id: card._id.toString(),
          name: card.name,
          categoryName: card.category?.name,
          categorySlug: card.category?.slug,
          categoryId: card.category?._id?.toString(),
          productImages: products.map((p: any) => p.mainImage),
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
        bestsellerCards: bestsellerCards,
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
