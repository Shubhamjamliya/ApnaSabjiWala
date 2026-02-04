import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoading } from '../context/LoadingContext';

const useRouteLoader = () => {
  const location = useLocation();
  const { startRouteLoading, stopRouteLoading } = useLoading();
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Start loader on navigation, but SKIP for admin routes to avoid full-screen loader on sidebar navigation
    const isAdminRoute = location.pathname.startsWith('/admin');

    if (!isInitialMount.current && !isAdminRoute) {
      startRouteLoading();
    }

    // Small delay to simulate route processing and ensure loader visibility
    const timer = setTimeout(() => {
      // Only stop if we started it (or if it's initial mount)
      if (!isAdminRoute || isInitialMount.current) {
        stopRouteLoading();
      }

      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, startRouteLoading, stopRouteLoading]);
};

export default useRouteLoader;
