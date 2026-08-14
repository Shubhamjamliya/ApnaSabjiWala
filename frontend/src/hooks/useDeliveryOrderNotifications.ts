import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import {
    acceptOrder as acceptOrderViaSocket,
    acceptOrderViaApi,
    getAvailableOrderNotifications,
    OrderNotificationData,
    rejectOrder as rejectOrderViaSocket,
    rejectOrderViaApi,
} from '../services/api/delivery/deliveryOrderNotificationService';
import { getSocketBaseURL } from '../services/api/config';

interface NotificationState {
    currentNotification: OrderNotificationData | null;
    notificationQueue: OrderNotificationData[];
    isConnected: boolean;
    error: string | null;
}

const POLLING_INTERVAL_MS = 15000;

export const useDeliveryOrderNotifications = (enabled = true) => {
    const { isAuthenticated, user, token } = useAuth();
    const [state, setState] = useState<NotificationState>({
        currentNotification: null,
        notificationQueue: [],
        isConnected: false,
        error: null,
    });

    const socketRef = useRef<Socket | null>(null);
    const suppressedOrderIdsRef = useRef(new Set<string>());
    const pollingInFlightRef = useRef(false);

    const enqueueNotifications = useCallback((incoming: OrderNotificationData[]) => {
        if (!incoming.length) return;

        setState(prev => {
            const existingIds = new Set([
                prev.currentNotification?.orderId,
                ...prev.notificationQueue.map(item => item.orderId),
            ].filter(Boolean));
            const uniqueIncoming = incoming.filter(item =>
                item?.orderId &&
                !existingIds.has(item.orderId) &&
                !suppressedOrderIdsRef.current.has(item.orderId)
            );

            if (!uniqueIncoming.length) return prev;
            if (!prev.currentNotification) {
                return {
                    ...prev,
                    currentNotification: uniqueIncoming[0],
                    notificationQueue: [...prev.notificationQueue, ...uniqueIncoming.slice(1)],
                };
            }

            return {
                ...prev,
                notificationQueue: [...prev.notificationQueue, ...uniqueIncoming],
            };
        });
    }, []);

    const removeNotification = useCallback((orderId: string, suppress = false) => {
        if (suppress) suppressedOrderIdsRef.current.add(orderId);

        setState(prev => {
            const remainingQueue = prev.notificationQueue.filter(item => item.orderId !== orderId);
            if (prev.currentNotification?.orderId === orderId) {
                return {
                    ...prev,
                    currentNotification: remainingQueue[0] || null,
                    notificationQueue: remainingQueue.slice(1),
                };
            }
            return { ...prev, notificationQueue: remainingQueue };
        });
    }, []);

    const pollAvailableOrders = useCallback(async () => {
        if (
            !enabled ||
            !isAuthenticated ||
            user?.userType !== 'Delivery' ||
            pollingInFlightRef.current
        ) return;

        pollingInFlightRef.current = true;
        try {
            const orders = await getAvailableOrderNotifications();
            enqueueNotifications(orders);
        } catch (error) {
            console.error('Failed to poll available delivery orders:', error);
        } finally {
            pollingInFlightRef.current = false;
        }
    }, [enabled, enqueueNotifications, isAuthenticated, user?.userType]);

    useEffect(() => {
        if (!enabled || !isAuthenticated || user?.userType !== 'Delivery' || !user?.id || !token) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            setState(prev => ({ ...prev, isConnected: false }));
            return;
        }

        const socket = io(getSocketBaseURL(), {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 15000,
            timeout: 20000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setState(prev => ({ ...prev, isConnected: true, error: null }));
            socket.emit('join-delivery-notifications', user.id);
            void pollAvailableOrders();
        });

        socket.on('disconnect', () => {
            setState(prev => ({ ...prev, isConnected: false }));
        });

        socket.on('connect_error', (error) => {
            setState(prev => ({
                ...prev,
                isConnected: false,
                error: `Connection failed: ${error.message}`,
            }));
        });

        socket.on('new-order', (orderData: OrderNotificationData) => {
            enqueueNotifications([orderData]);
        });

        socket.on('order-accepted', (data: { orderId: string }) => {
            removeNotification(data.orderId, true);
        });

        socket.on('order-rejected-by-all', (data: { orderId: string }) => {
            removeNotification(data.orderId, true);
        });

        return () => {
            socket.disconnect();
            if (socketRef.current === socket) socketRef.current = null;
        };
    }, [
        enabled,
        enqueueNotifications,
        isAuthenticated,
        pollAvailableOrders,
        removeNotification,
        token,
        user?.id,
        user?.userType,
    ]);

    useEffect(() => {
        if (!enabled || !isAuthenticated || user?.userType !== 'Delivery') return;

        void pollAvailableOrders();
        const intervalId = window.setInterval(pollAvailableOrders, POLLING_INTERVAL_MS);
        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') void pollAvailableOrders();
        };
        const refreshWhenOnline = () => void pollAvailableOrders();
        const refreshFromFcm = (event: Event) => {
            const payload = (event as CustomEvent).detail;
            if (payload?.data?.type === 'TASK') void pollAvailableOrders();
        };

        document.addEventListener('visibilitychange', refreshWhenVisible);
        window.addEventListener('online', refreshWhenOnline);
        window.addEventListener('fcm-message', refreshFromFcm as EventListener);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
            window.removeEventListener('online', refreshWhenOnline);
            window.removeEventListener('fcm-message', refreshFromFcm as EventListener);
        };
    }, [enabled, isAuthenticated, pollAvailableOrders, user?.userType]);

    const handleAccept = useCallback(async (
        orderId: string,
        navigate?: (path: string) => void,
    ) => {
        try {
            let result;
            const socket = socketRef.current;
            if (socket?.connected && user?.id) {
                result = await acceptOrderViaSocket(socket, orderId, user.id);
                if (!result.success && result.message === 'Request timeout') {
                    result = await acceptOrderViaApi(orderId);
                }
            } else {
                result = await acceptOrderViaApi(orderId);
            }

            if (result.success) {
                removeNotification(orderId, true);
                navigate?.(`/delivery/orders/${orderId}`);
            } else if (
                result.message.includes('already assigned') ||
                result.message.includes('no longer available')
            ) {
                removeNotification(orderId, true);
            }
            return result;
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || 'Failed to accept order';
            if (message.includes('already assigned') || message.includes('no longer available')) {
                removeNotification(orderId, true);
            }
            return { success: false, message };
        }
    }, [removeNotification, user?.id]);

    const handleReject = useCallback(async (orderId: string) => {
        try {
            let result;
            const socket = socketRef.current;
            if (socket?.connected && user?.id) {
                result = await rejectOrderViaSocket(socket, orderId, user.id);
                if (!result.success && result.message === 'Request timeout') {
                    result = await rejectOrderViaApi(orderId);
                }
            } else {
                result = await rejectOrderViaApi(orderId);
            }

            if (result.success || result.message === 'Order notification not found') {
                removeNotification(orderId, true);
            }
            return result;
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to reject order',
                allRejected: false,
            };
        }
    }, [removeNotification, user?.id]);

    const clearCurrentNotification = useCallback(() => {
        const orderId = state.currentNotification?.orderId;
        if (orderId) removeNotification(orderId, true);
    }, [removeNotification, state.currentNotification?.orderId]);

    return {
        currentNotification: state.currentNotification,
        notificationQueue: state.notificationQueue,
        isConnected: state.isConnected,
        error: state.error,
        acceptOrder: handleAccept,
        rejectOrder: handleReject,
        clearNotification: clearCurrentNotification,
        socket: socketRef.current,
        refreshAvailableOrders: pollAvailableOrders,
    };
};
