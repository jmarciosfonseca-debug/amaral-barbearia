// firebase-messaging-sw.js — Flyguer BarberShop
// ✅ Service Worker para Push Notifications com app fechado
// Colocar na raiz do projeto: /public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBLrzhVC9dB4mVNrKr3q5sIy_zVucOuMtU",
  authDomain: "amaral-barbearia.firebaseapp.com",
  projectId: "amaral-barbearia",
  storageBucket: "amaral-barbearia.firebasestorage.app",
  messagingSenderId: "748495048319",
  appId: "1:748495048319:web:305317b7035cf3a455b94a"
});

const messaging = firebase.messaging();

// Notificação em background (app fechado ou minimizado)
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Mensagem em background:', payload);

  const { title, body, icon, data } = payload.notification || {};

  self.registration.showNotification(title || '✂️ Flyguer BarberShop', {
    body:    body  || 'Você tem uma nova notificação.',
    icon:    icon  || '/logo-flyguer.png',
    badge:   '/logo-flyguer.png',
    vibrate: [200, 100, 200],
    tag:     data?.tag || 'flyguer-notif',
    data:    data  || {},
    actions: [
      { action:'abrir', title:'Abrir app' },
      { action:'fechar', title:'Dispensar'  },
    ],
  });
});

// Clique na notificação — abre o app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'fechar') return;
  event.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('flyguer-barbershop') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('https://flyguer-barbershop.vercel.app');
    })
  );
});
