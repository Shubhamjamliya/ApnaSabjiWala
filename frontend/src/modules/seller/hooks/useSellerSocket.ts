import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import { getSocketBaseURL, getAuthToken } from '../../../services/api/config';

export interface SellerNotification {
    type: 'NEW_ORDER' | 'STATUS_UPDATE' | 'ORDER_CANCELLED';
    orderId: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    customer: {
        name: string;
        email: string;
        phone: string;
        address: {
            address: string;
            city: string;
            state?: string;
            pincode: string;
            landmark?: string;
        };
    };
    items: Array<{
        productName: string;
        quantity: number;
        price: number;
        total: number;
        variation?: string;
    }>;
    totalAmount: number;
    timestamp: Date;
}

export const useSellerSocket = (onNotificationReceived?: (notification: SellerNotification) => void) => {
    const { user, token, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const getSellerIdFromStorage = () => {
        try {
            const raw = localStorage.getItem('sellerUserData');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed?.id || parsed?._id || parsed?.sellerId || parsed?.userId || parsed?.seller?._id || null;
        } catch {
            return null;
        }
    };

    const sellerId =
        user?.id ||
        user?._id ||
        user?.userId ||
        user?.sellerId ||
        user?.seller?._id ||
        user?.seller?.id ||
        getSellerIdFromStorage();

    useEffect(() => {
        const resolvedToken = token || getAuthToken('seller') || getAuthToken();
        const normalizedUserType = String(user?.userType || '').toLowerCase();
        const isSellerUser = normalizedUserType === 'seller' || window.location.pathname.startsWith('/seller');

        if (!isSellerUser || !sellerId || (!isAuthenticated && !window.location.pathname.startsWith('/seller'))) {
            setSocket((currentSocket) => {
                currentSocket?.disconnect();
                return null;
            });
            return;
        }

        const socketUrl = getSocketBaseURL();
        const newSocket = io(socketUrl, {
            auth: resolvedToken ? { token: resolvedToken } : {},
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('✅ Seller connected to socket server');
            setIsConnected(true);

            // Join seller room
            if (!sellerId) {
                console.warn('⚠️ Seller ID missing. Unable to join seller room.');
                return;
            }
            console.log('📤 Emitting join-seller-room for seller:', sellerId);
            newSocket.emit('join-seller-room', String(sellerId));
        });

        newSocket.on('joined-seller-room', (data) => {
            console.log('📦 Joined seller notification room:', data.sellerId);
        });

        newSocket.on('seller-notification', (notification: SellerNotification) => {
            console.log('🔔 New seller notification received:', notification);
            window.dispatchEvent(new CustomEvent('seller-notification', { detail: notification }));
            if (onNotificationReceived) {
                onNotificationReceived(notification);
            }
        });

        newSocket.on('seller-pending-orders', (notifications: SellerNotification[]) => {
            console.log('Recovered pending seller orders:', notifications.length);
            notifications.forEach((notification) => {
                if (onNotificationReceived) {
                    onNotificationReceived(notification);
                }
            });
        });

        newSocket.on('seller-room-error', (error) => {
            console.error('Seller notification room error:', error?.message || error);
        });

        newSocket.on('disconnect', () => {
            console.log('❌ Seller disconnected from socket server');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('❌ Seller socket connect_error:', error?.message || error);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [isAuthenticated, token, sellerId, user, onNotificationReceived]);

    return { socket, isConnected };
};
