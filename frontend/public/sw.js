// KheloPatna Service Worker for Live Mobile Push Notifications

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let payload = {
        title: '🚨 NEW TURF BOOKING!',
        body: 'A new slot booking has been confirmed!',
        icon: '/icon.png',
        badge: '/icon.png',
        tag: 'booking-' + Date.now(),
        data: { url: '/admin' }
    };

    try {
        payload = { ...payload, ...event.data.json() };
    } catch (e) {
        payload.body = event.data.text();
    }

    const options = {
        body: payload.body,
        icon: payload.icon || '/icon.png',
        badge: payload.badge || '/icon.png',
        tag: payload.tag || 'kp-notification',
        vibrate: [200, 100, 200, 100, 200],
        renotify: true,
        data: payload.data || { url: '/admin' },
        actions: [
            { action: 'open', title: 'Open Admin' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/admin';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes('/admin') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
