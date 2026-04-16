import api from './config';

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  actionLabel?: string;
}

export interface NotificationsResponse {
  success: boolean;
  message: string;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getMyNotifications = async (page = 1, limit = 20): Promise<NotificationsResponse> => {
  const response = await api.get(`/customer/notifications?page=${page}&limit=${limit}`);
  return response.data;
};

export const markAsRead = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.patch(`/customer/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/customer/notifications/mark-all-read');
  return response.data;
};
