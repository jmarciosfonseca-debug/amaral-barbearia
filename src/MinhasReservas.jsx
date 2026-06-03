// MinhasReservas.jsx — Flyguer BarberShop
// ✅ v3: Pré-agendamento simplificado, cancelamento corrigido, calendário com cores

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, orderBy,
  onSnapshot, doc, updateDoc, serverTimestamp, addDoc,
} from 'firebase/firestore';
import { getStyles } from './getStyles';
import AvaliacaoServico from './AvaliacaoServico';

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatarData(dataStr) {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}
function diaSemana(dataStr) {
  const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  return DIAS[new Date(dataStr + 'T12:00:00').getDay()];
}
function isPassado(dataStr, hora) {
  return new Date(`${dataStr}T${hora}:00`) < new Date();
}
function normalizarTel(tel) {
  return (tel||'').replace(/\D/g,'').slice(-11);
}

function BadgeStatus({ status, pagamento }) {
  const configs = {
    confirmado:         { label: '✅ Confirmado',   bg: 'rgba(76,175,80,0.15)',  color: '#4CAF50' },
    pre_agendamento:    { label: '📌 Pré-agendado', bg: 'rgba(255,193,7,0.12)',  color: '#FFC107' },
    pendente:           { label: '⏳ Pendente',      bg: 'rgba(255,193,7,0.15)',  color: '#FFC107' },
    cancelado_cliente:  { label: '✗ Cancelado',     bg: 'rgba(244,67,54,0.15)', color: '#F44336' },
    cancelado_barbeiro: { label: '✗ Cancelado',     bg: 'rgba(244,67,54,0.15)', color: '#F44336' },
    concluido:          { label: '✓ Concluído',     bg: 'rgba(46,125,122,0.15)',color: '#2E7D7A' },
  };
  const cfg = configs[status] || { label: status, bg: '#2E1A14', color: '#9A8880' };
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:cfg.bg, color:cfg.color }}>
      {cfg.label}{pagamento==='pix'||pagamento==='pix_sinal'?' · 💳':''}
    </div>
  );
}

// ─── MODAL CANCELAR ───────────────────────────────────────────
function ModalCancelar({ agendamento, onConfirmar, onFechar }) {
  const [cancelando, setCancelando] = React.useState(false);
  const [cancelado, setCancelado]   = React.useState(false);
  const ehPre = agendamento.status === 'pre_agendamento';

  async function handleCancelar() {
    setCancelando(true);
    try {
      await updateDoc(doc(db, 'agendamentos', agendamento.firestoreId), {
        status: 'cancelado_cliente',
        ocultadoPorCliente: true,
        canceladoEm: serverTimestamp(),
      });
      setCancelado(true);
      if (!ehPre) {
        // Abre WhatsApp do CLIENTE para notificar barbearia
        const msg = encodeURIComponent(
          `❌ CANCELAMENTO\n\n` +
          `👤 ${agendamento.clienteNome}\n` +
          `✂️ ${agendamento.barbeiroNome}\n` +
          `💈 ${agendamento.servico}\n` +
          `📅 ${formatarData(agendamento.data)} às ${agendamento.hora}\n\n` +
          `_Cancelado pelo app Flyguer_`
        );
        setTimeout(() => {
          window.open(`https://wa.me/5511977643509?text=${msg}`, '_blank');
          onConfirmar();
        }, 800);
      } else {
        setTimeout(() => onConfirmar(), 800);
      }
    } catch(e) { console.error(e); setCancelando(false); }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none' }}>
        {cancelado ? (
          <div style={{ textAlign:'center', padding:'20px' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#F5EFE6' }}>
              {ehPre ? 'Pré-agendamento removido' : 'Cancelado com sucesso'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ textAlign:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>{ehPre ? '📌' : '⚠️'}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#F5EFE6', marginBottom:'8px' }}>
                {ehPre ? 'Remover pré-agendamento?' : 'Cancelar agendamento?'}
              </div>
              <div style={{ fontSize:'13px', color:'#9A8880' }}>{agendamento.barbeiroNome} · {agendamento.servico}</div>
              <div style={{ fontSize:'13px', color:'#9A8880' }}>{formatarData(agendamento.data)} às {agendamento.hora}</div>
            </div>
            {!ehPre && (
              <div style={{ background:'rgba(46,125,122,0.08)', border:'1px solid rgba(46,125,122,0.2)', borderRadius:'10px', padding:'10px 12px', marginBottom:'16px', fontSize:'11px', color:'#2E7D7A' }}>
                📱 Seu WhatsApp abrirá para notificar a barbearia.
              </div>
            )}
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={onFechar} style={{ flex:1, padding:'14px', borderRadius:'14px', border:'1px solid #3A2018', background:'#2E1A14', color:'#9A8880', fontSize:'14px', cursor:'pointer' }}>
                Manter
              </button>
              <button onClick={handleCancelar} disabled={cancelando}
                style={{ flex:1, padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#8B0000,#F44336)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:cancelando?'wait':'pointer' }}>
                {cancelando ? '...' : ehPre ? 'Remover' : 'Sim, cancelar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MODAL CONFIRMAR PRÉ ──────────────────────────────────────
function ModalConfirmarPre({ agendamento, onConfirmar, onFechar }) {
  const [confirmando, setConfirmando] = React.useState(false);
  const [confirmado, setConfirmado]   = React.useState(false);

  async function handleConfirmar() {
    setConfirmando(true);
    try {
      await updateDoc(doc(db, 'agendamentos', agendamento.firestoreId), {
        status: 'confirmado',
        confirmadoEm: serverTimestamp(),
      });
      setConfirmado(true);
    } catch(e) { console.error(e); setConfirmando(false); }
  }

  function abrirCalendario() {
    const [hh, mm] = agendamento.hora.split(':');
    const dataInicio = `${agendamento.data.replace(/-/g,'')}T${hh}${mm}00`;
    const durMin = agendamento.duracao || 30;
    const fim = new Date(`${agendamento.data}T${agendamento.hora}:00`);
    fim.setMinutes(fim.getMinutes() + durMin);
    const dataFim = `${fim.getFullYear()}${String(fim.getMonth()+1).padStart(2,'0')}${String(fim.getDate()).padStart(2,'0')}T${String(fim.getHours()).padStart(2,'0')}${String(fim.getMinutes()).padStart(2,'0')}00`;
    const texto = encodeURIComponent(`Flyguer BarberShop — ${agendamento.servico} com ${agendamento.barbeiroNome}`);
    const local  = encodeURIComponent('Shopping Cidade das Artes — Piso 2, Nº 22, São Paulo');
    window.open(`https://calendar.google.com/calendar/r/eventedit?text=${texto}&dates=${dataInicio}/${dataFim}&location=${local}`, '_blank');
  }

  function abrirWhatsApp() {
    const msg = encodeURIComponent(
      `✅ CONFIRMAÇÃO DE AGENDAMENTO\n\n` +
      `👤 ${agendamento.clienteNome}\n` +
      `✂️ ${agendamento.barbeiroNome}\n` +
      `💈 ${agendamento.servico}\n` +
      `📅 ${formatarData(agendamento.data)} às ${agendamento.hora}\n\n` +
      `_Confirmado pelo app Flyguer_`
    );
    window.open(`https://wa.me/5511977643509?text=${msg}`, '_blank');
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none' }}>
        {confirmado ? (
          <div style={{ textAlign:'center', padding:'20px' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>🎉</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A', marginBottom:'16px' }}>Agendamento confirmado!</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <button onClick={abrirWhatsApp}
                style={{ padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                📲 Notificar barbearia via WhatsApp
              </button>
              <button onClick={abrirCalendario}
                style={{ padding:'12px', borderRadius:'12px', border:'1px solid rgba(66,133,244,0.4)', background:'rgba(66,133,244,0.08)', color:'#4285F4', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                📅 Adicionar ao Google Calendar
              </button>
              <button onClick={onConfirmar}
                style={{ padding:'12px', borderRadius:'12px', border:'1px solid #3A2018', background:'transparent', color:'#9A8880', fontSize:'13px', cursor:'pointer' }}>
                OK, fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ textAlign:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>📌</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A', marginBottom:'8px' }}>Confirmar pré-agendamento?</div>
              <div style={{ fontSize:'13px', color:'#9A8880' }}>{agendamento.barbeiroNome} · {agendamento.servico}</div>
              <div style={{ fontSize:'13px', color:'#9A8880' }}>{formatarData(agendamento.data)} às {agendamento.hora}</div>
            </div>
            <div style={{ background:'rgba(255,193,7,0.1)', border:'1px solid rgba(255,193,7,0.3)', borderRadius:'10px', padding:'10px 12px', marginBottom:'16px', fontSize:'12px', color:'#FFC107' }}>
              ⚠️ Após confirmar, o horário é garantido e a barbearia será notificada.
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={onFechar} style={{ flex:1, padding:'14px', borderRadius:'14px', border:'1px solid #3A2018', background:'#2E1A14', color:'#9A8880', fontSize:'14px', cursor:'pointer' }}>
                Depois
              </button>
              <button onClick={handleConfirmar} disabled={confirmando}
                style={{ flex:2, padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#A07830,#E8C96A)', color:'#1A0F0D', fontSize:'15px', fontWeight:'800', cursor:confirmando?'wait':'pointer' }}>
                {confirmando ? '...' : '✅ Confirmar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── CALENDÁRIO DE RESERVAS ───────────────────────────────────
function CalendarioReservas({ agendamentos, diaSel, onDiaSel }) {
  const agoraDt  = new Date();
  const anoHoje  = agoraDt.getFullYear();
  const mesHoje  = agoraDt.getMonth();
  const diaHoje  = agoraDt.getDate();
  const hojeStr  = `${anoHoje}-${String(mesHoje+1).padStart(2,'0')}-${String(diaHoje).padStart(2,'0')}`;

  const [mes, setMes] = React.useState(mesHoje);
  const [ano, setAno] = React.useState(anoHoje);

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes   = new Date(ano, mes+1, 0).getDate();

  function navMes(dir) {
    let nm = mes + dir, na = ano;
    if (nm < 0)  { nm = 11; na--; }
    if (nm > 11) { nm = 0;  na++; }
    setMes(nm); setAno(na);
  }

  function mkData(a, m, d) {
    return `${a}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  // Mapa: data -> status prioritário
  const mapaStatus = {};
  agendamentos.forEach(ag => {
    if (!ag.data) return;
    const prev = mapaStatus[ag.data];
    const prioridade = { confirmado:4, concluido:3, pre_agendamento:2, pendente:1 };
    if (!prev || (prioridade[ag.status]||0) > (prioridade[prev]||0)) {
      mapaStatus[ag.data] = ag.status;
    }
  });

  const cells = [];
  for (let i=0; i<primeiroDia; i++) cells.push(null);
  for (let d=1; d<=diasNoMes; d++) cells.push(d);

  return (
    <div style={{ background:'#1A0F0D', borderRadius:'16px', padding:'14px', marginBottom:'12px', border:'1px solid #3A2018' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <button onClick={() => navMes(-1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'4px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'18px' }}>{'<'}</button>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'15px', color:'#E8C96A', fontWeight:'700' }}>{MESES[mes]} {ano}</div>
        <button onClick={() => navMes(1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'4px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'18px' }}>{'>'}</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', marginBottom:'6px' }}>
        {['D','S','T','Q','Q','S','S'].map((l,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:'10px', color:'#9A8880', fontWeight:'600', padding:'3px 0' }}>{l}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
        {cells.map((dia, idx) => {
          if (!dia) return <div key={idx} />;
          const dataStr = mkData(ano, mes, dia);
          const status  = mapaStatus[dataStr];
          const ehHoje  = dataStr === hojeStr;
          const ehSel   = dataStr === diaSel;
          const ehConf  = status === 'confirmado' || status === 'concluido';
          const ehPre   = status === 'pre_agendamento';
          const ehCanc  = status?.includes('cancelado');
          const temAg   = !!status;
          return (
            <div key={idx} onClick={() => temAg && onDiaSel(dataStr)}
              style={{ borderRadius:'8px', padding:'6px 2px', textAlign:'center', cursor:temAg?'pointer':'default',
                background: ehSel?'#3A2018':ehConf?'rgba(76,175,80,0.15)':ehPre?'rgba(255,193,7,0.12)':ehHoje?'rgba(232,201,106,0.1)':'transparent',
                border: ehSel?'1.5px solid #E8C96A':ehConf?'1px solid rgba(76,175,80,0.4)':ehPre?'1px solid rgba(255,193,7,0.4)':ehHoje?'1px solid rgba(232,201,106,0.3)':'1px solid transparent',
              }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:ehConf?'#4CAF50':ehPre?'#FFC107':ehHoje?'#E8C96A':'#9A8880' }}>{dia}</div>
              {temAg && <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:ehConf?'#4CAF50':ehPre?'#FFC107':ehCanc?'#F44336':'#9A8880', margin:'2px auto 0' }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:'12px', marginTop:'10px', paddingTop:'8px', borderTop:'1px solid #2E1A14' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'#9A8880' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#4CAF50' }} /> Confirmado
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'#9A8880' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#FFC107' }} /> Pré-agendado
        </div>
      </div>
    </div>
  );
}

// ─── CARD AGENDAMENTO ─────────────────────────────────────────
function CardAgendamento({ ag, onCancelar, onReagendar, onAvaliar, onExcluir, onRepetir, onConfirmarPre }) {
  const passado      = isPassado(ag.data, ag.hora);
  const ehPre        = ag.status === 'pre_agendamento';
  const ehHistorico  = (passado || ag.status?.includes('cancelado')) && !ehPre;
  const podeCancelar = !passado && !ehPre && !['cancelado_cliente','cancelado_barbeiro','concluido'].includes(ag.status);
  const podeAvaliar  = ag.status === 'concluido' && !ag.avaliado;
  const podeRepetir  = ehHistorico && ag.barbeiroId && ag.servico;

  const corBarra = ehPre?'#FFC107':ag.status==='confirmado'?'#4CAF50':ag.status==='concluido'?'#2E7D7A':ag.status?.includes('cancelado')?'#F44336':'#9A8880';

  return (
    <div style={{ background:'#231410', borderRadius:'16px', border:ehPre?'1.5px solid rgba(255,193,7,0.4)':passado?'1px solid #2A1208':'1px solid #3A2018', marginBottom:'12px', overflow:'hidden', opacity:passado&&!ehPre?0.85:1 }}>
      <div style={{ height:'3px', background:corBarra }} />
      <div style={{ padding:'14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
          <div>
            <div style={{ fontWeight:'700', fontSize:'15px', color:'#F5EFE6' }}>{ag.servico}</div>
            <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>✂️ {ag.barbeiroNome}</div>
          </div>
          <BadgeStatus status={ag.status} pagamento={ag.pagamento} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px', background:'#1A0F0D', borderRadius:'10px', padding:'10px' }}>
          {[
            { label:'Data',    value:`${diaSemana(ag.data)}, ${formatarData(ag.data)}` },
            { label:'Horário', value:ag.hora },
            { label:'Valor',   value:`R$ ${(ag.valor||0).toFixed(2).replace('.',',')}`, gold:true },
            { label:'Pag.',    value:ag.pagamento==='pix'||ag.pagamento==='pix_sinal'?'💳 Pix':'💵 Local' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'2px' }}>{item.label}</div>
              <div style={{ fontSize:'13px', color:item.gold?'#E8C96A':'#F5EFE6', fontWeight:'600' }}>{item.value}</div>
            </div>
          ))}
        </div>
        {/* Pré-agendamento */}
        {ehPre && (
          <div style={{ marginBottom:'8px' }}>
            <button onClick={() => onConfirmarPre(ag)}
              style={{ width:'100%', padding:'11px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#A07830,#E8C96A)', color:'#1A0F0D', fontSize:'13px', fontWeight:'800', cursor:'pointer', marginBottom:'6px' }}>
              ✅ Confirmar pré-agendamento
            </button>
            <button onClick={() => onCancelar(ag)}
              style={{ width:'100%', padding:'8px', borderRadius:'10px', border:'1px solid rgba(244,67,54,0.3)', background:'transparent', color:'#F44336', fontSize:'12px', cursor:'pointer' }}>
              ✗ Remover pré-agendamento
            </button>
          </div>
        )}
        {/* Avaliar */}
        {podeAvaliar && (
          <button onClick={() => onAvaliar(ag)} style={{ width:'100%', padding:'10px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#A07830,#C9A84C)', color:'#1A0F0D', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginBottom:'8px' }}>
            ⭐ Avaliar atendimento
          </button>
        )}
        {ag.avaliado && <div style={{ fontSize:'11px', color:'#E8C96A', textAlign:'center', marginBottom:'8px' }}>⭐ Avaliação enviada!</div>}
        {/* Repetir */}
        {podeRepetir && (
          <button onClick={() => onRepetir(ag)} style={{ width:'100%', padding:'10px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#1A3A2A,#2E7D7A)', color:'#4CAF50', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginBottom:'8px' }}>
            🔄 Repetir este agendamento
          </button>
        )}
        {/* Cancelar / Reagendar */}
        {podeCancelar && (
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => onReagendar(ag)} style={{ flex:1, padding:'10px', borderRadius:'10px', border:'1px solid #3A2018', background:'#2E1A14', color:'#E8C96A', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>🔄 Reagendar</button>
            <button onClick={() => onCancelar(ag)} style={{ flex:1, padding:'10px', borderRadius:'10px', border:'none', background:'rgba(244,67,54,0.15)', color:'#F44336', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>✗ Cancelar</button>
          </div>
        )}
        {ehHistorico && (
          <button onClick={() => onExcluir(ag)} style={{ width:'100%', marginTop:'8px', padding:'8px', borderRadius:'10px', border:'1px solid #2A1208', background:'transparent', color:'#555', fontSize:'11px', cursor:'pointer' }}>
            🗑 Ocultar do histórico
          </button>
        )}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function MinhasReservas({ cliente, onBack, onReagendar, dark }) {
  const s = getStyles(dark);
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [carregando, setCarregando]     = React.useState(true);
  const [cancelando, setCancelando]     = React.useState(null);
  const [avaliando, setAvaliando]       = React.useState(null);
  const [repetindo, setRepetindo]       = React.useState(null);
  const [confirmandoPre, setConfirmandoPre] = React.useState(null);
  const [aba, setAba]                   = React.useState('calendario');
  const [diaSel, setDiaSel]             = React.useState(null);

  React.useEffect(() => {
    if (!cliente?.cpf) return;
    const telNorm = normalizarTel(cliente.telefone);
    const q1 = query(collection(db,'agendamentos'), where('clienteCpf','==',cliente.cpf), orderBy('data','desc'), orderBy('hora','desc'));
    const q2 = telNorm ? query(collection(db,'agendamentos'), where('clienteTel','==',telNorm), orderBy('data','desc'), orderBy('hora','desc')) : null;
    const ids = new Set();
    let lista1 = [], lista2 = [];
    function merge() {
      ids.clear();
      const todos = [...lista1,...lista2].filter(ag => {
        if (ids.has(ag.firestoreId)) return false;
        ids.add(ag.firestoreId);
        return !ag.ocultadoPorCliente;
      });
      todos.sort((a,b) => a.data?.localeCompare(b.data) || a.hora?.localeCompare(b.hora));
      setAgendamentos(todos);
    }
    const unsub1 = onSnapshot(q1, snap => {
      lista1 = snap.docs.map(d=>({firestoreId:d.id,...d.data()}));
      merge(); setCarregando(false);
    }, () => setCarregando(false));
    let unsub2 = ()=>{};
    if (q2) unsub2 = onSnapshot(q2, snap => {
      lista2 = snap.docs.map(d=>({firestoreId:d.id,...d.data()})).filter(ag=>!ag.clienteCpf||ag.clienteCpf==='manual');
      merge();
    }, ()=>{});
    return () => { unsub1(); unsub2(); };
  }, [cliente?.cpf, cliente?.telefone]);

  async function handleExcluir(ag) {
    try { await updateDoc(doc(db,'agendamentos',ag.firestoreId), { ocultadoPorCliente: true }); }
    catch(e) { console.error(e); }
  }

  const proximos      = agendamentos.filter(ag => !isPassado(ag.data, ag.hora) && !ag.status?.includes('cancelado'));
  const historico     = agendamentos.filter(ag => isPassado(ag.data, ag.hora) || ag.status?.includes('cancelado'));
  const preAgendamentos = agendamentos.filter(ag => ag.status==='pre_agendamento' && !isPassado(ag.data, ag.hora));
  const agendamentosDoDia = diaSel ? agendamentos.filter(ag => ag.data===diaSel) : [];

  if (avaliando) return <AvaliacaoServico agendamento={avaliando} cliente={cliente} dark={dark} onConcluir={()=>setAvaliando(null)} onPular={()=>setAvaliando(null)} />;

  return (
    <div style={{ ...s.app, paddingBottom:'40px' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>📋 Minhas Reservas</div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>{cliente.nome.split(' ')[0]}</div>
        </div>
      </div>

      {/* Banner pré-agendamentos pendentes */}
      {preAgendamentos.length > 0 && (
        <div style={{ margin:'12px 16px 0', background:'rgba(255,193,7,0.1)', border:'1.5px solid rgba(255,193,7,0.4)', borderRadius:'14px', padding:'14px' }}>
          <div style={{ fontSize:'11px', color:'#FFC107', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>
            📌 {preAgendamentos.length} pré-agendamento{preAgendamentos.length>1?'s':''} aguardando confirmação
          </div>
          {preAgendamentos.map(ag => (
            <div key={ag.firestoreId} style={{ background:'#1A0F0D', borderRadius:'10px', padding:'10px 12px', marginBottom:'6px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px' }}>
              <div>
                <div style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>{ag.servico} · {ag.barbeiroNome}</div>
                <div style={{ fontSize:'11px', color:'#9A8880' }}>📅 {formatarData(ag.data)} às {ag.hora}</div>
              </div>
              <button onClick={() => setConfirmandoPre(ag)}
                style={{ padding:'7px 12px', borderRadius:'8px', border:'none', background:'linear-gradient(135deg,#A07830,#E8C96A)', color:'#1A0F0D', fontSize:'11px', fontWeight:'800', cursor:'pointer', flexShrink:0 }}>
                ✅ Confirmar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Abas */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018', marginTop:'12px' }}>
        {[
          { id:'calendario', label:'📅 Calendário' },
          { id:'proximos',   label:`Próximos (${proximos.length})` },
          { id:'historico',  label:`Histórico (${historico.length})` },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ flex:1, padding:'12px 4px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #8B3A2A':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        {/* Aba calendário */}
        {aba === 'calendario' && (
          <>
            <CalendarioReservas agendamentos={agendamentos} diaSel={diaSel} onDiaSel={d => setDiaSel(diaSel===d?null:d)} />
            {diaSel && agendamentosDoDia.length > 0 && (
              <div style={{ background:'#231410', border:'1px solid #3A2018', borderRadius:'12px', padding:'12px', marginBottom:'12px' }}>
                <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', marginBottom:'8px' }}>{formatarData(diaSel)}</div>
                {agendamentosDoDia.map(ag => (
                  <div key={ag.firestoreId} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:'1px solid #2E1A14' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', flexShrink:0,
                      background:ag.status==='confirmado'?'#4CAF50':ag.status==='pre_agendamento'?'#FFC107':ag.status==='concluido'?'#2E7D7A':'#F44336' }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>{ag.hora} — {ag.servico}</div>
                      <div style={{ fontSize:'11px', color:'#9A8880' }}>✂️ {ag.barbeiroNome}</div>
                    </div>
                    <BadgeStatus status={ag.status} />
                  </div>
                ))}
              </div>
            )}
            {diaSel && agendamentosDoDia.length === 0 && (
              <div style={{ textAlign:'center', color:'#9A8880', fontSize:'13px', padding:'12px' }}>Nenhum agendamento neste dia</div>
            )}
          </>
        )}

        {/* Aba próximos */}
        {aba === 'proximos' && (
          carregando ? <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳ Carregando...</div> :
          proximos.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>📅</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A', marginBottom:'8px' }}>Nenhuma reserva ativa</div>
              <button onClick={onReagendar} style={{ padding:'12px 24px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                📅 Fazer Agendamento
              </button>
            </div>
          ) : proximos.map(ag => (
            <CardAgendamento key={ag.firestoreId} ag={ag}
              onCancelar={setCancelando}
              onReagendar={onReagendar}
              onAvaliar={setAvaliando}
              onExcluir={handleExcluir}
              onRepetir={setRepetindo}
              onConfirmarPre={setConfirmandoPre}
            />
          ))
        )}

        {/* Aba histórico */}
        {aba === 'historico' && (
          carregando ? <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳ Carregando...</div> :
          historico.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>📋</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>Nenhum histórico</div>
            </div>
          ) : historico.map(ag => (
            <CardAgendamento key={ag.firestoreId} ag={ag}
              onCancelar={setCancelando}
              onReagendar={onReagendar}
              onAvaliar={setAvaliando}
              onExcluir={handleExcluir}
              onRepetir={setRepetindo}
              onConfirmarPre={setConfirmandoPre}
            />
          ))
        )}
      </div>

      {cancelando    && <ModalCancelar agendamento={cancelando} onConfirmar={()=>setCancelando(null)} onFechar={()=>setCancelando(null)} />}
      {confirmandoPre && <ModalConfirmarPre agendamento={confirmandoPre} onConfirmar={()=>setConfirmandoPre(null)} onFechar={()=>setConfirmandoPre(null)} />}

      {repetindo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ color:'#F5EFE6', textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>🔄</div>
            <div>Use o botão Agendar para criar um novo agendamento similar.</div>
            <button onClick={()=>setRepetindo(null)} style={{ marginTop:'16px', padding:'10px 24px', borderRadius:'12px', border:'1px solid #3A2018', background:'#2E1A14', color:'#9A8880', cursor:'pointer' }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
