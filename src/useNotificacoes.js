// useNotificacoes.js — Flyguer BarberShop
// ✅ Hook para gerenciar permissão e token FCM
// Salva token em Firestore /clientes/{cpf}/fcmToken

import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, messaging, VAPID_KEY } from './firebase';

export default function useNotificacoes(clienteCpf) {
  const [permissao, setPermissao] = useState(Notification.permission);
  const [token, setToken]         = useState(null);

  // Pede permissão e obtém token
  async function pedirPermissao() {
    if (!messaging) return; // browser não suporta
    try {
      const perm = await Notification.requestPermission();
      setPermissao(perm);
      if (perm !== 'granted') return;

      const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      setToken(fcmToken);

      // Salva token no Firestore se tiver CPF do cliente
      if (clienteCpf && fcmToken) {
        await updateDoc(doc(db, 'clientes', clienteCpf), {
          fcmToken,
          fcmAtualizadoEm: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Erro ao obter token FCM:', e);
    }
  }

  // Escuta notificações enquanto app está aberto (foreground)
  useEffect(() => {
    if (!messaging) return;
    const unsub = onMessage(messaging, payload => {
      const { title, body } = payload.notification || {};
      // Mostra notificação nativa mesmo com app aberto
      if (Notification.permission === 'granted') {
        new Notification(title || 'Flyguer BarberShop', {
          body: body || '',
          icon: '/logo-flyguer.png',
        });
      }
    });
    return () => unsub();
  }, []);

  return { permissao, token, pedirPermissao };
}
