// MinhasReservas.jsx — Flyguer BarberShop
// ✅ v4: Sem pré-agendamento — todo agendamento vai direto como confirmado
//        Cores: VERDE = confirmado, AMARELO = pendente, sem status pré
//        Calendário com cores corretas

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, orderBy,
  onSnapshot, doc, updateDoc, serverTimestamp,
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

// ✅ Badge de status — sem pré_agendamento
function BadgeStatus({ status, pagamento }) {
  const configs = {
    confirmado:         { label:'✅ Confirmado',  bg:'rgba(76,175,80,0.15)',   color:'#4CAF50' },
    pendente:           { label:'⏳ Pendente',     bg:'rgba(255,193,7,0.15)',   color:'#FFC107' },
    cancelado_cliente:  { label:'✗ Cancelado',    bg:'rgba(244,67,54,0.15)',   color:'#F44336' },
    cancelado_barbeiro: { label:'✗ Cancelado',    bg:'rgba(244,67,54,0.15)',   color:'#F44336' },
    concluido:          { label:'✓ Concluído',    bg:'rgba(46,125,122,0.15)',  color:'#2E7D7A' },
  };
  const cfg = configs[status] || { label: status, bg:'#2E1A14', color:'#9A8880' };
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

  async function handleCancelar() {
    setCancelando(true);
    try {
      await updateDoc(doc(db, 'agendamentos', agendamento.firestoreId), {
        status: 'cancelado_cliente',
        ocultadoPorCliente: true,
        canceladoEm: serverTimestamp(),
      });
      setCancelado(true);
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
    } catch(e) { console.error(e); setCancelando(false); }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none' }}>
        {cancelado ? (
          <div style={{ textAlign:'center', padding:'20px' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#F5EFE6' }}>Cancelado com sucesso</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>⚠️</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#F5EFE6', marginBottom:'8px' }}>Cancelar agendamento?</div>
              <div style={{ fontSize:'13px', color:'#9A8880' }}>{agendamento.barbeiroNome} · {agendamento.servico}</div>
              <div style={{ fontSize:'13px', color:'#9A8880' }}>{formatarData(agendamento.data)} às {agendamento.hora}</div>
            </div>
            <div style={{ background:'rgba(46,125,122,0.08)', border:'1px solid rgba(46,125,122,0.2)', borderRadius:'10px', padding:'10px 12px', marginBottom:'16px', fontSize:'11px', color:'#2E7D7A' }}>
              📱 Seu WhatsApp abrirá para notificar a barbearia.
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={onFechar} style={{ flex:1, padding:'14px', borderRadius:'14px', border:'1px solid #3A2018', background:'#2E1A14', color:'#9A8880', fontSize:'14px', cursor:'pointer' }}>
                Manter
              </button>
              <button onClick={handleCancelar} disabled={cancelando}
                style={{ flex:1, padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#8B0000,#F44336)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:cancelando?'wait':'pointer' }}>
                {cancelando ? '...' : 'Sim, cancelar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── CALENDÁRIO DE RESERVAS ───────────────────────────────────
// ✅ VERDE = confirmado | AMARELO = pendente | sem amarelo de pré-agendamento
function CalendarioReservas({ agendamentos, diaSel, onDiaSel }) {
  const agoraDt = new Date();
  const anoHoje = agoraDt.getFullYear();
  const mesHoje = agoraDt.getMonth();
  const hojeStr = `${anoHoje}-${String(mesHoje+1).padStart(2,'0')}-${String(agoraDt.getDate()).padStart(2,'0')}`;

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

  // ✅ Mapa de status por dia — prioridade: confirmado > pendente > cancelado
  const mapaStatus = React.useMemo(() => {
    const mapa = {};
    const prioridade = { confirmado:4, concluido:3, pendente:2, cancelado_cliente:1, cancelado_barbeiro:1 };
    agendamentos.forEach(ag => {
      if (!ag.data) return;
      const prev = mapa[ag.data];
      const pAtual = prioridade[ag.status] || 0;
      const pPrev  = prioridade[prev] || 0;
      if (!prev || pAtual > pPrev) mapa[ag.data] = ag.status;
    });
    return mapa;
  }, [agendamentos]);

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
          const ehPend  = status === 'pendente';
          const ehCanc  = status?.includes('cancelado');
          const temAg   = !!status;

          let bg = 'transparent', border = '1px solid transparent', corNum = '#9A8880';
          if (ehSel)       { bg='#3A2018'; border='1.5px solid #E8C96A'; corNum='#F5EFE6'; }
          else if (ehConf) { bg='rgba(76,175,80,0.15)';  border='1px solid rgba(76,175,80,0.4)';  corNum='#4CAF50'; }
          else if (ehPend) { bg='rgba(255,193,7,0.12)';  border='1px solid rgba(255,193,7,0.4)';  corNum='#FFC107'; }
          else if (ehHoje) { bg='rgba(232,201,106,0.1)'; border='1px solid rgba(232,201,106,0.3)'; corNum='#E8C96A'; }

          return (
            <div key={idx} onClick={() => temAg && onDiaSel(dataStr)}
              style={{ borderRadius:'8px', padding:'6px 2px', textAlign:'center', cursor:temAg?'pointer':'default', background:bg, border }}>
              <div style={{ fontSize:'13px', fontWeight:temAg||ehHoje?'700':'400', color:corNum }}>{dia}</div>
              {temAg && (
                <div style={{ width:'5px', height:'5px', borderRadius:'50%', margin:'2px auto 0',
                  background: ehConf?'#4CAF50':ehPend?'#FFC107':ehCanc?'#F44336':'#9A8880' }} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:'12px', marginTop:'10px', paddingTop:'8px', borderTop:'1px solid #2E1A14' }}>
        {[
          { cor:'#4CAF50', label:'Confirmado' },
          { cor:'#FFC107', label:'Pendente'   },
          { cor:'#F44336', label:'Cancelado'  },
        ].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'#9A8880' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:l.cor, flexShrink:0 }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CARD AGENDAMENTO ─────────────────────────────────────────
// ✅ Sem lógica de pré-agendamento — tudo confirmado ou cancelado
function CardAgendamento({ ag, onCancelar, onReagendar, onAvaliar, onExcluir }) {
  const passado      = isPassado(ag.data, ag.hora);
  const ehHistorico  = passado || ag.status?.includes('cancelado');
  const podeCancelar = !passado && !['cancelado_cliente','cancelado_barbeiro','concluido'].includes(ag.status);
  const podeAvaliar  = ag.status === 'concluido' && !ag.avaliado;

  const corBarra = ag.status==='confirmado'?'#4CAF50':ag.status==='concluido'?'#2E7D7A':ag.status?.includes('cancelado')?'#F44336':'#FFC107';

  return (
    <div style={{ background:'#231410', borderRadius:'16px', border:'1px solid #3A2018', marginBottom:'12px', overflow:'hidden', opacity:passado&&!ag.status?.includes('cancelado')?0.9:1 }}>
      <div style={{ height:'3px', background:corBarra }} />
      <div style={{ padding:'14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
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

        {podeAvaliar && (
          <button onClick={() => onAvaliar(ag)}
            style={{ width:'100%', padding:'10px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#A07830,#C9A84C)', color:'#1A0F0D', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginBottom:'8px' }}>
            ⭐ Avaliar atendimento
          </button>
        )}
        {ag.avaliado && (
          <div style={{ fontSize:'11px', color:'#E8C96A', textAlign:'center', marginBottom:'8px' }}>⭐ Avaliação enviada!</div>
        )}

        {podeCancelar && (
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => onReagendar(ag)}
              style={{ flex:1, padding:'10px', borderRadius:'10px', border:'1px solid #3A2018', background:'#2E1A14', color:'#E8C96A', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
              🔄 Reagendar
            </button>
            <button onClick={() => onCancelar(ag)}
              style={{ flex:1, padding:'10px', borderRadius:'10px', border:'none', background:'rgba(244,67,54,0.15)', color:'#F44336', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
              ✗ Cancelar
            </button>
          </div>
        )}

        {ehHistorico && (
          <button onClick={() => onExcluir(ag)}
            style={{ width:'100%', marginTop:'8px', padding:'8px', borderRadius:'10px', border:'1px solid #2A1208', background:'transparent', color:'#555', fontSize:'11px', cursor:'pointer' }}>
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
  const [aba, setAba]                   = React.useState('calendario');
  const [diaSel, setDiaSel]             = React.useState(null);

  React.useEffect(() => {
    if (!cliente?.cpf) return;
    const telNorm = normalizarTel(cliente.telefone);
    let lista1 = [], lista2 = [];
    const ids = new Set();

    function merge() {
      ids.clear();
      const todos = [...lista1, ...lista2].filter(ag => {
        if (ids.has(ag.firestoreId)) return false;
        ids.add(ag.firestoreId);
        return !ag.ocultadoPorCliente;
      });
      todos.sort((a,b) => a.data?.localeCompare(b.data) || a.hora?.localeCompare(b.hora));
      setAgendamentos(todos);
    }

    const q1 = query(collection(db,'agendamentos'), where('clienteCpf','==',cliente.cpf), orderBy('data','desc'), orderBy('hora','desc'));
    const unsub1 = onSnapshot(q1, snap => {
      lista1 = snap.docs.map(d=>({firestoreId:d.id,...d.data()}));
      merge(); setCarregando(false);
    }, () => setCarregando(false));

    let unsub2 = () => {};
    if (telNorm) {
      const q2 = query(collection(db,'agendamentos'), where('clienteTel','==',telNorm), orderBy('data','desc'), orderBy('hora','desc'));
      unsub2 = onSnapshot(q2, snap => {
        lista2 = snap.docs.map(d=>({firestoreId:d.id,...d.data()})).filter(ag=>!ag.clienteCpf||ag.clienteCpf==='manual');
        merge();
      }, ()=>{});
    }

    return () => { unsub1(); unsub2(); };
  }, [cliente?.cpf, cliente?.telefone]);

  async function handleExcluir(ag) {
    try { await updateDoc(doc(db,'agendamentos',ag.firestoreId), { ocultadoPorCliente:true }); }
    catch(e) { console.error(e); }
  }

  // ✅ Sem pré-agendamento — filtra apenas confirmados e histórico
  const proximos  = agendamentos.filter(ag => !isPassado(ag.data, ag.hora) && !ag.status?.includes('cancelado'));
  const historico = agendamentos.filter(ag => isPassado(ag.data, ag.hora)  || ag.status?.includes('cancelado'));
  const agsDoDia  = diaSel ? agendamentos.filter(ag => ag.data===diaSel) : [];

  if (avaliando) {
    return <AvaliacaoServico agendamento={avaliando} cliente={cliente} dark={dark}
      onConcluir={() => setAvaliando(null)} onPular={() => setAvaliando(null)} />;
  }

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

      {/* Abas */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018' }}>
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
        {/* ─── ABA CALENDÁRIO ─── */}
        {aba === 'calendario' && (
          <>
            <CalendarioReservas
              agendamentos={agendamentos}
              diaSel={diaSel}
              onDiaSel={d => setDiaSel(diaSel===d ? null : d)}
            />
            {diaSel && agsDoDia.length > 0 && (
              <div style={{ background:'#231410', border:'1px solid #3A2018', borderRadius:'12px', padding:'12px', marginBottom:'12px' }}>
                <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', marginBottom:'8px' }}>
                  {formatarData(diaSel)}
                </div>
                {agsDoDia.map(ag => (
                  <div key={ag.firestoreId} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:'1px solid #2E1A14' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', flexShrink:0,
                      background:ag.status==='confirmado'?'#4CAF50':ag.status==='concluido'?'#2E7D7A':ag.status?.includes('cancelado')?'#F44336':'#FFC107' }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>{ag.hora} — {ag.servico}</div>
                      <div style={{ fontSize:'11px', color:'#9A8880' }}>✂️ {ag.barbeiroNome}</div>
                    </div>
                    <BadgeStatus status={ag.status} />
                  </div>
                ))}
              </div>
            )}
            {diaSel && agsDoDia.length === 0 && (
              <div style={{ textAlign:'center', color:'#9A8880', fontSize:'13px', padding:'12px' }}>
                Nenhum agendamento neste dia
              </div>
            )}
          </>
        )}

        {/* ─── ABA PRÓXIMOS ─── */}
        {aba === 'proximos' && (
          carregando
            ? <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳ Carregando...</div>
            : proximos.length === 0
              ? (
                <div style={{ textAlign:'center', padding:'40px' }}>
                  <div style={{ fontSize:'40px', marginBottom:'12px' }}>📅</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A', marginBottom:'8px' }}>Nenhuma reserva ativa</div>
                  <button onClick={onReagendar}
                    style={{ padding:'12px 24px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                    📅 Fazer Agendamento
                  </button>
                </div>
              )
              : proximos.map(ag => (
                <CardAgendamento key={ag.firestoreId} ag={ag}
                  onCancelar={setCancelando}
                  onReagendar={onReagendar}
                  onAvaliar={setAvaliando}
                  onExcluir={handleExcluir}
                />
              ))
        )}

        {/* ─── ABA HISTÓRICO ─── */}
        {aba === 'historico' && (
          carregando
            ? <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳ Carregando...</div>
            : historico.length === 0
              ? (
                <div style={{ textAlign:'center', padding:'40px' }}>
                  <div style={{ fontSize:'40px', marginBottom:'12px' }}>📋</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>Nenhum histórico</div>
                </div>
              )
              : historico.map(ag => (
                <CardAgendamento key={ag.firestoreId} ag={ag}
                  onCancelar={setCancelando}
                  onReagendar={onReagendar}
                  onAvaliar={setAvaliando}
                  onExcluir={handleExcluir}
                />
              ))
        )}
      </div>

      {cancelando && (
        <ModalCancelar
          agendamento={cancelando}
          onConfirmar={() => setCancelando(null)}
          onFechar={() => setCancelando(null)}
        />
      )}
    </div>
  );
}
