// promocaoEngine.js — Flyguer BarberShop
// ✅ Engine de promoção com:
//    - Transação atômica (trava de concorrência)
//    - Estado em tempo real via onSnapshot
//    - Expiração automática por timestamp
//    - Race condition protection via Firestore runTransaction

import { db } from './firebase';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, runTransaction, serverTimestamp,
  collection, query, where, getDocs,
} from 'firebase/firestore';

// ─── CONSTANTES ────────────────────────────────────────────────
export const PROMO_DOC = 'config/promocao_ativa';
export const RESGATES_COL = 'resgates_promo';

// ─── VERIFICAR SE PROMOÇÃO ESTÁ VÁLIDA ────────────────────────
export function promoEstaAtiva(promo) {
  if (!promo) return false;
  if (!promo.ativo) return false;
  if (promo.resgatados >= promo.vagas) return false;

  // Verifica expiração por timestamp
  if (promo.expiracaoTimestamp) {
    const agora = Date.now();
    const expira = promo.expiracaoTimestamp.toMillis
      ? promo.expiracaoTimestamp.toMillis()
      : new Date(promo.expiracaoTimestamp).getTime();
    if (agora > expira) return false;
  }

  // Verifica validade por string
  if (promo.validade === 'hoje') {
    const hoje = new Date().toISOString().split('T')[0];
    if (promo.criadoEm) {
      const criado = promo.criadoEm.toDate
        ? promo.criadoEm.toDate().toISOString().split('T')[0]
        : new Date(promo.criadoEm).toISOString().split('T')[0];
      if (hoje !== criado) return false;
    }
  }

  return true;
}

// ─── LISTENER TEMPO REAL DA PROMOÇÃO ──────────────────────────
// Retorna unsubscribe. Chama onMudanca com { promo, ativa }
export function escutarPromocao(onMudanca) {
  const [col, docId] = PROMO_DOC.split('/');
  const ref = doc(db, col, docId);

  const unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      onMudanca({ promo: null, ativa: false });
      return;
    }
    const promo = snap.data();
    const ativa = promoEstaAtiva(promo);

    // Auto-desativar se expirou mas ainda está ativo no DB
    if (!ativa && promo.ativo && promo.expiracaoTimestamp) {
      const agora = Date.now();
      const expira = promo.expiracaoTimestamp.toMillis
        ? promo.expiracaoTimestamp.toMillis()
        : new Date(promo.expiracaoTimestamp).getTime();
      if (agora > expira) {
        // Desativa silenciosamente no Firestore
        updateDoc(ref, { ativo: false }).catch(console.error);
      }
    }

    onMudanca({ promo, ativa });
  }, console.error);

  return unsub;
}

// ─── RESGATAR PROMOÇÃO — TRANSAÇÃO ATÔMICA ────────────────────
// Garante que apenas 1 cliente por vez pode resgatar
// Proteção contra race condition (dois cliques no mesmo milissegundo)
export async function resgatarPromocao(cliente) {
  const [col, docId] = PROMO_DOC.split('/');
  const promoRef  = doc(db, col, docId);
  const resgateId = `${cliente.cpf}_ativa`;
  const resgateRef = doc(db, RESGATES_COL, resgateId);

  try {
    const resultado = await runTransaction(db, async (tx) => {
      // Lê promoção e resgate dentro da transação (garantia atômica)
      const [snapPromo, snapResgate] = await Promise.all([
        tx.get(promoRef),
        tx.get(resgateRef),
      ]);

      // Validações dentro da transação
      if (!snapPromo.exists()) {
        return { ok: false, motivo: 'sem_promo' };
      }

      const promo = snapPromo.data();

      if (!promoEstaAtiva(promo)) {
        return { ok: false, motivo: 'encerrada' };
      }

      if (snapResgate.exists()) {
        return { ok: false, motivo: 'ja_resgatou' };
      }

      // ✅ Tudo válido — executa dentro da mesma transação
      const novosResgatados = (promo.resgatados || 0) + 1;
      const vagasEsgotadas  = novosResgatados >= promo.vagas;

      tx.update(promoRef, {
        resgatados: novosResgatados,
        ...(vagasEsgotadas ? { ativo: false } : {}),
      });

      tx.set(resgateRef, {
        clienteCpf:      cliente.cpf,
        clienteNome:     cliente.nome,
        clienteTel:      cliente.telefone || '',
        promoTitulo:     promo.titulo,
        promoDescricao:  promo.descricao || '',
        resgatadoEm:     serverTimestamp(),
        expiracaoTimestamp: promo.expiracaoTimestamp || null,
        utilizado:       false,
        utilizadoEm:     null,
      });

      return { ok: true, promo, vagasEsgotadas };
    });

    return resultado;

  } catch (e) {
    console.error('[resgatarPromocao] Erro na transação:', e);
    // Firestore cancela transações conflitantes automaticamente
    // Se dois clientes clicam no mesmo ms, o segundo recebe ABORTED
    if (e.code === 'aborted' || e.message?.includes('contention')) {
      return { ok: false, motivo: 'concorrencia' };
    }
    return { ok: false, motivo: 'erro', detalhe: e.message };
  }
}

// ─── CRIAR PROMOÇÃO (gerente) ──────────────────────────────────
export async function criarPromocao({
  titulo, descricao, mensagem, vagas,
  validade, // 'hoje' | '24h' | '48h' | 'personalizado'
  duracaoHoras, // usado se validade === 'personalizado'
  ehRelampago = true,
}) {
  const agora = new Date();
  let expiracaoTimestamp = null;

  if (validade === 'hoje') {
    // Expira à meia-noite de hoje
    const meianoite = new Date(agora);
    meianoite.setHours(23, 59, 59, 999);
    expiracaoTimestamp = meianoite;
  } else if (validade === '24h') {
    expiracaoTimestamp = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
  } else if (validade === '48h') {
    expiracaoTimestamp = new Date(agora.getTime() + 48 * 60 * 60 * 1000);
  } else if (validade === 'personalizado' && duracaoHoras) {
    expiracaoTimestamp = new Date(agora.getTime() + duracaoHoras * 60 * 60 * 1000);
  }

  const [col, docId] = PROMO_DOC.split('/');
  await setDoc(doc(db, col, docId), {
    titulo,
    descricao:          descricao || '',
    mensagem:           mensagem  || titulo,
    vagas:              Number(vagas),
    resgatados:         0,
    ativo:              true,
    ehRelampago,
    validade,
    expiracaoTimestamp: expiracaoTimestamp || null,
    criadoEm:           serverTimestamp(),
  });
}

// ─── ENCERRAR PROMOÇÃO (gerente) ───────────────────────────────
export async function encerrarPromocao() {
  const [col, docId] = PROMO_DOC.split('/');
  await updateDoc(doc(db, col, docId), { ativo: false });
}

// ─── VERIFICAR SE CLIENTE JÁ RESGATOU ─────────────────────────
export async function clienteJaResgatou(cpf) {
  const snap = await getDoc(doc(db, RESGATES_COL, `${cpf}_ativa`));
  return snap.exists();
}
