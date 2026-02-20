import api from "../config";
import { HomeSection } from "./adminHomeSectionService";

export interface PageConfig {
  page: string;
  sections: HomeSection[];
  updatedAt: string;
}

export interface PageConfigResponse {
  success: boolean;
  data: PageConfig;
  message?: string;
}

export const getPageConfig = async (page: string): Promise<PageConfigResponse> => {
  const response = await api.get<PageConfigResponse>(`/admin/page-config/${page}`);
  return response.data;
};

export const updatePageConfig = async (page: string, sections: string[]): Promise<PageConfigResponse> => {
  const response = await api.post<PageConfigResponse>(`/admin/page-config/${page}`, { sections });
  return response.data;
};
