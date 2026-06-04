// promocao.test.js — Testes de concorrência e expiração
// Para rodar: npx jest promocao.test.js

import { promoEstaAtiva, resgatarPromocao } from './promocaoEngine';

// ─── MOCKS DO FIREBASE ────────────────────────────────────────
const mockPromoAtiva = {
  titulo: 'Corte Grátis',
  descricao: '1 corte grátis',
  vagas: 3,
  resgatados: 0,
  ativo: true,
  ehRelampago: true,
  expiracaoTimestamp: { toMillis: () => Date.now() + 3600000 }, // 1h no futuro
};

const mockPromoExpirada = {
  ...mockPromoAtiva,
  expiracaoTimestamp: { toMillis: () => Date.now() - 1000 }, // 1s no passado
};

const mockPromoEsgotada = {
  ...mockPromoAtiva,
  resgatados: 3,
  vagas: 3,
  ativo: false,
};

// ─── TESTES DA FUNÇÃO promoEstaAtiva ─────────────────────────
describe('promoEstaAtiva()', () => {
  test('retorna true para promoção válida', () => {
    expect(promoEstaAtiva(mockPromoAtiva)).toBe(true);
  });

  test('retorna false para promoção nula', () => {
    expect(promoEstaAtiva(null)).toBe(false);
    expect(promoEstaAtiva(undefined)).toBe(false);
  });

  test('retorna false quando ativo=false', () => {
    expect(promoEstaAtiva({ ...mockPromoAtiva, ativo: false })).toBe(false);
  });

  test('retorna false quando vagas esgotadas', () => {
    expect(promoEstaAtiva(mockPromoEsgotada)).toBe(false);
  });

  test('retorna false quando expirada por timestamp', () => {
    expect(promoEstaAtiva(mockPromoExpirada)).toBe(false);
  });

  test('retorna true com 1 segundo restante', () => {
    const promo = {
      ...mockPromoAtiva,
      expiracaoTimestamp: { toMillis: () => Date.now() + 1000 },
    };
    expect(promoEstaAtiva(promo)).toBe(true);
  });
});

// ─── MOCK DO FIRESTORE PARA TESTES DE TRANSAÇÃO ──────────────
let dbState = {
  promo: { ...mockPromoAtiva },
  resgates: {},
};

jest.mock('./firebase', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  doc: (db, col, id) => ({ col, id }),
  runTransaction: async (db, fn) => {
    // Simula transação com lock
    const tx = {
      get: async (ref) => {
        if (ref.col === 'config') {
          return {
            exists: () => !!dbState.promo,
            data: () => ({ ...dbState.promo }),
          };
        }
        if (ref.col === 'resgates_promo') {
          return {
            exists: () => !!dbState.resgates[ref.id],
            data: () => dbState.resgates[ref.id],
          };
        }
      },
      update: (ref, data) => {
        if (ref.col === 'config') {
          dbState.promo = { ...dbState.promo, ...data };
        }
      },
      set: (ref, data) => {
        if (ref.col === 'resgates_promo') {
          dbState.resgates[ref.id] = data;
        }
      },
    };
    return await fn(tx);
  },
  serverTimestamp: () => new Date().toISOString(),
  getDoc: async (ref) => ({
    exists: () => !!dbState.resgates[ref.id],
    data: () => dbState.resgates[ref.id],
  }),
  setDoc: async () => {},
  updateDoc: async (ref, data) => {
    if (ref.col === 'config') dbState.promo = { ...dbState.promo, ...data };
  },
}));

// ─── TESTE 1: RACE CONDITION ──────────────────────────────────
describe('TESTE 1: Dois usuários clicando no mesmo milissegundo', () => {
  beforeEach(() => {
    dbState = {
      promo: { ...mockPromoAtiva, vagas: 1, resgatados: 0, ativo: true },
      resgates: {},
    };
  });

  test('Apenas 1 dos 2 clientes simultâneos deve resgatar', async () => {
    const clienteA = { cpf: '111.111.111-11', nome: 'Cliente A', telefone: '11999999991' };
    const clienteB = { cpf: '222.222.222-22', nome: 'Cliente B', telefone: '11999999992' };

    // Simula 2 cliques simultâneos
    const [resultA, resultB] = await Promise.all([
      resgatarPromocao(clienteA),
      resgatarPromocao(clienteB),
    ]);

    const sucessos = [resultA, resultB].filter(r => r.ok).length;
    const falhas   = [resultA, resultB].filter(r => !r.ok).length;

    console.log('Cliente A:', resultA);
    console.log('Cliente B:', resultB);

    // Exatamente 1 sucesso e 1 falha
    expect(sucessos).toBe(1);
    expect(falhas).toBe(1);

    // Vagas não podem ser negativas
    expect(dbState.promo.resgatados).toBeLessThanOrEqual(dbState.promo.vagas);
  });

  test('Promoção deve ficar inativa após última vaga', async () => {
    const cliente = { cpf: '111.111.111-11', nome: 'Cliente A', telefone: '11999999991' };
    await resgatarPromocao(cliente);
    expect(dbState.promo.ativo).toBe(false);
  });

  test('Cliente não pode resgatar duas vezes', async () => {
    const cliente = { cpf: '111.111.111-11', nome: 'Cliente A', telefone: '11999999991' };
    dbState.promo.vagas = 5; // Mais vagas para não esgotar

    const result1 = await resgatarPromocao(cliente);
    const result2 = await resgatarPromocao(cliente);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(false);
    expect(result2.motivo).toBe('ja_resgatou');
  });
});

// ─── TESTE 2: EXPIRAÇÃO POR TIMESTAMP ────────────────────────
describe('TESTE 2: Relógio do servidor batendo o horário limite', () => {
  test('Banner some quando expira — promoEstaAtiva retorna false', () => {
    const promoQuaseExpirando = {
      ...mockPromoAtiva,
      expiracaoTimestamp: { toMillis: () => Date.now() + 100 }, // 100ms
    };

    expect(promoEstaAtiva(promoQuaseExpirando)).toBe(true);

    // Simula passagem do tempo
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 200);
    expect(promoEstaAtiva(promoQuaseExpirando)).toBe(false);
    jest.restoreAllMocks();
  });

  test('Promoção de hoje expira ao mudar de dia', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    const promoDeontem = {
      ...mockPromoAtiva,
      validade: 'hoje',
      criadoEm: { toDate: () => ontem },
    };

    expect(promoEstaAtiva(promoDeontem)).toBe(false);
  });

  test('Promoção de 48h ainda válida após 24h', () => {
    const promo48h = {
      ...mockPromoAtiva,
      expiracaoTimestamp: { toMillis: () => Date.now() + 24 * 3600 * 1000 },
    };
    expect(promoEstaAtiva(promo48h)).toBe(true);
  });

  test('Promoção de 48h inválida após 49h', () => {
    const promo48h = {
      ...mockPromoAtiva,
      expiracaoTimestamp: { toMillis: () => Date.now() - 1 * 3600 * 1000 },
    };
    expect(promoEstaAtiva(promo48h)).toBe(false);
  });
});

// ─── TESTE 3: CENÁRIOS DE BORDA ───────────────────────────────
describe('TESTE 3: Cenários de borda', () => {
  test('Promoção com 0 vagas é inválida', () => {
    expect(promoEstaAtiva({ ...mockPromoAtiva, vagas: 0, resgatados: 0 })).toBe(false);
  });

  test('resgatados > vagas ainda é inválida', () => {
    expect(promoEstaAtiva({ ...mockPromoAtiva, vagas: 2, resgatados: 5 })).toBe(false);
  });

  test('Promoção sem timestamp e sem validade é válida', () => {
    const promo = { titulo:'X', vagas:10, resgatados:0, ativo:true };
    expect(promoEstaAtiva(promo)).toBe(true);
  });
});
