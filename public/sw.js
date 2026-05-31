// sw.js — Service Worker PWA — Flyguer BarberShop
// Cache inteligente para abertura instantânea mesmo em 3G/4G

const CACHE_NAME = 'barberapp-v2';
const CACHE_ESSENCIAL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-flyguer.png',
  '/logo-amaral.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
];

// INSTALL — cachear arquivos essenciais
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_ESSENCIAL))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE — limpar caches antigos
self.addEventListener('activate', event => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Removendo cache antigo:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH — cache first para assets, network first para dados
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Ignorar Firebase, APIs e WhatsApp
  if (url.includes('firestore.googleapis') ||
      url.includes('firebase') ||
      url.includes('googleapis.com') ||
      url.includes('wa.me') ||
      url.includes('vercel.app/api') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Se tem cache, retorna imediato E atualiza em background
      if (cached) {
        fetch(event.request).then(response => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }

      // Sem cache: busca na rede
      return fetch(event.request).then(response => {
        if (!response || !response.ok) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Fallback offline para páginas HTML
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// PUSH — notificações reais (Firebase Cloud Messaging)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const titulo  = data.title  || 'Flyguer BarberShop';
  const corpo   = data.body   || 'Você tem uma notificação!';
  const icone   = data.icon   || '/icons/icon-192x192.png';
  const url     = data.url    || '/';

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body:    corpo,
      icon:    icone,
      badge:   '/icons/icon-72x72.png',
      vibrate: [200, 100, 200, 100, 200],
      tag:     'barberapp-notif',
      data:    { url },
    })
  );
});

// NOTIFICATIONCLICK — abre o app ao clicar
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      const jaAberto = lista.find(c => c.url.includes(self.location.origin));
      if (jaAberto) { jaAberto.focus(); jaAberto.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
