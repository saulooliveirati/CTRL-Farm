// Firebase Messaging Service Worker for CTRL-Farm
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Parse configuration from query params or use defaults
const urlParams = new URLSearchParams(location.search);
const apiKey = urlParams.get('apiKey');
const projectId = urlParams.get('projectId');
const messagingSenderId = urlParams.get('messagingSenderId');
const appId = urlParams.get('appId');

if (apiKey && projectId) {
  firebase.initializeApp({
    apiKey,
    projectId,
    messagingSenderId,
    appId
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    const notificationTitle = payload.notification?.title || payload.data?.title || 'CTRL-Farm';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'Nova notificação do sistema',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  // Listen to standard push events if initialized dynamically
  self.addEventListener('push', (event) => {
    if (event.data) {
      try {
        const payload = event.data.json();
        const title = payload.notification?.title || payload.data?.title || 'CTRL-Farm Alerta';
        const options = {
          body: payload.notification?.body || payload.data?.body || 'Atualização na sua fazenda 3D',
          icon: '/favicon.ico',
          data: payload.data
        };
        event.waitUntil(self.registration.showNotification(title, options));
      } catch (e) {
        event.waitUntil(
          self.registration.showNotification('CTRL-Farm', {
            body: event.data.text()
          })
        );
      }
    }
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Validação segura de URL (Prevenção de Open Redirect)
  let targetUrl = '/';
  if (event.notification.data && typeof event.notification.data.url === 'string') {
    try {
      const parsed = new URL(event.notification.data.url, self.location.origin);
      if (parsed.origin === self.location.origin) {
        targetUrl = parsed.pathname + parsed.search;
      }
    } catch {
      targetUrl = '/';
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
