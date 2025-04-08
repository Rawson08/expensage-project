/// <reference lib="WebWorker" />

// Declare self as a ServiceWorkerGlobalScope
declare const self: ServiceWorkerGlobalScope;

console.log('Custom Service Worker loading...');

// Listener for the 'push' event
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push Received.');
    console.log(`[Service Worker] Push had this data: "${event.data?.text()}"`);

    let title = 'ExpenSage Notification';
    let options: NotificationOptions = {
        body: 'You have a new notification.',
        icon: '/web-app-manifest-192x192.png', // Path relative to origin
        badge: '/badge-icon.png', // Optional: Path to a badge icon
        // tag: 'expense-notification', // Optional: Tag to coalesce notifications
        // renotify: true, // Optional: Vibrate/alert even if tag matches
        // data: {} // Optional: Add custom data to the notification
    };

    // Try to parse the incoming data as JSON
    if (event.data) {
        try {
            const pushData = event.data.json();
            console.log('[Service Worker] Push data parsed:', pushData);
            title = pushData.title || title;
            options = {
                ...options,
                body: pushData.body || options.body,
                icon: pushData.icon || options.icon, // Allow backend to override icon
                data: pushData.data || options.data, // Pass through any custom data
                // Add other options from pushData if needed (e.g., actions)
            };
        } catch (e) {
            console.log('[Service Worker] Push data is text:', event.data.text());
            options.body = event.data.text(); // Fallback to text body
        }
    }

    const notificationPromise = self.registration.showNotification(title, options);
    event.waitUntil(notificationPromise);
});

// Optional: Listener for notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click Received.');

    event.notification.close(); // Close the notification

    // Example: Focus or open a specific client window
    // This needs more logic based on the notification's data (event.notification.data)
    const urlToOpen = event.notification.data?.url || '/app'; // Default to dashboard

    event.waitUntil(
        self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true // Important for PWAs
        }).then((clientList) => {
            // Check if a window/tab matching the target URL is already open
            for (const client of clientList) {
                // Use URL constructor for robust comparison
                const clientUrl = new URL(client.url);
                const targetUrl = new URL(urlToOpen, self.location.origin);
                // Compare relevant parts (e.g., pathname, search) - adjust as needed
                if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
                    return client.focus(); // Focus existing window/tab
                }
            }
            // If no matching window found, open a new one
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});

// Basic install/activate listeners (vite-plugin-pwa might handle this better)
self.addEventListener('install', (_event) => { // Mark event as unused
    console.log('[Service Worker] Install');
    // event.waitUntil(self.skipWaiting()); // Optional: Force activation
});

self.addEventListener('activate', (_event) => { // Mark event as unused
    console.log('[Service Worker] Activate');
    // event.waitUntil(self.clients.claim()); // Optional: Take control immediately
});