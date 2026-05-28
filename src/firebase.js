// firebase.js — Amaral Barbearia
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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

export { db, auth };
