import admin from 'firebase-admin';
import path from 'path';

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

export interface PushDeliveryResult {
    successCount: number;
    failureCount: number;
    responses: any[];
    error?: string;
}

export function initializeFirebaseAdmin() {
    if (firebaseInitialized) {
        return;
    }

    try {
        let credential;

        // Check if Firebase credentials are provided via environment variables (production)
        const envCredentials = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_CREDENTIALS;
        if (envCredentials) {
            console.log('🔧 Using Firebase credentials from environment variable (production mode)');
            // Handle potential double quoting or escaping issues if they arise, but standard JSON.parse should work for valid JSON string
            const serviceAccount = JSON.parse(envCredentials);
            credential = admin.credential.cert(serviceAccount);
        }
        // Fall back to service account file (development)
        else {
            console.log('🔧 Using Firebase credentials from file (development mode)');
            // Use path.resolve to get absolute path from project root
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
                path.resolve(process.cwd(), 'config', 'firebase-service-account.json');

            console.log(`📂 Looking for service account at: ${serviceAccountPath}`);
            const serviceAccount = require(serviceAccountPath);
            credential = admin.credential.cert(serviceAccount);
        }

        admin.initializeApp({
            credential: credential
        });

        firebaseInitialized = true;
        console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error: any) {
        console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
        console.log('⚠️  Push notifications will not work until Firebase is properly configured');
    }
}

/**
 * Send push notification to multiple FCM tokens
 * @param tokens - Array of FCM tokens
 * @param payload - Notification payload
 */
export async function sendPushNotification(
    tokens: string[],
    payload: {
        title: string;
        body: string;
        data?: { [key: string]: string };
        icon?: string;
    }
): Promise<PushDeliveryResult> {
    if (!firebaseInitialized) {
        console.warn('Firebase Admin not initialized. Skipping notification send.');
        return {
            successCount: 0,
            failureCount: tokens.length,
            responses: [],
            error: 'Firebase Admin is not initialized'
        };
    }

    try {
        if (!tokens || tokens.length === 0) {
            console.log('No tokens provided for notification');
            return {
                successCount: 0,
                failureCount: 0,
                responses: []
            };
        }

        // Ensure all data values are strings (FCM requirement)
        const stringData: { [key: string]: string } = {};
        if (payload.data) {
            for (const [k, v] of Object.entries(payload.data)) {
                if (v !== undefined && v !== null) {
                    stringData[k] = typeof v === 'string' ? v : String(v);
                }
            }
        }
        stringData.title = payload.title;
        stringData.body = payload.body;
        if (payload.icon) {
            stringData.icon = payload.icon;
        }

        const linkUrl = stringData.link || '/';

        const message: admin.messaging.MulticastMessage = {
            tokens: tokens,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: stringData,
            webpush: {
                notification: {
                    title: payload.title,
                    body: payload.body,
                    icon: payload.icon || '/favicon.png',
                    badge: '/favicon.png',
                },
                fcmOptions: {
                    link: linkUrl
                }
            },
            android: {
                priority: 'high',
                notification: {
                    title: payload.title,
                    body: payload.body,
                    icon: 'default',
                    sound: 'default',
                    clickAction: linkUrl,
                }
            }
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        console.log(`✅ Successfully sent: ${response.successCount} messages`);
        console.log(`❌ Failed: ${response.failureCount} messages`);

        // Log individual failures for debugging
        if (response.failureCount > 0) {
            console.log('❌ Detailed Failure Log:');
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`   Token Index ${idx}: [${tokens[idx].substring(0, 15)}...] -> Error: ${resp.error?.message} (${(resp.error as any)?.code})`);
                }
            });
        }

        return response;
    } catch (error: any) {
        console.error('❌ Error sending push notification:', error.message);
        return {
            successCount: 0,
            failureCount: tokens?.length || 0,
            responses: [],
            error: error.message || 'Firebase push delivery failed'
        };
    }
}

/**
 * Send notification to a specific user by fetching their tokens from database
 * @param userId - User ID
 * @param userType - Type of user (Customer, Admin, Seller, Delivery)
 * @param payload - Notification payload
 * @param includeMobile - Whether to include mobile tokens
 */
export async function sendNotificationToUser(
    userId: string,
    userType: 'Customer' | 'Admin' | 'Seller' | 'Delivery',
    payload: {
        title: string;
        body: string;
        data?: { [key: string]: string };
        icon?: string;
    },
    includeMobile: boolean = true
): Promise<PushDeliveryResult> {
    try {
        // Dynamically import the appropriate model
        let UserModel: any;
        switch (userType) {
            case 'Customer':
                UserModel = (await import('../models/Customer')).default;
                break;
            case 'Admin':
                UserModel = (await import('../models/Admin')).default;
                break;
            case 'Seller':
                UserModel = (await import('../models/Seller')).default;
                break;
            case 'Delivery':
                UserModel = (await import('../models/Delivery')).default;
                break;
            default:
                throw new Error(`Invalid user type: ${userType}`);
        }

        const user = await UserModel.findById(userId).exec();

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        // Collect tokens
        let tokens: string[] = [];

        if (user.fcmTokens && user.fcmTokens.length > 0) {
            tokens = [...tokens, ...user.fcmTokens];
        }

        if (includeMobile && user.fcmTokenMobile && user.fcmTokenMobile.length > 0) {
            tokens = [...tokens, ...user.fcmTokenMobile];
        }

        // Remove duplicates
        const uniqueTokens = [...new Set(tokens)];

        if (uniqueTokens.length === 0) {
            console.log(`No FCM tokens found for user ${userId}`);
            return {
                successCount: 0,
                failureCount: 0,
                responses: [],
                error: 'No FCM tokens are registered for this user'
            };
        }

        console.log(`Sending notification to ${uniqueTokens.length} device(s) for user ${userId}`);

        // Send notification
        const response = await sendPushNotification(uniqueTokens, payload);

        // Clean up invalid tokens
        if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success && uniqueTokens[idx]) {
                    // Check if error is due to invalid token
                    const errorCode = (resp.error as any)?.code;
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {
                        invalidTokens.push(uniqueTokens[idx]);
                    }
                }
            });

            // Remove invalid tokens from database
            if (invalidTokens.length > 0) {
                console.log(`Removing ${invalidTokens.length} invalid token(s) from database`);
                user.fcmTokens = user.fcmTokens?.filter((t: string) => !invalidTokens.includes(t)) || [];
                user.fcmTokenMobile = user.fcmTokenMobile?.filter((t: string) => !invalidTokens.includes(t)) || [];
                await user.save();
            }
        }

        return response;
    } catch (error: any) {
        console.error('❌ Error sending notification to user:', error.message);
        // Don't throw - notifications are non-critical
        return {
            successCount: 0,
            failureCount: 0,
            responses: [],
            error: error.message || 'Push delivery failed'
        };
    }
}

export default admin;
