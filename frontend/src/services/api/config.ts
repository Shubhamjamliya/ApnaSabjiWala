import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Base API URL - adjust based on your backend URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// Socket.io base URL - extract from API_BASE_URL by removing /api/v1
// Socket connections need the base server URL without the API path
export const getSocketBaseURL = (): string => {
  // Use VITE_API_URL if explicitly set (for socket connections)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Otherwise, extract base URL from VITE_API_BASE_URL
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

  // Remove /api/v1 or /api from the end
  const socketUrl = apiBaseUrl.replace(/\/api\/v\d+$|\/api$/, '');

  return socketUrl || "http://localhost:5000";
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Role-specific storage keys
const AUTH_TOKEN_KEYS: Record<string, string> = {
  admin: "adminAuthToken",
  seller: "sellerAuthToken",
  delivery: "deliveryAuthToken",
  customer: "authToken",
};

const USER_DATA_KEYS: Record<string, string> = {
  admin: "adminUserData",
  seller: "sellerUserData",
  delivery: "deliveryUserData",
  customer: "userData",
};

// Determine the role based on URL or current path
const getRole = (url?: string): string => {
  const currentPath = window.location.pathname;
  const targetUrl = url || "";

  if (currentPath.includes("/admin") || targetUrl.includes("/admin/")) return "admin";
  if (currentPath.includes("/seller") || targetUrl.includes("/seller/") || targetUrl.includes("/sellers")) return "seller";
  if (currentPath.includes("/delivery") || targetUrl.includes("/delivery/")) return "delivery";

  return "customer";
};

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const role = getRole(config.url);
    const tokenKey = AUTH_TOKEN_KEYS[role];
    const token = localStorage.getItem(tokenKey);

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: any) => {
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes("/auth/");
      const hadToken = error.config?.headers?.Authorization;

      if (!isAuthEndpoint && hadToken) {
        const currentPath = window.location.pathname;
        if (currentPath.includes("/login") || currentPath.includes("/signup")) {
          return Promise.reject(error);
        }

        const role = getRole(error.config?.url);
        let redirectPath = "/login";

        if (role === "admin") {
          redirectPath = "/admin/login";
        } else if (role === "seller") {
          redirectPath = "/seller/login";
        } else if (role === "delivery") {
          redirectPath = "/delivery/login";
        }

        localStorage.removeItem(AUTH_TOKEN_KEYS[role]);
        localStorage.removeItem(USER_DATA_KEYS[role]);
        window.location.href = redirectPath;
      }
    }
    return Promise.reject(error);
  }
);

// Token management helpers
export const setAuthToken = (token: string, role?: string) => {
  const userRole = role || getRole();
  localStorage.setItem(AUTH_TOKEN_KEYS[userRole], token);
};

export const setUserData = (userData: any, role?: string) => {
  const userRole = role || getRole();
  localStorage.setItem(USER_DATA_KEYS[userRole], JSON.stringify(userData));
};

export const getAuthToken = (role?: string): string | null => {
  const userRole = role || getRole();
  return localStorage.getItem(AUTH_TOKEN_KEYS[userRole]);
};

export const getUserData = (role?: string): any | null => {
  const userRole = role || getRole();
  const data = localStorage.getItem(USER_DATA_KEYS[userRole]);
  return data ? JSON.parse(data) : null;
};

export const removeAuthToken = (role?: string) => {
  const userRole = role || getRole();
  localStorage.removeItem(AUTH_TOKEN_KEYS[userRole]);
  localStorage.removeItem(USER_DATA_KEYS[userRole]);
};

export default api;
