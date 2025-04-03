import apiClient from './api'; // Assuming you have an configured axios instance

// VAPID Public Key - Replace with environment variable ideally
const VAPID_PUBLIC_KEY = 'BAHrjWJz-MMSJcQMZZy3NNEfqOtRInV03HAn-NOPyMlHQWs8YZqXDHUxd2Qq2weVCX3qqzcK1Qozykg98Ss4Shg';

/**
 * Converts a base64 string to a Uint8Array.
 * This is needed for the VAPID key.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Checks if Push Notifications are supported by the browser.
 */
export function isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Requests permission from the user to show notifications.
 * Returns the permission state ('granted', 'denied', 'default').
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isPushSupported()) {
        console.warn('Push notifications not supported by this browser.');
        return 'denied';
    }
    return await Notification.requestPermission();
}

/**
 * Subscribes the user to push notifications.
 * Returns the PushSubscription object or null if failed.
 */
export async function subscribeUserToPush(): Promise<PushSubscription | null> {
    if (!isPushSupported()) {
        console.error('Push notifications not supported.');
        return null;
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
        console.warn('Notification permission not granted.');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready; // Ensure SW is active
        const existingSubscription = await registration.pushManager.getSubscription();

        if (existingSubscription) {
            console.log('User is already subscribed.');
            return existingSubscription;
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true, // Required for web push
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        console.log('User subscribed successfully:', subscription);
        return subscription;
    } catch (error) {
        console.error('Failed to subscribe user to push notifications:', error);
        return null;
    }
}

/**
 * Sends the push subscription object to the backend server.
 * TODO: Implement the backend endpoint for this.
 */
export async function sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    if (!subscription) {
        console.error('No subscription object provided.');
        return;
    }
    try {
        // IMPORTANT: Define the actual backend endpoint URL
        await apiClient.post('/api/notifications/subscribe', subscription);
        console.log('Subscription sent to backend successfully.');
    } catch (error) {
        console.error('Failed to send subscription to backend:', error);
        // Optional: Handle error, maybe try unsubscribing locally if backend fails?
    }
}

/**
 * Unsubscribes the user from push notifications.
 */
export async function unsubscribeUserFromPush(): Promise<boolean> {
     if (!isPushSupported()) {
        console.error('Push notifications not supported.');
        return false;
    }
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            const successful = await subscription.unsubscribe();
            if (successful) {
                console.log('User unsubscribed successfully.');
                // TODO: Send unsubscribe request to backend to remove the subscription
                // await apiClient.post('/api/notifications/unsubscribe', { endpoint: subscription.endpoint });
                return true;
            } else {
                 console.error('Failed to unsubscribe user.');
                 return false;
            }
        } else {
            console.log('User was not subscribed.');
            return true; // Already unsubscribed
        }
    } catch (error) {
        console.error('Failed to unsubscribe user:', error);
        return false;
    }
}

/**
 * Main function to handle the subscription process.
 * Requests permission, subscribes, and sends to backend.
 */
export async function initializePushNotifications(): Promise<void> {
    if (!isPushSupported()) return;

    const subscription = await subscribeUserToPush();
    if (subscription) {
        await sendSubscriptionToBackend(subscription);
    }
}