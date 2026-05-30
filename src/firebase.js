// firebase.js — Flyguer BarberShop
// ✅ FCM adicionado para push notifications

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBLrzhVC9dB4mVNrKr3q5sIy_zVucOuMtU",
  authDomain: "amaral-barbearia.firebaseapp.com",
  projectId: "amaral-barbearia",
  storageBucket: "amaral-barbearia.firebasestorage.app",
  messagingSenderId: "748495048319",
  appId: "1:748495048319:web:305317b7035cf3a455b94a"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ✅ FCM — só inicializa se o browser suportar
let messaging = null;
isSupported().then(supported => {
  if (supported) messaging = getMessaging(app);
}).catch(() => {});

export { db, auth, messaging };
export const VAPID_KEY = 'BOMGK_7cQ14unDBbmSBaDqW_dZxpLtdK2KvZHz34eYe0_FxYhlm4lpAkDlAsr_AQoFns1ZJMTTgJfLdwUTlcvV4';
