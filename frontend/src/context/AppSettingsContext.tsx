import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api/config';
import defaultLogo from '@assets/barodamart.png';

export interface AppPortalLogos {
  appName: string;
  appLogo: string;
  userLogo: string;
  adminLogo: string;
  sellerLogo: string;
  deliveryLogo: string;
}

interface AppSettingsContextType {
  settings: AppPortalLogos;
  loading: boolean;
  userLogo: string;
  adminLogo: string;
  sellerLogo: string;
  deliveryLogo: string;
  refreshSettings: () => Promise<void>;
}

const defaultLogos: AppPortalLogos = {
  appName: 'BarodaMart',
  appLogo: defaultLogo,
  userLogo: defaultLogo,
  adminLogo: defaultLogo,
  sellerLogo: defaultLogo,
  deliveryLogo: defaultLogo,
};

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: defaultLogos,
  loading: false,
  userLogo: defaultLogo,
  adminLogo: defaultLogo,
  sellerLogo: defaultLogo,
  deliveryLogo: defaultLogo,
  refreshSettings: async () => {},
});

let cachedSettingsData: any = null;
let settingsFetchPromise: Promise<any> | null = null;

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppPortalLogos>(defaultLogos);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPublicSettings = useCallback(async (force = false) => {
    try {
      if (!force && cachedSettingsData) {
        applySettings(cachedSettingsData);
        setLoading(false);
        return;
      }

      if (!settingsFetchPromise) {
        settingsFetchPromise = api.get('/app-settings').then(res => res.data).finally(() => {
          settingsFetchPromise = null;
        });
      }

      const responseData = await settingsFetchPromise;
      if (responseData?.success && responseData?.data) {
        cachedSettingsData = responseData.data;
        applySettings(responseData.data);
      }
    } catch (error) {
      console.warn('Failed to fetch public app settings, using default logos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const applySettings = (data: any) => {
    const fallback = data.appLogo || defaultLogo;
    setSettings({
      appName: data.appName || 'BarodaMart',
      appLogo: data.appLogo || defaultLogo,
      userLogo: data.userLogo || data.appLogo || defaultLogo,
      adminLogo: data.adminLogo || fallback,
      sellerLogo: data.sellerLogo || fallback,
      deliveryLogo: data.deliveryLogo || fallback,
    });
  };

  useEffect(() => {
    fetchPublicSettings();
  }, [fetchPublicSettings]);

  // Dynamically set browser favicon to User Logo
  useEffect(() => {
    const faviconUrl = settings.userLogo || settings.appLogo || defaultLogo;
    if (faviconUrl) {
      const linkList = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
      if (linkList.length > 0) {
        linkList.forEach((link) => {
          link.href = faviconUrl;
        });
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = faviconUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [settings.userLogo, settings.appLogo]);

  const value: AppSettingsContextType = {
    settings,
    loading,
    userLogo: settings.userLogo || defaultLogo,
    adminLogo: settings.adminLogo || defaultLogo,
    sellerLogo: settings.sellerLogo || defaultLogo,
    deliveryLogo: settings.deliveryLogo || defaultLogo,
    refreshSettings: fetchPublicSettings,
  };

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => useContext(AppSettingsContext);
