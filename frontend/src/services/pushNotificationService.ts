import { messaging, getToken, onMessage } from './firebase';
import { getAuthToken } from './api/config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BL6zx7ldM8gHbypngBAly0E2GiZp6AIaa3cFn37QThi6e5ObtcriTSCEFIYNPl2-PtvJbR49hezN98iqVIY1XZk';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

console.log('📡 Push Notification Service Config:', {
    hasVapid: !!VAPID_KEY,
    apiBase: API_BASE_URL,
    vapidKeyPrefix: VAPID_KEY?.substring(0, 10) + '...'
});

/**
 * Register service worker for Firebase messaging
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                updateViaCache: 'none'
            });
            console.log('✅ Service Worker registered:', registration);

            // Force update if needed
            await registration.update();

            return registration;
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            return null;
        }
    } else {
        console.warn('⚠️ Service Workers are not supported in this browser');
        return null;
    }
}

/**
 * Request notification permission from user
 */
async function requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
                return true;
            } else {
                console.log('❌ Notification permission denied');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }
    console.warn('⚠️ Notifications are not supported in this browser');
    return false;
}

/**
 * Get FCM token from Firebase
 */
async function getFCMToken(): Promise<string | null> {
    if (!messaging) {
        console.warn('⚠️ Firebase Messaging not initialized');
        return null;
    }

    try {
        const registration = await registerServiceWorker();
        if (!registration) {
            console.error('❌ Service Worker not registered');
            return null;
        }

        await registration.update(); // Update service worker

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('✅ FCM Token obtained:', token);
            return token;
        } else {
            console.log('❌ No FCM token available');
            return null;
        }
    } catch (error: any) {
        console.error('❌ Error getting FCM token:', error);
        return null;
    }
}

/**
 * Register FCM token with backend
 */
export async function registerFCMToken(forceUpdate: boolean = false): Promise<string | null> {
    try {
        // Check if already registered
        const savedToken = localStorage.getItem('fcm_token_web');
        if (savedToken && !forceUpdate) {
            console.log('ℹ️ FCM token already registered');
            return savedToken;
        }

        // Request permission
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            console.warn('⚠️ Notification permission not granted');
            return null;
        }

        // Get token
        const token = await getFCMToken();
        if (!token) {
            console.error('❌ Failed to get FCM token');
            return null;
        }

        // Save to backend
        const authToken = getAuthToken();
        if (!authToken) {
            console.warn('⚠️ User not authenticated, skipping token registration');
            return null;
        }

        const response = await fetch(`${API_BASE_URL}/fcm-tokens/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                token: token,
                platform: 'web'
            })
        });

        if (response.ok) {
            localStorage.setItem('fcm_token_web', token);
            console.log('✅ FCM token registered with backend');
            return token;
        } else {
            const error = await response.json();
            console.error('❌ Failed to register token with backend:', error);
            return null;
        }
    } catch (error: any) {
        console.error('❌ Error registering FCM token:', error);
        return null;
    }
}

/**
 * Setup foreground notification handler
 */
export function setupForegroundNotificationHandler(handler?: (payload: any) => void): void {
    if (!messaging) {
        console.warn('⚠️ Firebase Messaging not initialized');
        return;
    }

    console.log('🔔 Setting up Foreground Notification Handler...');
    onMessage(messaging, (payload) => {
        console.log('📬 ON_MESSAGE FIRE! Foreground message received:', payload);

        // Show notification even when app is in focus
        if ('Notification' in window) {
            console.log('🔔 Current Notification Permission:', Notification.permission);
            if (Notification.permission === 'granted') {
                try {
                    const notification = new Notification(payload.notification?.title || 'New Notification', {
                        body: payload.notification?.body || '',
                        icon: payload.notification?.icon || '/favicon.png',
                        badge: '/favicon.png',
                        tag: payload.data?.type || 'notification',
                        requireInteraction: false,
                        silent: false,
                        data: payload.data
                    });

                    // Handle notification click
                    notification.onclick = (event) => {
                        event.preventDefault();
                        const link = payload.data?.link || '/';
                        window.focus();
                        window.location.href = link;
                        notification.close();
                    };

                    console.log('✅ Foreground notification displayed via Web API');
                } catch (e) {
                    console.error('❌ Error showing foreground notification:', e);
                }
            } else {
                console.warn('⚠️ Notification permission not granted, cannot show foreground notification');
            }
        }

        // Call custom handler
        if (handler) {
            handler(payload);
        }
    });
}

/**
 * Initialize push notifications
 */
export async function initializePushNotifications(): Promise<void> {
    try {
        await registerServiceWorker();
        console.log('✅ Push notifications initialized');
    } catch (error) {
        console.error('❌ Error initializing push notifications:', error);
    }
}

/**
 * Remove FCM token from backend
 */
export async function removeFCMToken(providedAuthToken?: string): Promise<void> {
    try {
        const savedToken = localStorage.getItem('fcm_token_web');
        if (!savedToken) {
            return;
        }

        const authToken = providedAuthToken || getAuthToken();
        if (!authToken) {
            console.warn('⚠️ No auth token available to remove FCM token');
            return;
        }

        await fetch(`${API_BASE_URL}/fcm-tokens/remove`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                token: savedToken,
                platform: 'web'
            })
        });

        localStorage.removeItem('fcm_token_web');
        console.log('✅ FCM token removed');
    } catch (error) {
        console.error('❌ Error removing FCM token:', error);
    }
}

/**
 * Send test notification to current user
 */
export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
    try {
        const authToken = getAuthToken();
        if (!authToken) {
            return { success: false, message: 'User not authenticated' };
        }

        // Always force register during the test to ensure the token is fresh and in sync with backend
        console.log('ℹ️ Forcing fresh FCM token registration for test...');
        const tokenResult = await registerFCMToken(true);
        if (!tokenResult) {
            return { success: false, message: 'Could not register for notifications. Please check browser permissions.' };
        }

        console.log('🧪 Sending test notification request to backend...');
        const response = await fetch(`${API_BASE_URL}/fcm-tokens/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('🧪 Backend response status:', response.status);
        const data = await response.json();
        console.log('🧪 Backend response data:', data);

        if (data.success) {
            return {
                success: true,
                message: 'Test notification sent! It should appear in a few seconds.'
            };
        } else {
            return {
                success: false,
                message: data.message || 'Failed to send test notification'
            };
        }
    } catch (error: any) {
        console.error('❌ Error sending test notification:', error);
        return { success: false, message: error.message || 'Error occurred while sending notification' };
    }
}

