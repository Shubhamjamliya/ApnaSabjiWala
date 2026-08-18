import api from "./config";
import { Product } from "./productService";

export interface WishlistResponse {
  success: boolean;
  message?: string;
  data: {
    _id: string;
    customer: string;
    products: Product[];
  };
}

export interface GetWishlistParams {
  latitude?: number;
  longitude?: number;
}

// In-flight promise cache and data cache to prevent duplicate requests
let inFlightWishlistPromise: Promise<WishlistResponse> | null = null;
let cachedWishlistData: WishlistResponse | null = null;
let cachedTime = 0;
const CACHE_TTL = 30000; // 30 seconds

export const invalidateWishlistCache = () => {
  cachedWishlistData = null;
  cachedTime = 0;
  inFlightWishlistPromise = null;
};

export const getWishlist = async (params?: GetWishlistParams): Promise<WishlistResponse> => {
  const now = Date.now();
  if (cachedWishlistData && now - cachedTime < CACHE_TTL) {
    return cachedWishlistData;
  }

  if (inFlightWishlistPromise) {
    return inFlightWishlistPromise;
  }

  inFlightWishlistPromise = api
    .get<WishlistResponse>("/customer/wishlist", { params })
    .then((res) => {
      cachedWishlistData = res.data;
      cachedTime = Date.now();
      inFlightWishlistPromise = null;
      return res.data;
    })
    .catch((err) => {
      inFlightWishlistPromise = null;
      throw err;
    });

  return inFlightWishlistPromise;
};

export const addToWishlist = async (productId: string, latitude?: number, longitude?: number): Promise<WishlistResponse> => {
  invalidateWishlistCache();
  const params: any = {};
  if (latitude !== undefined && longitude !== undefined) {
    params.latitude = latitude;
    params.longitude = longitude;
  }
  const res = await api.post<WishlistResponse>("/customer/wishlist", { productId }, { params });
  return res.data;
};

export const removeFromWishlist = async (productId: string): Promise<WishlistResponse> => {
  invalidateWishlistCache();
  const res = await api.delete<WishlistResponse>(`/customer/wishlist/${productId}`);
  return res.data;
};


