// BannerPromocao.jsx — Flyguer BarberShop
// ✅ Banner em tempo real com countdown, urgência visual e race condition protection

import React from 'react';
import { escutarPromocao, resgatarPromocao, clienteJaResgatou } from './promocaoEngine';

function useContador(expiracaoTimestamp) {
  const [segundos, setSegundos] = React.useState(null);

  React.useEffect(() => {
    if (!expiracaoTimestamp) return;
    function calcular() {
      const expira = expiracaoTimestamp.toMillis
        ? expiracaoTimestamp.toMillis()
        : new Date(expiracaoTimestamp).getTime();
      const diff = Math.max(0, Math.floor((expira - Date.now()) / 1000));
      setSegundos(diff);
      return diff;
    }
    calcular();
    const interval = setInterval(() => {
      const restante = calcular();
      if (restante <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiracaoTimestamp]);

  if (segundos === null) return null;
  if (segundos <= 0) return '00:00:00';
  const h = String(Math.floor(segundos / 3600)).padStart(2,'0');
  const m = String(Math.floor((segundos % 3600) / 60)).padStart(2,'0');
  const s = String(segundos % 60).padStart(2,'0');
  return `${h}:${m}:${s}`;
}

export default function BannerPromocao({ cliente, onResgatado }) {
  const [promo, setPromo]           = React.useState(null);
  const [ativa, setAtiva]           = React.useState(false);
  const [jaResgatou, setJaResgatou] = React.useState(false);
  const [estado, setEstado]         = React.useState('idle'); // idle | resgatando | sucesso | esgotado | erro
  const [pulsar, setPulsar]         = React.useState(false);
  const contador = useContador(promo?.expiracaoTimestamp);

  // ✅ Listener em tempo real
  React.useEffect(() => {
    const unsub = escutarPromocao(({ promo: p, ativa: a }) => {
      setPromo(p);
      setAtiva(a);
    });
    return unsub;
  }, []);

  // Verificar se já resgatou (só quando logado)
  React.useEffect(() => {
    if (!cliente?.cpf || !promo) return;
    clienteJaResgatou(cliente.cpf).then(setJaResgatou);
  }, [cliente?.cpf, promo?.titulo]);

  // Animação pulsante nas últimas 3 vagas
  React.useEffect(() => {
    if (!promo) return;
    const restantes = (promo.vagas || 0) - (promo.resgatados || 0);
    setPulsar(restantes <= 3);
  }, [promo?.resgatados, promo?.vagas]);

  // Não mostra se não há promoção ativa, ou se cliente logado já resgatou
  if (!ativa || !promo) return null;
  if (cliente?.cpf && jaResgatou) return null;

  const vagasRestantes = (promo.vagas || 0) - (promo.resgatados || 0);
  const pct = Math.max(0, Math.min(100, (vagasRestantes / promo.vagas) * 100));

  async function handleResgatar() {
    if (estado === 'resgatando') return;

    // ✅ Sem login: salva promo e redireciona para login
    if (!cliente?.cpf) {
      if (onResgatado) onResgatado(promo, 'login_required');
      return;
    }

    setEstado('resgatando');
    try {
      const resultado = await resgatarPromocao(cliente);
      if (resultado.ok) {
        setEstado('sucesso');
        setJaResgatou(true);
        const msg = encodeURIComponent(
          `🔥 PROMOÇÃO RESGATADA!\n\n` +
          `👤 ${cliente.nome}\n` +
          `📞 ${cliente.telefone || '—'}\n` +
          `🎁 ${promo.titulo}${promo.descricao ? '\n✅ ' + promo.descricao : ''}\n\n` +
          `_Resgatado pelo app Flyguer_`
        );
        setTimeout(() => {
          window.open(`https://wa.me/5511977643509?text=${msg}`, '_blank');
          if (onResgatado) onResgatado(promo);
        }, 800);
      } else if (resultado.motivo === 'encerrada' || resultado.motivo === 'concorrencia') {
        setEstado('esgotado');
      } else if (resultado.motivo === 'ja_resgatou') {
        setJaResgatou(true);
        setEstado('idle');
      } else {
        setEstado('erro');
        setTimeout(() => setEstado('idle'), 3000);
      }
    } catch(e) {
      console.error(e);
      setEstado('erro');
      setTimeout(() => setEstado('idle'), 3000);
    }
  }

  // Tela de sucesso
  if (estado === 'sucesso') {
    return (
      <div style={styles.container}>
        <div style={{ textAlign:'center', padding:'24px 20px' }}>
          <div style={{ fontSize:'56px', marginBottom:'12px' }}>🎉</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'22px', color:'#E8C96A', marginBottom:'8px' }}>Promoção garantida!</div>
          <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.8)' }}>Redirecionando para agendamento...</div>
        </div>
      </div>
    );
  }

  // Tela de esgotado
  if (estado === 'esgotado') {
    return (
      <div style={{ ...styles.container, background:'linear-gradient(135deg,#2A2A2A,#1A1A1A)' }}>
        <div style={{ textAlign:'center', padding:'24px 20px' }}>
          <div style={{ fontSize:'56px', marginBottom:'12px' }}>😔</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#9A8880', marginBottom:'8px' }}>Opa! Acabou agora</div>
          <div style={{ fontSize:'13px', color:'#555' }}>Outra pessoa foi mais rápido. Fique de olho na próxima!</div>
        </div>
      </div>
    );
  }

  // ✅ Texto do botão adaptado ao contexto
  function textoBotao() {
    if (estado === 'resgatando') return '⏳ Garantindo sua vaga...';
    if (estado === 'erro')       return '⚠️ Tente novamente';
    if (!cliente?.cpf)           return '🔥 Quero essa promoção!';
    return '🔥 Garantir minha vaga agora!';
  }

  return (
    <div style={{
      ...styles.container,
      animation: pulsar ? 'pulsar 1.5s ease-in-out infinite' : 'none',
    }}>
      <style>{`
        @keyframes pulsar {
          0%,100% { box-shadow: 0 0 0 0 rgba(244,67,54,0.4); }
          50%      { box-shadow: 0 0 0 12px rgba(244,67,54,0); }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
        <div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'4px' }}>
            ⚡ PROMOÇÃO RELÂMPAGO
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#fff', fontWeight:'900', lineHeight:'1.2' }}>
            {promo.titulo}
          </div>
        </div>
        {contador && (
          <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'10px', padding:'6px 10px', textAlign:'center', flexShrink:0 }}>
            <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.6)', marginBottom:'2px' }}>EXPIRA EM</div>
            <div style={{ fontSize:'15px', fontWeight:'900', color: contador < '01:00:00' ? '#FF5252' : '#fff', fontFamily:'monospace' }}>
              {contador}
            </div>
          </div>
        )}
      </div>

      {/* Descrição */}
      {promo.descricao && (
        <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:'10px', padding:'10px 14px', marginBottom:'12px' }}>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', marginBottom:'2px' }}>Você vai ganhar:</div>
          <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff' }}>🎁 {promo.descricao}</div>
        </div>
      )}

      {/* Barra de vagas */}
      <div style={{ marginBottom:'12px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.8)', fontWeight:'600' }}>
            {vagasRestantes === 1
              ? '⚠️ ÚLTIMA VAGA!'
              : `⚡ ${vagasRestantes} vaga${vagasRestantes !== 1 ? 's' : ''} restante${vagasRestantes !== 1 ? 's' : ''}`}
          </div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)' }}>{promo.resgatados}/{promo.vagas}</div>
        </div>
        <div style={{ height:'6px', background:'rgba(0,0,0,0.3)', borderRadius:'3px', overflow:'hidden' }}>
          <div style={{
            height:'100%',
            width:`${100 - pct}%`,
            background: pct > 50 ? '#4CAF50' : pct > 20 ? '#FFC107' : '#F44336',
            borderRadius:'3px',
            transition:'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* ✅ Aviso de login necessário para não-logados */}
      {!cliente?.cpf && (
        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', textAlign:'center', marginBottom:'10px' }}>
          Faça login ou cadastre-se para garantir sua vaga
        </div>
      )}

      {/* Botão */}
      <button
        onClick={handleResgatar}
        disabled={estado === 'resgatando'}
        style={{
          width:'100%', padding:'16px', borderRadius:'14px', border:'none',
          background: estado === 'resgatando'
            ? 'rgba(0,0,0,0.3)'
            : vagasRestantes === 1
              ? 'linear-gradient(135deg,#FF1744,#FF5252)'
              : 'linear-gradient(135deg,#fff,rgba(255,255,255,0.9))',
          color: estado === 'resgatando' ? '#888' : '#8B0000',
          fontSize:'16px', fontWeight:'900',
          cursor: estado === 'resgatando' ? 'wait' : 'pointer',
          transition:'all 0.2s',
        }}
      >
        {textoBotao()}
      </button>
    </div>
  );
}

const styles = {
  container: {
    background: 'linear-gradient(135deg,#8B0000,#C62828,#F44336)',
    borderRadius: '20px',
    padding: '20px',
    margin: '16px',
    position: 'relative',
    overflow: 'hidden',
    animation: 'slideIn 0.4s ease',
    boxShadow: '0 8px 32px rgba(244,67,54,0.4)',
  },
};
