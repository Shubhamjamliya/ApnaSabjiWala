// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration (Production credentials)
const firebaseConfig = {
    apiKey: 'AIzaSyC4qGF2SyoQMkIbB4unTJMpwOpEqip0Ge0',
    authDomain: 'apnasabjiwala-4ceaa.firebaseapp.com',
    projectId: 'apnasabjiwala-4ceaa',
    storageBucket: 'apnasabjiwala-4ceaa.firebasestorage.app',
    messagingSenderId: '313907744091',
    appId: '1:313907744091:web:6db8bcfaaa9282c4c31e7e',
    measurementId: 'G-0YHQNFZ17P'
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.notification?.icon || payload.data?.icon || '/favicon.png',
        badge: '/favicon.png',
        data: payload.data || {},
        tag: payload.data?.type || 'default',
        requireInteraction: payload.data?.type === 'TASK'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked', event);

    event.notification.close();

    const data = event.notification.data || {};
    const path = data.link || '/';
    const targetUrl = new URL(path, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If any window for this origin is already open, focus it and navigate
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(targetUrl);
                    }
                    return client;
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Service worker installation
self.addEventListener('install', (event) => {
    console.log('[firebase-messaging-sw.js] Service worker installing');
    self.skipWaiting();
});

// Service worker activation
self.addEventListener('activate', (event) => {
    console.log('[firebase-messaging-sw.js] Service worker activated');
});
