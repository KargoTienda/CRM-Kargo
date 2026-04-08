/* ─── Kargo CRM — Service Worker ────────────────────────── */
const CACHE_NAME = 'kargo-v1';
const APP_SHELL = ['/', '/dashboard', '/static/js/main.js', '/static/css/main.css'];

// ── Install: skip waiting ──────────────────────────────────
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// ── Push: mostrar notificación ─────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch { payload = { title: 'Kargo CRM', body: e.data.text() }; }

  const { title = 'Kargo CRM', body = '', icon = '/icon-192.svg', badge = '/icon-192.svg', url = '/dashboard', tag, type } = payload;

  const iconMap = {
    venta: '/icon-192.svg',
    mensaje: '/icon-192.svg',
    reclamo: '/icon-192.svg',
    stock: '/icon-192.svg',
  };

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: iconMap[type] || icon,
      badge,
      tag: tag || type || 'kargo',
      renotify: true,
      data: { url },
      vibrate: [200, 100, 200],
      actions: [{ action: 'open', title: 'Ver en CRM' }],
    })
  );
});

// ── Click en notificación: abrir la app ───────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/dashboard';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
