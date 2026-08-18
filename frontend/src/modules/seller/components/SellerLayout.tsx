import { ReactNode, useState, useCallback, useEffect, useRef } from 'react';
import SellerHeader from './SellerHeader';
import SellerSidebar from './SellerSidebar';
import { useSellerSocket, SellerNotification } from '../hooks/useSellerSocket';
import SellerNotificationAlert from './SellerNotificationAlert';
import { getPendingActionOrders } from '../../../services/api/orderService';

interface SellerLayoutProps {
  children: ReactNode;
}

const getOrderKey = (notification: SellerNotification) =>
  String(notification.orderId || notification.orderNumber);

export default function SellerLayout({ children }: SellerLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<SellerNotification[]>([]);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());

  const handleNotificationReceived = useCallback((notification: SellerNotification) => {
    const orderKey = getOrderKey(notification);
    if (!orderKey) return;

    if (notification.type !== 'NEW_ORDER') {
      if (!['Received', 'Pending'].includes(notification.status)) {
        knownOrderIdsRef.current.add(orderKey);
        setNotificationQueue((current) =>
          current.filter((item) => getOrderKey(item) !== orderKey),
        );
      }
      return;
    }

    if (knownOrderIdsRef.current.has(orderKey)) return;
    knownOrderIdsRef.current.add(orderKey);
    setNotificationQueue((current) => [...current, notification]);
  }, []);

  useSellerSocket(handleNotificationReceived);

  const refreshPendingOrders = useCallback(async () => {
    try {
      const response = await getPendingActionOrders();
      if (!response.success) return;

      const pendingOrderIds = new Set(response.data.map(getOrderKey));
      setNotificationQueue((current) =>
        current.filter((notification) => pendingOrderIds.has(getOrderKey(notification))),
      );
      response.data.forEach(handleNotificationReceived);
    } catch (error) {
      console.error('Pending seller order polling failed:', error);
    }
  }, [handleNotificationReceived]);

  useEffect(() => {
    // Socket recovery is sent when the seller joins the room. HTTP polling is
    // the fallback for missed socket events and temporary disconnections.
    refreshPendingOrders();
    const interval = window.setInterval(refreshPendingOrders, 15000);

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshPendingOrders();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshPendingOrders]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeNotification = () => {
    setNotificationQueue((current) => current.slice(1));
  };

  const resolveNotification = (orderId: string) => {
    knownOrderIdsRef.current.add(String(orderId));
    setNotificationQueue((current) =>
      current.filter((notification) => getOrderKey(notification) !== String(orderId)),
    );
  };

  const activeNotification = notificationQueue[0] || null;

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Real-time Notification Alert */}
      <SellerNotificationAlert
        notification={activeNotification}
        onClose={closeNotification}
        onResolved={resolveNotification}
      />

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar - Fixed */}
      <div
        className={`fixed left-0 top-0 h-screen z-50 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SellerSidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 w-full ${
          isSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {/* Header */}
        <SellerHeader onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-neutral-50">{children}</main>
      </div>
    </div>
  );
}

