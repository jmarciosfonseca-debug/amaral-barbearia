// getStyles.js
// ─────────────────────────────────────────────────────────────
// Sistema de tema claro/escuro — herdado do MokLog CheckTest
// Paleta: preto + dourado (identidade Amaral Barbearia)
// ─────────────────────────────────────────────────────────────

export const COLORS = {
  gold:      '#C9A84C',
  goldLight: '#E8C96A',
  goldDark:  '#A07830',
  black:     '#0A0A0A',
  dark:      '#141414',
  dark2:     '#1E1E1E',
  dark3:     '#2A2A2A',
  white:     '#F5F5F0',
  gray:      '#888888',
  green:     '#4CAF50',
  yellow:    '#FFC107',
  red:       '#F44336',
  blue:      '#2196F3',
};

export function getStyles(dark = true) {
  const bg       = dark ? COLORS.dark      : '#F0EDE8';
  const bg2      = dark ? COLORS.dark2     : '#FFFFFF';
  const bg3      = dark ? COLORS.dark3     : '#E8E4DE';
  const text      = dark ? COLORS.white    : '#1A1A1A';
  const textSub   = dark ? COLORS.gray     : '#666666';
  const border    = dark ? '#2A2A2A'       : '#D4C9B8';
  const cardBg    = dark ? COLORS.dark2    : '#FFFFFF';
  const inputBg   = dark ? COLORS.dark3    : '#F5F0E8';

  return {
    // Layout
    app: {
      minHeight: '100vh',
      background: bg,
      color: text,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    },

    // Header dourado
    header: {
      background: dark
        ? `linear-gradient(135deg, ${COLORS.black} 0%, ${COLORS.dark} 100%)`
        : `linear-gradient(135deg, ${COLORS.goldDark} 0%, ${COLORS.gold} 100%)`,
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${border}`,
    },

    headerGold: {
      background: `linear-gradient(135deg, ${COLORS.goldDark} 0%, ${COLORS.gold} 100%)`,
      padding: '16px 20px 12px',
    },

    headerTitle: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: '18px',
      fontWeight: '700',
      color: dark ? COLORS.gold : COLORS.black,
    },

    headerSubtitle: {
      fontSize: '11px',
      color: dark ? COLORS.gray : 'rgba(0,0,0,0.6)',
    },

    // Cards
    card: {
      background: cardBg,
      borderRadius: '16px',
      padding: '16px',
      border: `1px solid ${border}`,
      marginBottom: '12px',
    },

    cardGold: {
      background: cardBg,
      borderRadius: '16px',
      padding: '16px',
      border: `1.5px solid ${COLORS.gold}`,
      marginBottom: '12px',
    },

    // Botões
    btnGold: {
      display: 'block',
      width: '100%',
      padding: '15px 20px',
      borderRadius: '14px',
      border: 'none',
      background: `linear-gradient(135deg, ${COLORS.goldDark}, ${COLORS.gold})`,
      color: COLORS.black,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      textAlign: 'center',
    },

    btnDark: {
      display: 'block',
      width: '100%',
      padding: '15px 20px',
      borderRadius: '14px',
      border: `1px solid ${border}`,
      background: bg3,
      color: text,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      textAlign: 'center',
    },

    btnOutline: {
      display: 'block',
      width: '100%',
      padding: '14px 20px',
      borderRadius: '14px',
      border: `1.5px solid ${COLORS.gold}`,
      background: 'transparent',
      color: COLORS.gold,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      textAlign: 'center',
    },

    btnSm: {
      padding: '8px 16px',
      borderRadius: '10px',
      border: 'none',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif",
    },

    // Inputs
    input: {
      width: '100%',
      background: inputBg,
      border: `1px solid ${border}`,
      borderRadius: '10px',
      padding: '12px 14px',
      color: text,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
    },

    label: {
      fontSize: '12px',
      color: textSub,
      marginBottom: '6px',
      display: 'block',
    },

    // Badges / Status
    badgeGreen:  { display:'inline-flex', alignItems:'center', gap:'4px', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:'rgba(76,175,80,0.15)',  color: COLORS.green  },
    badgeYellow: { display:'inline-flex', alignItems:'center', gap:'4px', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:'rgba(255,193,7,0.15)',  color: COLORS.yellow },
    badgeRed:    { display:'inline-flex', alignItems:'center', gap:'4px', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:'rgba(244,67,54,0.15)',  color: COLORS.red    },
    badgeGold:   { display:'inline-flex', alignItems:'center', gap:'4px', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:'rgba(201,168,76,0.15)', color: COLORS.gold   },
    badgeGray:   { display:'inline-flex', alignItems:'center', gap:'4px', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background: bg3, color: textSub     },

    // Avatar
    avatar: {
      width: '44px', height: '44px',
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${COLORS.goldDark}, ${COLORS.gold})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '700', fontSize: '16px',
      color: COLORS.black,
      flexShrink: 0,
      overflow: 'hidden',
    },

    // Bottom Nav
    bottomNav: {
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: dark ? COLORS.black : '#FFFFFF',
      borderTop: `1px solid ${border}`,
      padding: '10px 0 20px',
      display: 'flex',
      justifyContent: 'space-around',
      zIndex: 100,
    },

    navItem: {
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: '3px',
      fontSize: '10px', color: textSub,
      cursor: 'pointer',
    },

    // Cores brutas para uso inline
    bg, bg2, bg3, text, textSub, border, cardBg, inputBg,
  };
}

// ─────────────────────────────────────────────────────────────
// CONSTANTES GLOBAIS DO APP
// ─────────────────────────────────────────────────────────────

export const APP_CONFIG = {
  nome:      'Amaral Barbearia',
  whatsapp:  '5511977643509',
  endereco:  'Shopping Cidade das Artes — Piso 2, Nº 22',
  cidade:    'São Paulo - SP',
  versao:    '1.0.0',
};

// Status de agendamento
export const STATUS = {
  PENDENTE_WHATSAPP: 'pendente_whatsapp', // criado, aguardando envio WA
  CONFIRMADO:        'confirmado',         // WA enviado ✅
  CANCELADO_CLIENTE: 'cancelado_cliente',
  CANCELADO_BARBEIRO:'cancelado_barbeiro',
  REAGENDADO:        'reagendado',
  CONCLUIDO:         'concluido',          // barbeiro marcou como feito
};

// Perfis de acesso
export const PERFIL = {
  CLIENTE:       'cliente',
  BARBEIRO:      'barbeiro',
  GERENTE:       'gerente',
  RECEPCIONISTA: 'recepcionista',
};

// Dias da semana
export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Preferências de serviço
export const PREFERENCIAS = [
  { id: 'cabelo',       label: '✂️ Cabelo'          },
  { id: 'barba',        label: '🪒 Barba'            },
  { id: 'cabelo_barba', label: '✂️🪒 Cabelo + Barba' },
];
