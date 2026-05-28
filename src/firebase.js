// firebase.js
// ─────────────────────────────────────────────────────────────
// Projeto: Amaral Barbearia
// Firebase: NOVO projeto separado do MokLog
// Repositório: github.com/jmarciosfonseca-debug/amaral-barbearia
//
// ATENÇÃO: Substitua as configurações abaixo pelas do seu
// novo projeto Firebase após criar em console.firebase.google.com
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// TODO: Substituir com as configs do novo projeto Firebase
// Console: https://console.firebase.google.com
// Projeto: amaral-barbearia (ou o nome que você escolher)
const firebaseConfig = {
  apiKey:            "COLE_AQUI",
  authDomain:        "COLE_AQUI",
  projectId:         "COLE_AQUI",
  storageBucket:     "COLE_AQUI",
  messagingSenderId: "COLE_AQUI",
  appId:             "COLE_AQUI"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);

export { db };

// ─────────────────────────────────────────────────────────────
// COLLECTIONS UTILIZADAS NO APP
// ─────────────────────────────────────────────────────────────
//
// barbearia/config          → nome, whatsapp, pix, endereço
// barbearia/horarios        → dias abertos, horário, almoço
// barbeiros/{id}            → nome, foto, whatsapp, pin, ativo
// clientes/{cpf}            → nome, tel, cpf, senha, foto, preferência
// servicos/{id}             → nome, valor, duração, ativo
// agendamentos/{id}         → cliente, barbeiro, data, hora, serviços, status, pagamento
// clientes_fixos/{id}       → cliente, barbeiro, diaSemana, hora, excecoes[]
// financeiro/{data}         → resumo diário (pix, local, pendente, total)
// recepcionistas/{id}       → login, senha, permissões{}
// notificacoes/{id}         → destinatário, mensagem, lida, timestamp
// ─────────────────────────────────────────────────────────────
