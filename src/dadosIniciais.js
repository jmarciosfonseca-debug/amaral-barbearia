// dadosIniciais.js — Flyguer BarberShop
// ─────────────────────────────────────────────────────────────
// Dados iniciais para popular o Firestore
// Rode uma vez pelo painel ou via script
// ─────────────────────────────────────────────────────────────

// ── BARBEIROS ─────────────────────────────────────────────────
export const BARBEIROS_INICIAIS = [
  {
    id:         'b1',
    nome:       'Amaral',
    cargo:      'Gerente · Barbeiro',
    pin:        '12345',   // deve trocar no primeiro acesso
    perfil:     'gerente',
    ativo:      true,
    disponivel: true,
    foto:       null,
  },
  {
    id:         'b2',
    nome:       'Jotace',
    cargo:      'Barbeiro',
    pin:        '12345',
    perfil:     'barbeiro',
    ativo:      true,
    disponivel: true,
    foto:       null,
  },
  {
    id:         'b3',
    nome:       'Júnior',
    cargo:      'Barbeiro',
    pin:        '12345',
    perfil:     'barbeiro',
    ativo:      true,
    disponivel: true,
    foto:       null,
  },
];

// ── SERVIÇOS AVULSOS ──────────────────────────────────────────
export const SERVICOS_INICIAIS = [
  // Avulsos
  { id: 's1', categoria: 'avulso', nome: 'Corte',                    valor: 45.00, duracao: 30, ativo: true },
  { id: 's2', categoria: 'avulso', nome: 'Corte + Sobrancelha',      valor: 50.00, duracao: 40, ativo: true },
  { id: 's3', categoria: 'avulso', nome: 'Barba',                    valor: 35.00, duracao: 25, ativo: true },
  { id: 's4', categoria: 'avulso', nome: 'Pezinho',                  valor: 20.00, duracao: 15, ativo: true },
  // Combos
  { id: 's5', categoria: 'combo',  nome: 'Corte + Barba',            valor: 70.00, duracao: 55, ativo: true },
  { id: 's6', categoria: 'combo',  nome: 'Pezinho + Barba',          valor: 50.00, duracao: 40, ativo: true },
];

// ── PLANOS MENSAIS ────────────────────────────────────────────
export const PLANOS_INICIAIS = [
  {
    id:       'p1',
    nome:     'Bronze',
    valor:    139.99,
    cor:      '#CD7F32',
    descricao: '4 cortes + 4 sobrancelhas por mês',
    itens: [
      { servico: 'Corte',        quantidade: 4 },
      { servico: 'Sobrancelha',  quantidade: 4 },
    ],
    beneficios: [],
    ativo: true,
  },
  {
    id:       'p2',
    nome:     'Prata',
    valor:    219.99,
    cor:      '#C0C0C0',
    descricao: '4 cortes + 4 barbas + 4 sobrancelhas por mês',
    itens: [
      { servico: 'Corte',        quantidade: 4 },
      { servico: 'Barba',        quantidade: 4 },
      { servico: 'Sobrancelha',  quantidade: 4 },
    ],
    beneficios: [],
    ativo: true,
  },
  {
    id:       'p3',
    nome:     'Ouro',
    valor:    249.99,
    cor:      '#C9A84C',
    descricao: '4 cortes + 4 barbas + 4 sobrancelhas + estacionamento + 10% em produtos',
    itens: [
      { servico: 'Corte',        quantidade: 4 },
      { servico: 'Barba',        quantidade: 4 },
      { servico: 'Sobrancelha',  quantidade: 4 },
    ],
    beneficios: [
      'Abono no estacionamento (manual na barbearia)',
      '10% de desconto em produtos',
    ],
    ativo: true,
  },
];
