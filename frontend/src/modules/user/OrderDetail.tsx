import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Button from "../../components/ui/button";
import { useOrders } from "../../hooks/useOrders";
import { OrderStatus } from "../../types/order";
import GoogleMapsTracking from "../../components/GoogleMapsTracking";
import { useDeliveryTracking } from "../../hooks/useDeliveryTracking";
import DeliveryPartnerCard from "../../components/DeliveryPartnerCard";
import {
  cancelOrder,
  updateOrderNotes,
  getSellerLocationsForOrder,
  refreshDeliveryOtp,
} from "../../services/api/customerOrderService";
import RazorpayCheckout from "../../components/RazorpayCheckout";
import { useAuth } from "../../context/AuthContext";

// Subcomponents
import OrderDetailHeader from "./components/order-detail/OrderDetailHeader";
import OrderDetailPromoAndTips from "./components/order-detail/OrderDetailPromoAndTips";
import OrderDetailInfoCards from "./components/order-detail/OrderDetailInfoCards";
import OrderDetailModals from "./components/order-detail/OrderDetailModals";

export default function OrderDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirmed = searchParams.get("confirmed") === "true";
  const { getOrderById, fetchOrderById, loading: contextLoading } = useOrders();
  const [order, setOrder] = useState<any>(id ? getOrderById(id) : undefined);
  const [loading, setLoading] = useState(!order);

  const [showConfirmation, setShowConfirmation] = useState(confirmed);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    order?.status || "Received"
  );
  const [estimatedTime, setEstimatedTime] = useState(29);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    durationValue: number;
    distanceValue: number;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRazorpayCheckout, setShowRazorpayCheckout] = useState(false);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showSpecialRequestsModal, setShowSpecialRequestsModal] = useState(false);

  // Form states
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");

  const isTerminalStatus = (status?: string | null) =>
    ["Delivered", "Cancelled", "Cancelled by Seller", "Returned", "Rejected"].includes(
      String(status || "")
    );

  // Real-time delivery tracking via WebSocket
  const {
    deliveryLocation,
    eta,
    distance,
    status: trackingStatus,
    orderStatus: socketOrderStatus,
    isConnected,
    lastUpdate,
    error: trackingError,
    reconnect,
  } = useDeliveryTracking(id);

  // Seller locations for the order
  const [sellerLocations, setSellerLocations] = useState<any[]>([]);
  const [loadingSellerLocations, setLoadingSellerLocations] = useState(false);

  // Fetch order if not in context
  useEffect(() => {
    const loadOrder = async () => {
      if (!id) return;

      const existingOrder = getOrderById(id);
      if (existingOrder) {
        setOrder(existingOrder);
        setOrderStatus(existingOrder.status);
        setLoading(false);
        return;
      }

      setLoading(true);
      const fetchedOrder = await fetchOrderById(id);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
        setOrderStatus(fetchedOrder.status);
      }
      setLoading(false);
    };

    loadOrder();
  }, [id, getOrderById, fetchOrderById]);

  // Fetch seller locations when order is loaded
  useEffect(() => {
    const fetchSellerLocations = async () => {
      if (!id || !order) return;

      const shouldFetch =
        order.status &&
        order.status !== "Delivered" &&
        order.status !== "Cancelled" &&
        order.status !== "Picked up" &&
        order.status !== "Out for Delivery";

      if (shouldFetch) {
        try {
          setLoadingSellerLocations(true);
          const response = await getSellerLocationsForOrder(id);
          if (response.success && response.data) {
            setSellerLocations(response.data || []);
          }
        } catch (err) {
          console.error("Failed to fetch seller locations:", err);
        } finally {
          setLoadingSellerLocations(false);
        }
      }
    };

    fetchSellerLocations();
  }, [id, order?.status]);

  // Update orderStatus when order state changes
  useEffect(() => {
    if (order) {
      setOrderStatus(order.status);
    }
  }, [order]);

  // Real-time order status updates from socket
  useEffect(() => {
    if (socketOrderStatus && socketOrderStatus !== orderStatus) {
      if (
        (isTerminalStatus(String(orderStatus)) ||
          isTerminalStatus(String(order?.status))) &&
        !isTerminalStatus(String(socketOrderStatus))
      ) {
        return;
      }

      console.log("🔄 Real-time status update:", socketOrderStatus);
      setOrderStatus(socketOrderStatus as OrderStatus);

      if (id) {
        fetchOrderById(id).then((fetchedOrder) => {
          if (fetchedOrder) {
            setOrder(fetchedOrder);
          }
        });
      }
    }
  }, [socketOrderStatus, orderStatus, id, fetchOrderById]);

  // Periodic refresh
  useEffect(() => {
    if (!id) return;
    if (["Delivered", "Cancelled", "Returned"].includes(String(orderStatus)))
      return;

    const interval = setInterval(async () => {
      const refreshed = await fetchOrderById(id);
      if (refreshed) {
        setOrder(refreshed);
        if (refreshed.status && refreshed.status !== orderStatus) {
          if (
            isTerminalStatus(String(orderStatus)) &&
            !isTerminalStatus(String(refreshed.status))
          ) {
            return;
          }
          setOrderStatus(refreshed.status);
        }
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [id, orderStatus, fetchOrderById]);

  // Tracking status transitions
  useEffect(() => {
    if (!trackingStatus) return;

    if (
      isTerminalStatus(String(orderStatus)) ||
      isTerminalStatus(String(order?.status))
    )
      return;

    if (trackingStatus === "picked_up" && String(orderStatus) !== "Picked up") {
      setOrderStatus("Picked up" as OrderStatus);
    } else if (
      (trackingStatus === "in_transit" || trackingStatus === "nearby") &&
      String(orderStatus) !== "Out for Delivery"
    ) {
      setOrderStatus("Out for Delivery" as OrderStatus);
    } else if (trackingStatus === "delivered" && orderStatus !== "Delivered") {
      setOrderStatus("Delivered" as OrderStatus);
    }
  }, [trackingStatus, orderStatus]);

  // Stabilize ETA
  useEffect(() => {
    const routeEtaMins = routeInfo
      ? Math.max(1, Math.ceil(routeInfo.durationValue / 60))
      : null;
    const trackingEtaMins = Number.isFinite(eta as number)
      ? Math.max(1, Math.ceil(eta as number))
      : null;
    const nextEta = routeEtaMins ?? trackingEtaMins;

    if (!nextEta) return;

    setEstimatedTime((prev) => {
      if (!Number.isFinite(prev) || prev <= 0) return nextEta;
      const diff = nextEta - prev;
      if (Math.abs(diff) <= 1) return prev;
      if (diff > 0 && diff <= 3) return prev;
      return nextEta;
    });
  }, [routeInfo?.durationValue, eta]);

  // Confirmation animation timer
  useEffect(() => {
    if (confirmed && order) {
      const timer1 = setTimeout(() => {
        setShowConfirmation(false);
        setOrderStatus("Accepted");
      }, 3000);
      return () => clearTimeout(timer1);
    }
  }, [confirmed, order]);

  // Countdown timer fallback
  useEffect(() => {
    const hasLiveEta = !!routeInfo || Number.isFinite(eta as number);
    if (
      (orderStatus === "Accepted" || orderStatus === "On the way") &&
      !hasLiveEta
    ) {
      const timer = setInterval(() => {
        setEstimatedTime((prev) => Math.max(0, prev - 1));
      }, 60000);
      return () => clearInterval(timer);
    }
  }, [orderStatus, routeInfo, eta]);

  // Handlers
  const handleRefresh = async () => {
    if (!id) return;
    setIsRefreshing(true);
    const fetchedOrder = await fetchOrderById(id);
    if (fetchedOrder) {
      setOrder(fetchedOrder);
      setOrderStatus(fetchedOrder.status);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleShare = async () => {
    const shareData = {
      title: `Order #${displayOrderId}`,
      text: `Track my BarodaMart order: Order #${displayOrderId}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleCallStore = () => {
    const storeNumber = order?.seller?.phone || "1234567890";
    window.location.href = `tel:${storeNumber}`;
  };

  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      alert("Please provide a cancellation reason");
      return;
    }
    if (!id) return;

    try {
      await cancelOrder(id, cancellationReason);
      setOrderStatus("Cancelled" as any);
      setShowCancelModal(false);
      alert("Order cancelled successfully");
      handleRefresh();
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Failed to cancel order");
    }
  };

  const handleSaveInstructions = async () => {
    try {
      if (!id) return;
      await updateOrderNotes(id, { deliveryInstructions });
      setShowInstructionsModal(false);
      handleRefresh();
    } catch (error) {
      console.error("Failed to save instructions:", error);
      alert("Failed to save instructions");
    }
  };

  const handleSaveSpecialRequests = async () => {
    try {
      if (!id) return;
      await updateOrderNotes(id, { specialRequests });
      setShowSpecialRequestsModal(false);
      handleRefresh();
    } catch (error) {
      console.error("Failed to save special requests:", error);
      alert("Failed to save special requests");
    }
  };

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-sm text-neutral-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto text-center py-20">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4">
            Order Not Found
          </h1>
          <Link to="/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const rawOrderId = order?.orderNumber || order?.id || order?._id;
  const rawOrderIdString = rawOrderId ? String(rawOrderId) : "";
  const displayOrderId = rawOrderIdString.includes("-")
    ? rawOrderIdString.split("-").slice(-1)[0]
    : rawOrderIdString || "N/A";

  const statusConfig: Record<
    string,
    { title: string; subtitle: string; color: string }
  > = {
    Received: {
      title: "Order placed",
      subtitle: "Order will reach you shortly",
      color: "bg-green-700",
    },
    Accepted: {
      title: "Preparing your order",
      subtitle: `Arriving in ${estimatedTime} mins`,
      color: "bg-green-700",
    },
    "On the way": {
      title: "Order picked up",
      subtitle: `Arriving in ${estimatedTime} mins`,
      color: "bg-green-700",
    },
    Delivered: {
      title: "Order delivered",
      subtitle: "Enjoy your meal!",
      color: "bg-green-600",
    },
    Pending: {
      title: "Order pending",
      subtitle: "Waiting for confirmation",
      color: "bg-yellow-600",
    },
    Processed: {
      title: "Order processed",
      subtitle: "Preparing for delivery",
      color: "bg-green-700",
    },
    "Picked up": {
      title: "Order picked up",
      subtitle: `Arriving in ${estimatedTime} mins`,
      color: "bg-green-700",
    },
    "Out for Delivery": {
      title: "Out for delivery",
      subtitle: `Arriving in ${estimatedTime} mins`,
      color: "bg-green-700",
    },
    Cancelled: {
      title: "Order cancelled",
      subtitle: "This order has been cancelled",
      color: "bg-red-600",
    },
    "Cancelled by Seller": {
      title: "Order cancelled by seller",
      subtitle: "The store was unable to fulfill your order",
      color: "bg-red-600",
    },
    Rejected: {
      title: "Order rejected",
      subtitle: "The store has rejected your order",
      color: "bg-red-600",
    },
    Returned: {
      title: "Order returned",
      subtitle: "This order has been returned",
      color: "bg-gray-600",
    },
  };

  const currentStatus = statusConfig[orderStatus] || statusConfig["Received"];

  const toNumberOrZero = (value: any): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const customerLatFromCoords = toNumberOrZero(
    order?.deliveryAddress?.location?.coordinates?.[1] ??
    order?.address?.location?.coordinates?.[1]
  );
  const customerLngFromCoords = toNumberOrZero(
    order?.deliveryAddress?.location?.coordinates?.[0] ??
    order?.address?.location?.coordinates?.[0]
  );
  const customerLatDirect = toNumberOrZero(
    order?.deliveryAddress?.latitude ?? order?.address?.latitude
  );
  const customerLngDirect = toNumberOrZero(
    order?.deliveryAddress?.longitude ?? order?.address?.longitude
  );

  const customerLocation = {
    lat: customerLatDirect || customerLatFromCoords,
    lng: customerLngDirect || customerLngFromCoords,
  };
  const hasValidCustomerLocation =
    !(customerLocation.lat === 0 && customerLocation.lng === 0);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header & Splash Modal */}
      <OrderDetailHeader
        currentStatus={currentStatus}
        orderStatus={orderStatus}
        isRefreshing={isRefreshing}
        showConfirmation={showConfirmation}
        onRefresh={handleRefresh}
        onShare={handleShare}
      />

      {/* Map Section */}
      {!showConfirmation && !['Delivered', 'Cancelled', 'Returned'].includes(order?.status) && (
        <GoogleMapsTracking
          sellerLocations={sellerLocations.map(s => ({
            lat: s.latitude,
            lng: s.longitude,
            name: s.storeName
          }))}
          customerLocation={customerLocation}
          deliveryLocation={deliveryLocation || undefined}
          isTracking={isConnected && !!deliveryLocation}
          showRoute={
            !!deliveryLocation &&
            hasValidCustomerLocation &&
            order?.status !== 'Delivered' &&
            order?.status !== 'Cancelled' &&
            order?.status !== 'Returned'
          }
          routeOrigin={deliveryLocation || undefined}
          routeDestination={hasValidCustomerLocation ? customerLocation : undefined}
          routeWaypoints={
            order?.status === 'Picked up' || order?.status === 'Out for Delivery'
              ? []
              : sellerLocations.map(s => ({
                lat: s.latitude,
                lng: s.longitude,
              }))
          }
          destinationName={
            order?.status === 'Picked up' || order?.status === 'Out for Delivery'
              ? order?.deliveryAddress?.address?.split(',')[0] || order?.address?.split(',')[0] || "Delivery Address"
              : sellerLocations.length > 0
                ? "Sellers & Delivery Address"
                : "Delivery Address"
          }
          onRouteInfoUpdate={setRouteInfo}
          lastUpdate={lastUpdate}
        />
      )}

      {/* Tracking Error Display */}
      {trackingError && (
        <div className="mx-4 mt-2 px-4 py-2 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-center gap-2">
          <span>⚠️</span>
          <span>{trackingError}</span>
        </div>
      )}

      {/* Delivery Partner Card */}
      {(order?.deliveryPartner ||
        order?.deliveryBoy ||
        order?.deliveryBoyName ||
        order?.deliveryOtp) && (
          <DeliveryPartnerCard
            partner={{
              name:
                order?.deliveryPartner?.name ||
                order?.deliveryBoy?.name ||
                order?.deliveryBoyName ||
                "Delivery Partner",
              phone:
                order?.deliveryPartner?.phone ||
                order?.deliveryPartner?.mobile ||
                order?.deliveryPartner?.phoneNumber ||
                order?.deliveryPartner?.mobileNumber ||
                order?.deliveryPartner?.mobile_no ||
                order?.deliveryPartner?.phone_no ||
                order?.deliveryPartner?.contact_no ||
                order?.deliveryBoy?.phone ||
                order?.deliveryBoy?.mobile ||
                order?.deliveryBoy?.phoneNumber ||
                order?.deliveryBoy?.mobileNumber ||
                order?.deliveryBoy?.mobile_no ||
                order?.deliveryBoy?.phone_no ||
                order?.deliveryBoy?.contact_no ||
                order?.deliveryBoyPhone ||
                order?.deliveryPartnerPhone ||
                order?.deliveryPartner?.user?.phone ||
                order?.deliveryBoy?.user?.phone ||
                order?.deliveryPartner?.user?.mobile ||
                order?.deliveryBoy?.user?.mobile ||
                order?.deliveryPartner?.user?.phoneNumber ||
                order?.deliveryBoy?.user?.phoneNumber ||
                order?.deliveryPartner?.user?.mobile_no ||
                order?.deliveryBoy?.user?.mobile_no,
              profileImage:
                order?.deliveryPartner?.profileImage ||
                order?.deliveryBoy?.profileImage ||
                order?.deliveryBoyProfileImage,
              vehicleNumber:
                order?.deliveryPartner?.vehicleNumber ||
                order?.deliveryBoy?.vehicleNumber ||
                order?.deliveryBoyVehicleNumber ||
                order?.deliveryPartnerVehicleNumber ||
                order?.deliveryBoy?.vehicleNo ||
                order?.deliveryPartner?.vehicleNo ||
                order?.deliveryBoy?.vehicleNumberPlate ||
                order?.deliveryPartner?.vehicleNumberPlate,
            }}
            eta={routeInfo ? Math.ceil(routeInfo.durationValue / 60) : eta}
            distance={routeInfo ? routeInfo.distanceValue : distance}
            isTracking={isConnected && !!deliveryLocation}
            deliveryOtp={order?.deliveryOtp}
            onCall={() => {
              const phone =
                order?.deliveryPartner?.phone ||
                order?.deliveryPartner?.mobile ||
                order?.deliveryPartner?.phoneNumber ||
                order?.deliveryPartner?.mobileNumber ||
                order?.deliveryPartner?.mobile_no ||
                order?.deliveryPartner?.phone_no ||
                order?.deliveryPartner?.contact_no ||
                order?.deliveryBoy?.phone ||
                order?.deliveryBoy?.mobile ||
                order?.deliveryBoy?.phoneNumber ||
                order?.deliveryBoy?.mobileNumber ||
                order?.deliveryBoy?.mobile_no ||
                order?.deliveryBoy?.phone_no ||
                order?.deliveryBoy?.contact_no ||
                order?.deliveryBoyPhone ||
                order?.deliveryPartnerPhone ||
                order?.deliveryPartner?.user?.phone ||
                order?.deliveryBoy?.user?.phone ||
                order?.deliveryPartner?.user?.mobile ||
                order?.deliveryBoy?.user?.mobile ||
                order?.deliveryPartner?.user?.phoneNumber ||
                order?.deliveryBoy?.user?.phoneNumber ||
                order?.deliveryPartner?.user?.mobile_no ||
                order?.deliveryBoy?.user?.mobile_no;
              if (phone) window.location.href = `tel:${phone}`;
            }}
          />
        )}

      {/* Scrollable Content Body */}
      <div className="px-4 py-4 space-y-4 pb-24">
        <OrderDetailInfoCards
          order={order}
          id={id}
          displayOrderId={displayOrderId}
          onPayNow={() => setShowRazorpayCheckout(true)}
          onCallStore={handleCallStore}
          onOpenItemsModal={() => setShowItemsModal(true)}
          onOpenInstructionsModal={() => setShowInstructionsModal(true)}
          onOpenSpecialRequestsModal={() => setShowSpecialRequestsModal(true)}
          onOpenCancelModal={() => setShowCancelModal(true)}
        />

        <OrderDetailPromoAndTips />
      </div>

      {/* Modals */}
      <OrderDetailModals
        order={order}
        showCancelModal={showCancelModal}
        onCloseCancelModal={() => setShowCancelModal(false)}
        cancellationReason={cancellationReason}
        onChangeCancellationReason={setCancellationReason}
        onConfirmCancelOrder={handleCancelOrder}
        showInstructionsModal={showInstructionsModal}
        onCloseInstructionsModal={() => setShowInstructionsModal(false)}
        deliveryInstructions={deliveryInstructions}
        onChangeDeliveryInstructions={setDeliveryInstructions}
        onSaveInstructions={handleSaveInstructions}
        showItemsModal={showItemsModal}
        onCloseItemsModal={() => setShowItemsModal(false)}
        showSpecialRequestsModal={showSpecialRequestsModal}
        onCloseSpecialRequestsModal={() => setShowSpecialRequestsModal(false)}
        specialRequests={specialRequests}
        onChangeSpecialRequests={setSpecialRequests}
        onSaveSpecialRequests={handleSaveSpecialRequests}
      />

      {/* Razorpay Online Payment Checkout */}
      {showRazorpayCheckout && (
        <RazorpayCheckout
          orderId={id || ""}
          amount={order?.totalAmount || 0}
          customerDetails={{
            name: order?.deliveryAddress?.name || user?.name || "Customer",
            email: order?.deliveryAddress?.email || user?.email || "customer@barodamart.com",
            phone: order?.deliveryAddress?.phone || user?.phone || "9876543210",
          }}
          onSuccess={() => {
            setShowRazorpayCheckout(false);
            handleRefresh();
          }}
          onFailure={(error) => {
            setShowRazorpayCheckout(false);
            console.error("Payment failed:", error);
          }}
        />
      )}
    </div>
  );
}
