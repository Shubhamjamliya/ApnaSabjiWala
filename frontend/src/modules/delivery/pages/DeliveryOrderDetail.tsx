import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    getOrderDetails, 
    updateOrderStatus, 
    getSellerLocationsForOrder, 
    sendDeliveryOtp, 
    verifyDeliveryOtp, 
    updateDeliveryLocation, 
    checkSellerProximity, 
    confirmSellerPickup, 
    checkCustomerProximity, 
    rejectOrder,
    generateCodQr,
    collectCashPayment,
    verifyCodQrPayment,
    completeDeliveryOrder,
} from '../../../services/api/delivery/deliveryService';
import deliveryIcon from '@assets/deliveryboy/deliveryIcon.png';
import GoogleMapsTracking from '../../../components/GoogleMapsTracking';
import { SHOW_DEV_MODE } from '@/config/appMode';

// Helper to get delivery icon URL (works in both dev and production)
const getDeliveryIconUrl = () => {
    // Try imported path first (Vite will process this in production)
    if (deliveryIcon && typeof deliveryIcon === 'string') {
        return deliveryIcon;
    }
    // Fallback to public path
    return '/assets/deliveryboy/deliveryIcon.png';
};

// Icons components to avoid external dependency issues
const Icons = {
    ChevronLeft: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M15 18l-6-6 6-6" />
        </svg>
    ),
    MapPin: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    ),
    User: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    Phone: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    ),
    Clock: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    CheckCircle: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    Truck: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    ),
    ShoppingBag: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
    ),
    Navigation: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
    ),
    Store: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    ),
    AlertTriangle: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    QrCode: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
            <line x1="17" y1="7" x2="17.01" y2="7" />
            <line x1="7" y1="17" x2="7.01" y2="17" />
            <line x1="17" y1="17" x2="17.01" y2="17" />
        </svg>
    ),
    Cash: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2" />
            <path d="M6 12h.01M18 12h.01" />
        </svg>
    ),
    RotateCw: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
    ),
    X: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    )
};

type DeliveryOrderStatus = 'Received' | 'Pending' | 'Accepted' | 'Processed' | 'Ready for pickup' | 'Picked up' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Returned';

export default function DeliveryOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sellerLocations, setSellerLocations] = useState<any[]>([]);
    const [otpValue, setOtpValue] = useState('');
    const [otpVerifying, setOtpVerifying] = useState(false);
    const otpInputRef = useRef<HTMLInputElement | null>(null);
    const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [deliveryBoyLocation, setDeliveryBoyLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // New state for seller proximity and pickup tracking
    const [sellerProximity, setSellerProximity] = useState<Record<string, { withinRange: boolean; distance: number }>>({});
    const [pickupLoading, setPickupLoading] = useState<Record<string, boolean>>({});

    // New state for customer proximity
    const [customerProximity, setCustomerProximity] = useState<{ withinRange: boolean; distance: number } | null>(null);
    const [getOtpEnabled, setGetOtpEnabled] = useState(false);

    const fetchOrder = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await getOrderDetails(id);
            setOrder(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    // Fetch seller locations when order is assigned
    useEffect(() => {
        const fetchSellerLocations = async () => {
            if (!id || !order) return;
            // Only fetch if order has delivery boy assigned and status is before "Picked up"
            if (order.status && order.status !== 'Picked up' && order.status !== 'Delivered') {
                try {
                    const locations = await getSellerLocationsForOrder(id);
                    setSellerLocations(locations || []);
                } catch (err) {
                    console.error('Failed to fetch seller locations:', err);
                }
            }
        };
        fetchSellerLocations();
    }, [id, order?.status]);

    // Clean up when component unmounts
    useEffect(() => {
        return () => {
            if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
            }
        };
    }, []);


    useEffect(() => {
        if (order?.status === 'Out for Delivery') {
            window.setTimeout(() => {
                otpInputRef.current?.focus();
            }, 500);
        }
    }, [order?.status]);

    // Payment Collection Modal States
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentOption, setPaymentOption] = useState<'CASH' | 'QR' | null>(null);
    const [cashLoading, setCashLoading] = useState(false);
    const [cashCollectedSuccess, setCashCollectedSuccess] = useState(false);
    const [qrCodeLoading, setQrCodeLoading] = useState(false);
    const [qrCodeData, setQrCodeData] = useState<{ qrCodeId: string; qrImageUrl: string; amount: number; expiresAt: string } | null>(null);
    const [qrPolling, setQrPolling] = useState(false);
    const [qrPaymentVerified, setQrPaymentVerified] = useState(false);
    const [paymentStatusConfirmed, setPaymentStatusConfirmed] = useState(false);
    const [completingDelivery, setCompletingDelivery] = useState(false);
    const [otpErrorToast, setOtpErrorToast] = useState<string | null>(null);
    const qrPollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopQrPolling = useCallback(() => {
        if (qrPollingIntervalRef.current) {
            clearInterval(qrPollingIntervalRef.current);
            qrPollingIntervalRef.current = null;
        }
        setQrPolling(false);
    }, []);

    useEffect(() => {
        return () => {
            stopQrPolling();
        };
    }, [stopQrPolling]);

    const handleVerifyOtp = async () => {
        if (!id || !otpValue) {
            setOtpErrorToast('Please enter 4-digit OTP');
            return;
        }
        try {
            setOtpVerifying(true);
            setOtpErrorToast(null);
            const result = await verifyDeliveryOtp(id, otpValue);
            
            // Mark deliveryOtpVerified and update paymentStatus
            const isAlreadyPaid = result?.data?.isPaid || result?.data?.paymentStatus === 'Paid' || order?.paymentStatus === 'Paid' || (order?.paymentMethod !== 'COD');
            
            setOrder((prev: any) => ({
                ...prev,
                deliveryOtpVerified: true,
                paymentStatus: result?.data?.paymentStatus || prev?.paymentStatus || (isAlreadyPaid ? 'Paid' : 'Pending')
            }));

            if (isAlreadyPaid) {
                setPaymentStatusConfirmed(true);
                setPaymentOption(null);
            } else {
                setPaymentStatusConfirmed(false);
                setPaymentOption(null);
                setCashCollectedSuccess(false);
                setQrPaymentVerified(false);
                setQrCodeData(null);
            }

            // Instantly open the next step modal without browser alert
            setPaymentModalOpen(true);
            setOtpValue('');
        } catch (err: any) {
            // Show toast message to refill OTP
            setOtpValue('');
            setOtpErrorToast(err.message || 'Invalid OTP. Please check and try again.');
            otpInputRef.current?.focus();
        } finally {
            setOtpVerifying(false);
        }
    };

    const handleSelectCashCollected = async () => {
        if (!id) return;
        try {
            setCashLoading(true);
            stopQrPolling();
            const res = await collectCashPayment(id);
            if (res.success) {
                setCashCollectedSuccess(true);
                setPaymentStatusConfirmed(true);
                setPaymentOption('CASH');
            }
        } catch (err: any) {
            alert(err.message || 'Failed to record cash payment');
        } finally {
            setCashLoading(false);
        }
    };

    const handleSelectShowQr = async () => {
        if (!id) return;
        try {
            setPaymentOption('QR');
            setQrCodeLoading(true);
            setCashCollectedSuccess(false);
            stopQrPolling();
            
            const res = await generateCodQr(id);
            if (res.success && res.data) {
                setQrCodeData(res.data);
                setQrPolling(true);
                
                qrPollingIntervalRef.current = setInterval(async () => {
                    try {
                        const checkRes = await verifyCodQrPayment(id);
                        if (checkRes.verified) {
                            setQrPaymentVerified(true);
                            setPaymentStatusConfirmed(true);
                            stopQrPolling();
                        }
                    } catch (pollErr) {
                        console.error('Polling error:', pollErr);
                    }
                }, 3000);
            }
        } catch (err: any) {
            alert(err.message || 'Failed to generate dynamic Razorpay QR');
        } finally {
            setQrCodeLoading(false);
        }
    };

    const handleManualCheckQrStatus = async () => {
        if (!id) return;
        try {
            const checkRes = await verifyCodQrPayment(id);
            if (checkRes.verified) {
                setQrPaymentVerified(true);
                setPaymentStatusConfirmed(true);
                stopQrPolling();
                alert('Payment verified successfully!');
            } else {
                alert(checkRes.message || 'Payment not yet received. Please wait a moment and try again.');
            }
        } catch (err: any) {
            alert(err.message || 'Failed to verify QR payment');
        }
    };

    const handleCompleteDelivery = async () => {
        if (!id) return;
        if (!paymentStatusConfirmed && order?.paymentStatus !== 'Paid') {
            alert('Please collect/verify payment before completing delivery.');
            return;
        }
        try {
            setCompletingDelivery(true);
            const res = await completeDeliveryOrder(id);
            alert(res.message || 'Order delivered successfully!');
            setPaymentModalOpen(false);
            stopQrPolling();
            setOtpValue('');
            await fetchOrder();
        } catch (err: any) {
            alert(err.message || 'Failed to complete order delivery');
        } finally {
            setCompletingDelivery(false);
        }
    };

    // Handle seller pickup confirmation
    const handleSellerPickup = async (sellerId: string) => {
        if (!id || !deliveryBoyLocation) {
            alert('Location not available');
            return;
        }

        if (!SHOW_DEV_MODE) {
            const proximity = sellerProximity[sellerId];
            if (!proximity?.withinRange) {
                alert('You must be near the seller to confirm pickup.');
                return;
            }
        }

        try {
            setPickupLoading(prev => ({ ...prev, [sellerId]: true }));
            const result = await confirmSellerPickup(id, sellerId, deliveryBoyLocation.lat, deliveryBoyLocation.lng);
            alert(result.message || 'Pickup confirmed successfully');
            await fetchOrder(); // Refresh order data
        } catch (err: any) {
            alert(err.message || 'Failed to confirm pickup');
        } finally {
            setPickupLoading(prev => ({ ...prev, [sellerId]: false }));
        }
    };

    // Check proximity to sellers (runs periodically)
    useEffect(() => {
        const checkSellersProximity = async () => {
            if (!id || !deliveryBoyLocation || !sellerLocations.length) return;
            if (order?.status === 'Out for Delivery' || order?.status === 'Delivered') return;

            const proximityChecks: Record<string, { withinRange: boolean; distance: number }> = {};

            for (const seller of sellerLocations) {
                try {
                    const response = await checkSellerProximity(
                        id,
                        seller.sellerId,
                        deliveryBoyLocation.lat,
                        deliveryBoyLocation.lng
                    );
                    if (response.success && response.data) {
                        proximityChecks[seller.sellerId] = {
                            withinRange: response.data.withinRange,
                            distance: response.data.distanceMeters
                        };
                    }
                } catch (error) {
                    console.error(`Failed to check proximity for seller ${seller.sellerId}:`, error);
                }
            }

            setSellerProximity(proximityChecks);
        };

        if (sellerLocations.length > 0 && deliveryBoyLocation) {
            checkSellersProximity();
            const interval = setInterval(checkSellersProximity, 4000); // Check every 4 seconds
            return () => clearInterval(interval);
        }
    }, [id, deliveryBoyLocation, sellerLocations, order?.status]);

    // Check proximity to customer (runs periodically)
    useEffect(() => {
        const checkCustomerProx = async () => {
            if (!id || !deliveryBoyLocation) return;
            if (order?.status !== 'Out for Delivery') return;

            try {
                const response = await checkCustomerProximity(id, deliveryBoyLocation.lat, deliveryBoyLocation.lng);
                if (response.success && response.data) {
                    setCustomerProximity({
                        withinRange: response.data.withinRange,
                        distance: response.data.distanceMeters
                    });
                    setGetOtpEnabled(response.data.withinRange);
                }
            } catch (error) {
                console.error('Failed to check customer proximity:', error);
            }
        };

        if (deliveryBoyLocation && order?.status === 'Out for Delivery') {
            checkCustomerProx();
            const interval = setInterval(checkCustomerProx, 4000); // Check every 4 seconds
            return () => clearInterval(interval);
        }
    }, [id, deliveryBoyLocation, order?.status]);

    // Track if location permission was denied
    const locationPermissionDeniedRef = useRef<boolean>(false);

    // Get delivery boy's current location
    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            console.warn('Geolocation is not supported by this browser');
            return;
        }

        if (locationPermissionDeniedRef.current) {
            // Don't retry if permission was denied, unless explicitly requested by user
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setDeliveryBoyLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                locationPermissionDeniedRef.current = false; // Reset on success
                setLocationError(null);
            },
            (error: GeolocationPositionError) => {
                // Handle different error types
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        locationPermissionDeniedRef.current = true;
                        setLocationError('Location permission denied. Please enable location access in your browser settings to track delivery.');
                        console.warn('Location permission denied. Please enable location access in your browser settings.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Location information unavailable. Please check your device settings.');
                        console.warn('Location information unavailable. Please check your device settings.');
                        break;
                    case error.TIMEOUT:
                        setLocationError('Location request timed out. Please try again.');
                        console.warn('Location request timed out. Please try again.');
                        break;
                    default:
                        setLocationError(`Error getting location: ${error.message}`);
                        console.warn('Error getting location:', error.message);
                        break;
                }
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
        );
    }, []);

    const handleRetryLocation = () => {
        setLocationError(null);
        locationPermissionDeniedRef.current = false;
        getCurrentLocation();
    };

    useEffect(() => {
        getCurrentLocation();
    }, [getCurrentLocation]);



    // Socket.io connection
    const socketRef = useRef<any>(null);
    const [socketConnected, setSocketConnected] = useState(false);

    // Initialize Socket
    useEffect(() => {
        let isMounted = true;
        let socket: any = null;

        const initializeSocket = async () => {
            try {
                const [{ io }, { getSocketBaseURL, getAuthToken }] = await Promise.all([
                    import('socket.io-client'),
                    import('../../../services/api/config')
                ]);

                if (!isMounted) return;

                const baseURL = getSocketBaseURL();
                const token = getAuthToken();

                socket = io(baseURL, {
                    auth: { token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 2000
                });

                socket.on('connect', () => {
                    if (isMounted) {
                        console.log('✅ Delivery Socket Connected:', socket.id);
                        setSocketConnected(true);
                    }
                });

                socket.on('disconnect', (reason: string) => {
                    if (isMounted) {
                        console.log('❌ Delivery Socket Disconnected:', reason);
                        setSocketConnected(false);
                    }
                });

                socket.on('connect_error', (error: any) => {
                    if (isMounted) {
                        console.error('❌ Delivery Socket Connection Error:', error.message);
                    }
                });

                // Listen for order cancellation
                socket.on('order-cancelled', (data: any) => {
                    if (isMounted && data.orderId === id) {
                        console.log('Order cancelled event received:', data);
                        alert(data.message || 'Order has been cancelled');
                        // Update order status locally
                        setOrder((prev: any) => prev ? { ...prev, status: 'Cancelled' } : null);
                        // Optional: Navigate back or force re-fetch
                        fetchOrder();
                    }
                });

                socket.on('order-status-updated', (data: any) => {
                    if (isMounted && data.orderId === id) {
                        console.log('Order status updated event received:', data);
                        if (data.status) {
                            setOrder((prev: any) => prev ? { ...prev, status: data.status } : prev);
                        }
                        fetchOrder();
                    }
                });

                // Listen for real-time COD QR UPI payment confirmation
                socket.on('cod-qr-payment-received', (data: any) => {
                    if (isMounted && data.orderId === id) {
                        console.log('✅ COD QR payment received event:', data);
                        setQrPaymentVerified(true);
                        setPaymentStatusConfirmed(true);
                        stopQrPolling();
                    }
                });

                socketRef.current = socket;
            } catch (err) {
                console.error('Failed to initialize socket:', err);
            }
        };

        initializeSocket();

        return () => {
            isMounted = false;
            if (socket) {
                console.log('🔌 Disconnecting delivery socket...');
                socket.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    // Helper to get socket (for use in other effects)
    const getSocket = useCallback(() => socketRef.current, []);


    // Update delivery boy location from geolocation updates (Socket)
    useEffect(() => {
        if (!id || !order) return;

        const shouldTrack = order.status && order.status !== 'Delivered' && order.status !== 'Cancelled' && order.status !== 'Returned';
        const socket = socketRef.current;

        if (shouldTrack && socketConnected && socket) {
            const updateLocation = async () => {
                if (!navigator.geolocation) return;
                if (locationPermissionDeniedRef.current) return;

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const newLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        setDeliveryBoyLocation(newLocation);
                        setLastUpdate(new Date());

                        // Emit via Socket
                        socket.emit('update-location', {
                            orderId: id,
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        });

                        locationPermissionDeniedRef.current = false;
                    },
                    (error: GeolocationPositionError) => {
                        // ... error handling ...
                        if (error.code === error.PERMISSION_DENIED) {
                            if (!locationPermissionDeniedRef.current) {
                                locationPermissionDeniedRef.current = true;
                                setLocationError('Location permission denied. Please enable location access.');
                                console.warn('Location permission denied.');
                            }
                        } else if (error.code === error.TIMEOUT) {
                            // Don't necessarily show error UI for every background timeout
                            // but maybe log it
                            console.warn('Background location request timed out.');
                        }
                    },
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
                );
            };

            // Initial update
            updateLocation();

            // Interval (4 seconds)
            locationIntervalRef.current = setInterval(updateLocation, 4000);

            return () => {
                if (locationIntervalRef.current) {
                    clearInterval(locationIntervalRef.current);
                    locationIntervalRef.current = null;
                }
            };
        } else {
            if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
                locationIntervalRef.current = null;
            }
        }
    }, [id, order?.status, socketConnected]);


    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
                <p className="text-neutral-500">Loading order...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center flex-col">
                <p className="text-red-500 mb-4">{error || 'Order not found'}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-neutral-200 rounded-lg text-neutral-700 font-medium"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const statusFlow: DeliveryOrderStatus[] = ['Received', 'Pending', 'Accepted', 'Processed', 'Ready for pickup', 'Picked up', 'Out for Delivery', 'Delivered'];

    let currentStatusIndex = statusFlow.indexOf(order.status as DeliveryOrderStatus);
    // Handle cases where status might not be in the flow (e.g. Cancelled)
    if (currentStatusIndex === -1 && (order.status === 'Cancelled' || order.status === 'Returned')) {
        // Maybe show a different UI for cancelled/returned orders
        currentStatusIndex = -1;
    }

    const handleStatusChange = async (newStatus: DeliveryOrderStatus) => {
        if (!id) return;
        try {
            setLoading(true); // Or use a separate loading state for the action
            const updatedOrder = await updateOrderStatus(id, newStatus);
            // Verify the update was successful and update local state
            if (updatedOrder && updatedOrder.data) {
                setOrder(updatedOrder.data);
            } else {
                // Fallback - re-fetch everything
                await fetchOrder();
            }
        } catch (err: any) {
            alert(err.message || "Failed to update status");
            setLoading(false);
        }
    };

    const handleRejectOrder = async () => {
        if (!id) return;
        if (!window.confirm("Are you sure you want to reject this order assignment?")) return;
        
        try {
            setLoading(true);
            await rejectOrder(id);
            alert("Order assignment rejected.");
            navigate('/delivery/orders/pending');
        } catch (err: any) {
            alert(err.message || "Failed to reject order");
            setLoading(false);
        }
    };

    const getNextStatus = () => {
        if (currentStatusIndex !== -1 && currentStatusIndex < statusFlow.length - 1) {
            return statusFlow[currentStatusIndex + 1];
        }
        return null;
    };

    // Check if we have valid customer coordinates (direct fields + GeoJSON fallback)
    const toNum = (value: any): number => {
        const n = Number(value)
        return Number.isFinite(n) ? n : 0
    }
    const customerLat =
        toNum(order?.deliveryAddress?.latitude) ||
        toNum(order?.address?.latitude) ||
        toNum(order?.deliveryAddress?.location?.coordinates?.[1]) ||
        toNum(order?.address?.location?.coordinates?.[1])
    const customerLng =
        toNum(order?.deliveryAddress?.longitude) ||
        toNum(order?.address?.longitude) ||
        toNum(order?.deliveryAddress?.location?.coordinates?.[0]) ||
        toNum(order?.address?.location?.coordinates?.[0])
    const hasValidCustomerLocation = !!(customerLat && customerLng)

    const nextStatus = getNextStatus();
    const isMapVisible = order.status !== 'Delivered' && order.status !== 'Cancelled' && order.status !== 'Returned' && (
        hasValidCustomerLocation ||
        sellerLocations.length > 0 ||
        !!deliveryBoyLocation
    );
    const showSellerLocations = sellerLocations.length > 0 && order.status !== 'Picked up' && order.status !== 'Out for Delivery' && order.status !== 'Delivered';
    const showCustomerLocation = order.status === 'Picked up' || order.status === 'Out for Delivery';

    const handleOpenGoogleMaps = () => {
        const origin = deliveryBoyLocation || (sellerLocations.length > 0 ? { lat: Number(sellerLocations[0].latitude), lng: Number(sellerLocations[0].longitude) } : null) || { lat: 0, lng: 0 };
        const destination = hasValidCustomerLocation ? { lat: customerLat, lng: customerLng } : null;
        if (!destination || !destination.lat) {
            alert("Customer location is not available");
            return;
        }

        const allSellersLocations = sellerLocations.map(s => ({ lat: Number(s.latitude), lng: Number(s.longitude) }));

        const waypoints = allSellersLocations
            .filter(s => (s.lat !== origin.lat || s.lng !== origin.lng) && (s.lat !== destination.lat || s.lng !== destination.lng))
            .map(s => `${s.lat},${s.lng}`)
            .join('|');

        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-neutral-50 pb-32 relative">

            {/* Top Bar with Back Button */}
            <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 py-3 flex items-center shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                >
                    <Icons.ChevronLeft size={24} />
                </button>
                <span className="ml-2 font-semibold text-lg text-neutral-800">Order Details</span>

                <div className="ml-auto">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'Picked up' ? 'bg-indigo-100 text-indigo-700' :
                            order.status === 'Ready for pickup' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-orange-100 text-orange-700'
                        }`}>
                        {order.status}
                    </span>
                </div>
            </div>

            {/* Location Error Warning */}
            {locationError && (
                <div className="mx-4 mt-4 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                    <Icons.AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Location Access Required</p>
                        <p className="text-xs text-red-600 mt-0.5">{locationError}</p>
                        <button
                            onClick={handleRetryLocation}
                            className="mt-3 px-3 py-1.5 bg-white border border-red-200 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Google Maps View - Shared Component for Parity */}
            {isMapVisible && (
                <GoogleMapsTracking
                    sellerLocations={sellerLocations.map(s => ({
                        lat: Number(s.latitude),
                        lng: Number(s.longitude),
                        name: s.storeName
                    }))}
                    customerLocation={{
                        lat: customerLat || 0,
                        lng: customerLng || 0
                    }}
                    deliveryLocation={deliveryBoyLocation || undefined}
                    isTracking={!!deliveryBoyLocation}
                    showRoute={!!deliveryBoyLocation && (
                        ((order.status === 'Picked up' || order.status === 'Out for Delivery') && hasValidCustomerLocation) ||
                        (sellerLocations.length > 0 && order.status !== 'Delivered' && order.status !== 'Picked up' && order.status !== 'Out for Delivery')
                    )}
                    routeOrigin={deliveryBoyLocation || undefined}
                    routeDestination={
                        order.status === 'Picked up' || order.status === 'Out for Delivery'
                            ? (hasValidCustomerLocation ? {
                                lat: customerLat!,
                                lng: customerLng!
                            } : undefined)
                            : sellerLocations.length > 0
                                ? {
                                    lat: Number(sellerLocations[sellerLocations.length - 1].latitude),
                                    lng: Number(sellerLocations[sellerLocations.length - 1].longitude)
                                }
                                : undefined
                    }
                    routeWaypoints={
                        order.status === 'Picked up' || order.status === 'Out for Delivery'
                            ? []
                            : sellerLocations.length > 1
                                ? sellerLocations.slice(0, -1).map(s => ({ lat: Number(s.latitude), lng: Number(s.longitude) }))
                                : []
                    }
                    destinationName={
                        order.status === 'Picked up' || order.status === 'Out for Delivery'
                            ? order.address?.split(',')[0]
                            : sellerLocations.length > 0
                                ? sellerLocations[0].storeName
                                : undefined
                    }
                    onRouteInfoUpdate={setRouteInfo}
                    lastUpdate={lastUpdate}
                />
            )}

            {/* Seller Locations Card with Pickup Buttons (before all sellers picked up) */}
            {showSellerLocations && sellerLocations.length > 0 && (
                <div className="p-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                                <Icons.Store size={18} className="text-neutral-500" />
                                Seller Pickup Locations
                            </h3>
                            <button
                                onClick={handleOpenGoogleMaps}
                                className="flex items-center gap-1.5 bg-[#1a1a1a] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-black transition-colors"
                            >
                                <Icons.Navigation size={14} className="fill-current" />
                                Map
                            </button>
                        </div>
                        <div className="space-y-3">
                            {sellerLocations.map((seller: any, idx: number) => {
                                const isPickedUp = order?.sellerPickups?.some(
                                    (p: any) => p.seller === seller.sellerId && p.pickedUpAt
                                );
                                const proximity = sellerProximity[seller.sellerId];
                                const withinRange = proximity?.withinRange || false;
                                const distance = proximity?.distance;
                                const isLoading = pickupLoading[seller.sellerId] || false;
                                const canConfirmPickup = SHOW_DEV_MODE || withinRange;

                                return (
                                    <div key={idx} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-neutral-900">{seller.storeName}</p>
                                                    {isPickedUp && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                            <Icons.CheckCircle size={12} />
                                                            Picked Up
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-neutral-600">{seller.address}, {seller.city}</p>
                                                {distance !== undefined && (
                                                    <p className={`text-xs mt-1 font-medium ${withinRange ? 'text-green-600' :
                                                            distance < 1000 ? 'text-yellow-600' : 'text-red-600'
                                                        }`}>
                                                        {distance < 1000 ? `${distance}m away` : `${(distance / 1000).toFixed(1)}km away`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {!isPickedUp && (
                                            <button
                                                onClick={() => handleSellerPickup(seller.sellerId)}
                                                disabled={isLoading || !canConfirmPickup}
                                                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${!isLoading
                                                        ? canConfirmPickup
                                                            ? 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]'
                                                            : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isLoading
                                                    ? 'Confirming...'
                                                    : SHOW_DEV_MODE
                                                        ? 'Confirm Pickup (Dev Mode: Range Free)'
                                                        : 'Confirm Pickup'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="p-4 space-y-4 max-w-lg mx-auto">

                {/* Status Stepper Card */}
                {currentStatusIndex !== -1 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-neutral-500 text-xs font-medium uppercase tracking-wider mb-1">Process</p>
                                <h2 className="text-lg font-bold text-neutral-900">Order Progress</h2>
                            </div>
                        </div>

                        {/* Status Progress Bar */}
                        <div className="relative">
                            <div className="flex justify-between mb-2 relative z-10">
                                {statusFlow.map((step, idx) => (
                                    <div key={idx} className="flex flex-col items-center flex-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${idx <= currentStatusIndex
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white border-neutral-200 text-neutral-300'
                                            }`}>
                                            {idx <= currentStatusIndex ? <Icons.CheckCircle size={14} /> : idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Connecting Line */}
                            <div className="absolute top-4 left-0 w-full h-0.5 bg-neutral-100 -z-0">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-500"
                                    style={{ width: `${(currentStatusIndex / (statusFlow.length - 1)) * 100}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-neutral-500 font-medium mt-2">
                                {statusFlow.map((step, idx) => (
                                    <span key={idx} className={`text-center flex-1 transition-colors ${idx === currentStatusIndex ? 'text-blue-600 font-bold' : ''}`}>
                                        {step === 'Ready for pickup' ? 'Ready' : step}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}


                {/* Customer Details */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
                    <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                        <Icons.User size={18} className="text-neutral-500" />
                        Customer Details
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                                <Icons.User size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-neutral-900">{order.customerName}</p>
                                <p className="text-sm text-neutral-500">Customer</p>
                            </div>
                            <button
                                onClick={() => window.open(`tel:${order.customerPhone}`, '_system')}
                                className="ml-auto p-3 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-md transition-transform hover:scale-105 active:scale-95"
                            >
                                <Icons.Phone size={20} />
                            </button>
                        </div>
                        <div className="flex items-start gap-3 pt-3 border-t border-neutral-50">
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 text-orange-600">
                                <Icons.MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-neutral-600 leading-relaxed font-medium">{order.address}</p>
                                {order.distance && (
                                    <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-md">
                                        {order.distance} away
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delivery Earning Card - Show only if delivered or has earning */}
                {(order.status === 'Delivered' || (order.deliveryEarning && order.deliveryEarning > 0)) && (
                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-5 shadow-sm text-white mb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-green-100 text-xs font-medium mb-1">Your Earning</p>
                                <h3 className="text-2xl font-bold">₹ {order.deliveryEarning?.toFixed(2) || '0.00'}</h3>
                            </div>
                            <div className="bg-white/20 p-2 rounded-lg">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                {/* Order Items */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                            <Icons.ShoppingBag size={18} className="text-neutral-500" />
                            Order Summary
                        </h3>
                        <span className="text-xs font-medium text-neutral-500 px-2 py-1 bg-neutral-100 rounded-md">
                            {order.items?.length || 0} Items
                        </span>
                    </div>

                    <div className="space-y-3">
                        {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-neutral-50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600">{item.quantity}x</span>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-neutral-700 font-medium">{item.name}</span>
                                        <span className="text-[10px] text-teal-600 font-medium">Seller: {item.sellerName}</span>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-neutral-900">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-dashed border-neutral-200 flex justify-between items-center">
                        <span className="font-semibold text-neutral-700">Total Amount</span>
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-bold text-neutral-900">₹{order.totalAmount}</span>
                            {order.paymentMethod === 'COD' ? (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded mt-1 border border-red-100 uppercase animate-pulse">
                                    Collect Cash
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1 border border-green-100 uppercase">
                                    Paid Online
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Order Info */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 mb-20">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-neutral-50 rounded-lg">
                            <p className="text-xs text-neutral-500 mb-1">Order ID</p>
                            <p className="text-sm font-bold text-neutral-900">{order.orderId}</p>
                        </div>
                        <div className="p-3 bg-neutral-50 rounded-lg">
                            <p className="text-xs text-neutral-500 mb-1">Order Date</p>
                            <p className="text-sm font-bold text-neutral-900">
                                {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Customer Delivery OTP Section (only when order is Out for Delivery) */}
            {order.status === 'Out for Delivery' && (
                <div className="fixed bottom-24 left-6 right-6 z-30">
                    <div className="bg-white rounded-2xl p-4 shadow-2xl border border-neutral-200">
                        {order.deliveryOtpVerified ? (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                            <Icons.CheckCircle size={16} />
                                        </div>
                                        <span className="text-sm font-bold text-green-700">Customer OTP Verified</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                        order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {order.paymentStatus === 'Paid' ? 'Paid' : 'Payment Pending'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setPaymentModalOpen(true)}
                                    className="w-full py-3.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Icons.CheckCircle size={18} />
                                    {order.paymentStatus === 'Paid' ? 'Complete Delivery' : 'Collect Payment / Complete Order'}
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm font-semibold text-neutral-900 mb-3">Customer Delivery OTP</p>

                                {/* Distance indicator */}
                                {customerProximity && (
                                    <p className={`text-xs mb-2 font-medium ${customerProximity.withinRange ? 'text-green-600' :
                                            customerProximity.distance < 1000 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                        {customerProximity.distance < 1000
                                            ? `${customerProximity.distance}m from customer`
                                            : `${(customerProximity.distance / 1000).toFixed(1)}km from customer`}
                                    </p>
                                )}

                                {/* Error Toast Banner */}
                                {otpErrorToast && (
                                    <div className="p-3 mb-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                                        <Icons.AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
                                        <span>{otpErrorToast}</span>
                                    </div>
                                )}

                                {/* 4-digit OTP Input */}
                                <input
                                    ref={otpInputRef}
                                    type="text"
                                    value={otpValue}
                                    onChange={(e) => {
                                        setOtpErrorToast(null);
                                        setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 4));
                                    }}
                                    placeholder="Enter 4-digit OTP"
                                    disabled={otpVerifying || (!SHOW_DEV_MODE && !getOtpEnabled)}
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    aria-label="Enter customer delivery OTP"
                                    className={`w-full px-4 py-3 border rounded-xl text-lg font-semibold text-center mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${(SHOW_DEV_MODE || getOtpEnabled) ? 'border-neutral-300 bg-white' : 'border-neutral-200 bg-neutral-100 text-neutral-400'
                                        }`}
                                    maxLength={4}
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleVerifyOtp}
                                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${!otpVerifying && otpValue.length === 4 && (SHOW_DEV_MODE || getOtpEnabled)
                                                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                                                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                            }`}
                                        disabled={otpVerifying || otpValue.length !== 4 || (!SHOW_DEV_MODE && !getOtpEnabled)}
                                    >
                                        {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Payment Collection & Delivery Completion Modal */}
            {paymentModalOpen && (
                <div className="fixed inset-x-0 top-0 bottom-16 sm:bottom-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md sm:max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-neutral-100 flex flex-col max-h-[calc(100vh-6rem)] overflow-y-auto">
                        
                        {/* Modal Header */}
                        <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Icons.CheckCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-neutral-900 text-lg">Delivery & Payment</h3>
                                    <p className="text-xs text-neutral-500">Order #{order?.orderId || order?.orderNumber}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (!completingDelivery) {
                                        setPaymentModalOpen(false);
                                        stopQrPolling();
                                    }
                                }}
                                disabled={completingDelivery}
                                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors"
                            >
                                <Icons.X size={20} />
                            </button>
                        </div>

                        {/* Order Summary Pill */}
                        <div className="bg-neutral-50 rounded-2xl p-4 mb-5 flex justify-between items-center border border-neutral-100">
                            <div>
                                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Total Order Amount</p>
                                <p className="text-2xl font-black text-neutral-900 mt-0.5">₹{order?.totalAmount}</p>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase ${
                                    order?.paymentMethod === 'COD' 
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                    {order?.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid Online'}
                                </span>
                            </div>
                        </div>

                        {/* CASE 1: Order is Already Paid Online */}
                        {(order?.paymentMethod !== 'COD' || order?.paymentStatus === 'Paid' || (paymentStatusConfirmed && !paymentOption)) && (
                            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 mb-6 text-center">
                                <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-200">
                                    <Icons.CheckCircle size={28} />
                                </div>
                                <h4 className="text-base font-bold text-emerald-900 mb-1">Payment Already Completed</h4>
                                <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                                    Customer has already paid <strong className="text-emerald-900 font-bold">₹{order?.totalAmount}</strong> online. No cash collection required!
                                </p>
                            </div>
                        )}

                        {/* CASE 2: COD Order - Payment Options */}
                        {order?.paymentMethod === 'COD' && order?.paymentStatus !== 'Paid' && !paymentStatusConfirmed && !paymentOption && (
                            <div className="space-y-4 mb-6">
                                <p className="text-sm font-semibold text-neutral-700 text-center">
                                    Select how customer is paying ₹{order?.totalAmount}:
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* Option 1: Cash Collected */}
                                    <button
                                        onClick={handleSelectCashCollected}
                                        disabled={cashLoading}
                                        className="flex flex-col items-center text-center p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-500 active:scale-[0.98] transition-all shadow-sm group"
                                    >
                                        <div className="w-13 h-13 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                                            <Icons.Cash size={26} />
                                        </div>
                                        <span className="font-bold text-neutral-900 text-base mb-1">Cash Collected</span>
                                        <span className="text-xs text-neutral-500 leading-snug">Customer paid cash in hand</span>
                                        {cashLoading && (
                                            <span className="mt-2 text-xs font-semibold text-emerald-600">Recording...</span>
                                        )}
                                    </button>

                                    {/* Option 2: Show Dynamic QR */}
                                    <button
                                        onClick={handleSelectShowQr}
                                        disabled={qrCodeLoading}
                                        className="flex flex-col items-center text-center p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-500 active:scale-[0.98] transition-all shadow-sm group"
                                    >
                                        <div className="w-13 h-13 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                                            <Icons.QrCode size={26} />
                                        </div>
                                        <span className="font-bold text-neutral-900 text-base mb-1">Show QR Code</span>
                                        <span className="text-xs text-neutral-500 leading-snug">Dynamic Razorpay UPI QR (GPay, PhonePe)</span>
                                        {qrCodeLoading && (
                                            <span className="mt-2 text-xs font-semibold text-blue-600">Generating...</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CASE 3: Cash Collected Confirmed */}
                        {paymentOption === 'CASH' && cashCollectedSuccess && (
                            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 mb-6 text-center animate-in zoom-in-95 duration-200">
                                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md">
                                    <Icons.CheckCircle size={24} />
                                </div>
                                <h4 className="text-base font-bold text-emerald-900">Cash Payment Recorded</h4>
                                <p className="text-xs text-emerald-700 mt-1 font-medium">
                                    ₹{order?.totalAmount} collected in cash. Click <strong>Done</strong> below to complete delivery.
                                </p>
                            </div>
                        )}

                        {/* CASE 4: QR Code Flow */}
                        {paymentOption === 'QR' && (
                            <div className="mb-6 flex flex-col items-center">
                                {qrCodeLoading ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                                        <p className="text-sm font-semibold text-neutral-700">Generating Dynamic Razorpay UPI QR...</p>
                                    </div>
                                ) : qrPaymentVerified ? (
                                    <div className="w-full bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 text-center animate-in zoom-in-95 duration-200">
                                        <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md shadow-emerald-200">
                                            <Icons.CheckCircle size={28} />
                                        </div>
                                        <h4 className="text-base font-bold text-emerald-900">UPI Payment Received & Verified!</h4>
                                        <p className="text-xs text-emerald-700 mt-1 font-medium">
                                            Received ₹{order?.totalAmount} via Razorpay QR. Click <strong>Done</strong> to complete delivery.
                                        </p>
                                    </div>
                                ) : qrCodeData ? (
                                    <div className="w-full flex flex-col items-center">
                                        {/* QR Display Card */}
                                        <div className="bg-white p-3 sm:p-4 rounded-3xl border-2 border-blue-500 shadow-lg text-center flex flex-col items-center mb-3">
                                            {/* Cropped & Zoomed QR Frame */}
                                            <div className="w-60 h-60 sm:w-64 sm:h-64 rounded-2xl overflow-hidden relative flex items-center justify-center bg-white border border-neutral-200 mb-2.5">
                                                <img
                                                    src={qrCodeData.qrImageUrl}
                                                    alt="Razorpay Dynamic UPI QR"
                                                    className="w-full h-full object-contain scale-[2.4] -translate-y-[3%] pointer-events-none select-none"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                                                <Icons.QrCode size={14} className="text-blue-600" />
                                                <span>Scan with any UPI App</span>
                                            </div>
                                            <p className="text-[11px] text-neutral-500 mt-0.5">Google Pay • PhonePe • Paytm • BHIM • CRED</p>
                                        </div>

                                        {/* Polling status banner */}
                                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-3 animate-pulse">
                                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                                            Waiting for customer payment...
                                        </div>

                                        {/* Action buttons while in QR mode */}
                                        <div className="flex gap-2 w-full">
                                            <button
                                                onClick={handleManualCheckQrStatus}
                                                className="flex-1 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                                <Icons.RotateCw size={14} />
                                                Check Status
                                            </button>
                                            <button
                                                onClick={handleSelectCashCollected}
                                                className="flex-1 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                                <Icons.Cash size={14} />
                                                Switch to Cash
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {/* Bottom Done Button */}
                        <div className="mt-auto pt-4 border-t border-neutral-100 flex flex-col gap-2">
                            <button
                                onClick={handleCompleteDelivery}
                                disabled={!paymentStatusConfirmed || completingDelivery}
                                className={`w-full py-4 rounded-2xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
                                    paymentStatusConfirmed && !completingDelivery
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] shadow-blue-200'
                                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                }`}
                            >
                                {completingDelivery ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Completing Delivery...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icons.CheckCircle size={20} />
                                        <span>Done / Complete Order</span>
                                    </>
                                )}
                            </button>

                            {!paymentStatusConfirmed && (
                                <p className="text-[11px] text-center text-neutral-400 font-medium">
                                    Collect cash or scan UPI QR code above to enable the Done button.
                                </p>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {nextStatus && order.status !== 'Picked up' && order.status !== 'Out for Delivery' && (
                <div className="fixed bottom-24 left-6 right-6 z-30 flex flex-col gap-3">
                    {['Received', 'Pending'].includes(order.status) && (
                         <button
                            onClick={handleRejectOrder}
                            className="w-full py-4 rounded-2xl bg-white border-2 border-red-500 text-red-600 font-bold text-lg shadow-lg transition-transform active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Reject Order'}
                        </button>
                    )}
                    <button
                        onClick={() => handleStatusChange(nextStatus)}
                        className="w-full py-4 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-white font-bold text-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-3 overflow-hidden group"
                        disabled={loading}
                    >
                        <span className="relative z-10">
                            {loading ? 'Updating...' : nextStatus === 'Accepted' ? 'Accept Order' : nextStatus === 'Picked up' ? 'Order Taken' : `Mark as ${nextStatus}`}
                        </span>
                        {!loading && <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center relative z-10 group-hover:bg-white/30 transition-colors">
                            <Icons.ChevronLeft className="rotate-180" size={18} />
                        </div>}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
                    </button>
                </div>
            )}
        </div>
    );
}
