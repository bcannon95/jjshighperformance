const CACHE_NAME = 'jjs-hp-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'New message', body: event.data.text() }; }

  const options = {
    body:     payload.body ?? '',
    icon:     '/icons/icon-192.png',
    badge:    '/icons/icon-96.png',
    tag:      payload.conversationId ? `conv-${payload.conversationId}` : 'message',
    renotify: true,
    data:     { url: payload.url ?? '/messages' },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'New message', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/messages';
  event.waitUntil(
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

// ── Network-first fetch cache ─────────────────────────────────────────────────

// Network-first: skip Supabase and API calls, use cache as fallback for everything else
self.addEventListener('fetch', event => {
  const url = event.request.url;
  // Only handle http/https — browser extensions use chrome-extension:// etc.
  if (!url.startsWith('http')) return;
  if (
    url.includes('supabase.co') ||
    url.includes('/api/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
