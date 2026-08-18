import api from "./config";
import { apiCache } from "../../utils/apiCache";

export interface HomeContentResponse {
  success: boolean;
  data: {
    bestsellers: any[];
    allProducts?: any[];
    allProductsPagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
    lowestPrices?: any[];
    categories: any[];
    subcategories?: any[];
    homeSections?: any[];
    shops: any[];
    promoBanners: Array<{
      _id: string;
      imageUrl: string;
      linkUrl: string;
      title?: string;
      order: number;
    }>;
    trending: any[];
    cookingIdeas: any[];
    promoCards?: any[];
    promoStrip?: any; // PromoStrip data from backend
    bestsellerCards?: any[];
    homeBanner?: {
      imageUrl: string;
      productId: string;
      productName: string;
    } | null;
  };
}

/**
 * Get home page content with caching
 * @param headerCategorySlug - Optional header category slug to filter categories (e.g., 'winter', 'wedding')
 * @param useCache - Whether to use cache (default: true)
 * @param cacheTTL - Cache TTL in milliseconds (default: 5 minutes)
 */
export const getHomeContent = async (
  headerCategorySlug?: string,
  latitude?: number,
  longitude?: number,
  useCache: boolean = true,
  cacheTTL: number = 5 * 60 * 1000, // 5 minutes
  skipLoader: boolean = false
): Promise<HomeContentResponse> => {
  const cacheKey = `home-content-${headerCategorySlug || 'all'}-${latitude || 0}-${longitude || 0}`;

  const fetchFn = async () => {
    const params: any = headerCategorySlug ? { headerCategorySlug } : {};
    if (latitude !== undefined && longitude !== undefined) {
      params.latitude = latitude;
      params.longitude = longitude;
    }
    const response = await api.get<HomeContentResponse>("/customer/home", {
      params,
      skipLoader
    } as any);
    return response.data;
  };

  if (useCache) {
    return apiCache.getOrFetch(cacheKey, fetchFn, cacheTTL);
  }

  return fetchFn();
};

/**
 * Get paginated home products for "All Products" section
 */
export const getHomeProducts = async (
  headerCategorySlug?: string,
  page: number = 1,
  limit: number = 20,
  latitude?: number,
  longitude?: number
): Promise<{
  success: boolean;
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}> => {
  const params: any = { page, limit };
  if (headerCategorySlug) params.headerCategorySlug = headerCategorySlug;
  if (latitude !== undefined && longitude !== undefined) {
    params.latitude = latitude;
    params.longitude = longitude;
  }
  const response = await api.get("/customer/home/products", { params, skipLoader: true } as any);
  return response.data;
};

/**
 * Get products for a specific "shop" (e.g. Spiritual Store)
 */
export const getStoreProducts = async (
  storeId: string,
  latitude?: number,
  longitude?: number
): Promise<any> => {
  const params: any = {};
  if (latitude !== undefined && longitude !== undefined) {
    params.latitude = latitude;
    params.longitude = longitude;
  }
  const response = await api.get(`/customer/home/store/${storeId}`, { params });
  return response.data;
};
