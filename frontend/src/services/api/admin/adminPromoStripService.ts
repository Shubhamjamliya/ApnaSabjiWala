import api from "../config";

export interface CategoryCard {
  subCategoryId?: string | { _id: string; name?: string; image?: string };
  productId?: string | { _id: string; productName?: string; mainImage?: string };
  title: string;
  badge: string;
  images: string[];
  discountPercentage: number;
  order: number;
  _id?: string;
}

export interface PromoStrip {
  _id: string;
  headerCategorySlug: string;
  productCategoryId?: string | { _id: string; name?: string; slug?: string };
  heading: string;
  saleText: string;
  startDate: string;
  endDate: string;
  categoryCards: CategoryCard[];
  featuredProducts: (string | { _id: string; productName?: string; mainImage?: string; price?: number; mrp?: number })[];
  crazyDealsTitle?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromoStripFormData {
  headerCategorySlug: string;
  productCategoryId?: string;
  heading: string;
  saleText: string;
  startDate: string;
  endDate: string;
  categoryCards: CategoryCard[];
  featuredProducts: string[];
  crazyDealsTitle?: string;
  isActive: boolean;
  order: number;
}

// Get all PromoStrips
export const getPromoStrips = async (params?: {
  headerCategorySlug?: string;
  isActive?: boolean;
}): Promise<PromoStrip[]> => {
  const queryParams = new URLSearchParams();
  if (params?.headerCategorySlug) {
    queryParams.append("headerCategorySlug", params.headerCategorySlug);
  }
  if (params?.isActive !== undefined) {
    queryParams.append("isActive", params.isActive.toString());
  }

  const response = await api.get(
    `/admin/promo-strips${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
  );
  return response.data.data;
};

// Get PromoStrip by ID
export const getPromoStripById = async (id: string): Promise<PromoStrip> => {
  const response = await api.get(`/admin/promo-strips/${id}`);
  return response.data.data;
};

// Create PromoStrip
export const createPromoStrip = async (
  data: PromoStripFormData
): Promise<PromoStrip> => {
  const response = await api.post("/admin/promo-strips", data);
  return response.data.data;
};

// Update PromoStrip
export const updatePromoStrip = async (
  id: string,
  data: Partial<PromoStripFormData>
): Promise<PromoStrip> => {
  const response = await api.put(`/admin/promo-strips/${id}`, data);
  return response.data.data;
};

// Delete PromoStrip
export const deletePromoStrip = async (id: string): Promise<void> => {
  await api.delete(`/admin/promo-strips/${id}`);
};

