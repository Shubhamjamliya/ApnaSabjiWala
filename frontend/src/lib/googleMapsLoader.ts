import type { Libraries } from '@react-google-maps/api';

export const GOOGLE_MAPS_LOADER_ID = 'google-map-script';

// Keep a single libraries list across the app to prevent loader option mismatch.
export const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

export const getGoogleMapsApiKey = (): string => import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
