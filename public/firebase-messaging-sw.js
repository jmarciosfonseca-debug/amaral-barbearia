// firebase-messaging-sw.js
// ✅ Service Worker para receber push notifications em background
// IMPORTANTE: este arquivo deve ficar na pasta /public (não em /src)

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBLrzhVC9dB4mVNrKr3q5sIy_zVucOuMtU",
  authDomain: "amaral-barbearia.firebaseapp.com",
  projectId: "amaral-barbearia",
  storageBucket: "amaral-barbearia.firebasestorage.app",
  messagingSenderId: "748495048319",
  appId: "1:748495048319:web:305317b7035cf3a455b94a"
});

const messaging = firebase.messaging();

// Recebe notificação quando app está em background
messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Flyguer BarberShop', {
    body: body || 'Você tem uma atualização.',
    icon: icon || '/logo-flyguer.png',
    badge: '/logo-flyguer.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
  });
});

// Ao clicar na notificação — abre o app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://flyguer-barbershop.vercel.app')
  );
});
