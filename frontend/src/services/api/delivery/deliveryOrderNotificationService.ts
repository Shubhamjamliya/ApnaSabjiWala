import { Socket } from 'socket.io-client';
import api from '../config';

export interface OrderNotificationData {
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: {
        address: string;
        city: string;
        state?: string;
        pincode: string;
        landmark?: string;
    };
    total: number;
    subtotal: number;
    shipping: number;
    createdAt: string;
}

export interface AcceptOrderResponse {
    success: boolean;
    message: string;
}

export interface RejectOrderResponse {
    success: boolean;
    message: string;
    allRejected: boolean;
}

export const getAvailableOrderNotifications = async (): Promise<OrderNotificationData[]> => {
    const response = await api.get('/delivery/orders/available');
    return response.data.data || [];
};

export const acceptOrderViaApi = async (orderId: string): Promise<AcceptOrderResponse> => {
    const response = await api.post(`/delivery/orders/available/${orderId}/accept`);
    return response.data;
};

export const rejectOrderViaApi = async (orderId: string): Promise<RejectOrderResponse> => {
    const response = await api.post(`/delivery/orders/available/${orderId}/reject`);
    return response.data;
};

/**
 * Accept an order via WebSocket
 */
export const acceptOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<AcceptOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
            });
        }, 10000); // 10 second timeout

        console.log(`📤 Emitting accept-order for order ${orderId} by partner ${deliveryBoyId}`);
        socket.emit('accept-order', { orderId, deliveryBoyId });

        socket.once('accept-order-response', (response: AcceptOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

/**
 * Reject an order via WebSocket
 */
export const rejectOrder = (
    socket: Socket,
    orderId: string,
    deliveryBoyId: string
): Promise<RejectOrderResponse> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({
                success: false,
                message: 'Request timeout',
                allRejected: false,
            });
        }, 10000); // 10 second timeout

        console.log(`📤 Emitting reject-order for order ${orderId} by partner ${deliveryBoyId}`);
        socket.emit('reject-order', { orderId, deliveryBoyId });

        socket.once('reject-order-response', (response: RejectOrderResponse) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
};

