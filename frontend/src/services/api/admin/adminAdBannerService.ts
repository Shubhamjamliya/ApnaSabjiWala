import api from "../config";
import { ApiResponse } from "./types";

export interface AdBanner {
  _id: string;
  imageUrl: string;
  linkUrl: string;
  title?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export type AdBannerInput = Omit<AdBanner, "_id" | "createdAt" | "updatedAt">;

export const getAdBanners = async (): Promise<ApiResponse<AdBanner[]>> =>
  (await api.get<ApiResponse<AdBanner[]>>("/admin/ads-banners")).data;

export const createAdBanner = async (adBanner: AdBannerInput): Promise<ApiResponse<AdBanner>> =>
  (await api.post<ApiResponse<AdBanner>>("/admin/ads-banners", { adBanner })).data;

export const updateAdBanner = async (id: string, adBanner: AdBannerInput): Promise<ApiResponse<AdBanner>> =>
  (await api.put<ApiResponse<AdBanner>>(`/admin/ads-banners/${id}`, { adBanner })).data;

export const deleteAdBanner = async (id: string): Promise<ApiResponse<never>> =>
  (await api.delete<ApiResponse<never>>(`/admin/ads-banners/${id}`)).data;
