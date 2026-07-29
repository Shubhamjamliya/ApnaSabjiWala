import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase configuration from environment variables with fallbacks for production
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyC4qGF2SyoQMkIbB4unTJMpwOpEqip0Ge0",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "apnasabjiwala-4ceaa.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "apnasabjiwala-4ceaa",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "apnasabjiwala-4ceaa.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "313907744091",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:313907744091:web:6db8bcfaaa9282c4c31e7e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0YHQNFZ17P",
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

// Initialize Firebase Cloud Messaging
let messaging: any = null;

if (app) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn("Firebase Messaging not supported in this browser:", error);
  }
}

export { messaging, getToken, onMessage };
export default app;
