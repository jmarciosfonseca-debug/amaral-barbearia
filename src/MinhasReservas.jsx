// MinhasReservas.jsx — Flyguer BarberShop
// 🔧 Fase 1: "Repetir agendamento" em 1 clique no histórico
// 🔧 Fase 1: Bloco "Seu último corte" na aba Próximos
// 🔧 Fix: busca por CPF OU telefone
// ✅ Fase 2: WhatsApp automático para barbearia ao cancelar

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, orderBy,
  onSnapshot, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { getStyles } from './getStyles';
import { notificarBarbeariaCancel } from './notificacoes';
import AvaliacaoServico from './AvaliacaoServico';

function hoje() { return new Date().toISOString().split('T')[0]; }
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
    confirmado:         { label: '✅ Confirmado', bg: 'rgba(76,175,80,0.15)',   color: '#4CAF50' },
    pendente:           { label: '⏳ Pendente',   bg: 'rgba(255,193,7,0.15)',   color: '#FFC107' },
    cancelado_cliente:  { label: '✗ Cancelado',  bg: 'rgba(244,67,54,0.15)',   color: '#F44336' },
    cancelado_barbeiro: { label: '✗ Cancelado',  bg: 'rgba(244,67,54,0.15)',   color: '#F44336' },
    concluido:          { label: '✓ Concluído',  bg: 'rgba(46,125,122,0.15)',  color: '#2E7D7A' },
    reagendado:         { label: '🔄 Reagendado',bg: 'rgba(201,168,76,0.15)',  color: '#C9A84C' },
  };
  const cfg = configs[status] || { label: status, bg: '#2E1A14', color: '#9A8880' };
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background:cfg.bg, color:cfg.color }}>
      {cfg.label}{pagamento==='pix'||pagamento==='pix_sinal'?' · 💳 Pix':''}
    </div>
  );
}

// ✅ Fase 2: notificação WhatsApp automática ao cancelar
function notificarCancelamentoWhatsApp(agendamento) {
  const tel = '5511977643509'; // WhatsApp da barbearia
  const msg = encodeURIComponent(
    `❌ CANCELAMENTO\n\n` +
    `👤 ${agendamento.clienteNome}\n` +
    `📞 ${agendamento.clienteTel || '—'}\n` +
    `✂️ ${agendamento.barbeiroNome}\n` +
    `💈 ${agendamento.servico}\n` +
    `📅 ${formatarData(agendamento.data)} às ${agendamento.hora}\n` +
    `💰 R$ ${(agendamento.valor||0).toFixed(2).replace('.',',')}\n\n` +
    `_Cancelado pelo cliente via app_`
  );
  window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
}

function ModalCancelar({ agendamento, onConfirmar, onFechar }) {
  const [cancelando, setCancelando] = React.useState(false);
  const [cancelado, setCancelado]   = React.useState(false);
  const ehHoje = agendamento.data === hoje();

  async function handleCancelar() {
    setCancelando(true);
    try {
      await updateDoc(doc(db, 'agendamentos', agendamento.firestoreId), {
        status: 'cancelado_cliente', canceladoEm: serverTimestamp(),
      });
      setCancelado(true);
      // ✅ Fase 2: abre WhatsApp automaticamente para notificar a barbearia
      setTimeout(() => {
        notificarBarbeariaCancel(agendamento);      // notificacoes.js (existente)
        notificarCancelamentoWhatsApp(agendamento); // ✅ novo — abre WA da barbearia
        onConfirmar();
      }, 1000);
    } catch(e) { console.error(e); }
    finally { setCancelando(false); }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none' }}>
        {cancelado ? (
          <div style={{ textAlign:'center', padding:'20px' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#F5EFE6', marginBottom:'8px' }}>Cancelado com sucesso</div>
            <div style={{ fontSize:'13px', color:'#9A8880' }}>Abrindo WhatsApp para notificar a barbearia...</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>⚠️</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#F5EFE6', marginBottom:'8px' }}>Cancelar agendamento?</div>
              <div style={{ fontSize:'13px', color:'#9A8880' }}>{agendamento.barbeiroNome} · {agendamento.servico}</div>
              <div style={{ fontSize:'13px', color:'#9A8880' }}>{diaSemana(agendamento.data)}, {formatarData(agendamento.data)} às {agendamento.hora}</div>
            </div>
            {ehHoje && (
              <div style={{ background:'rgba(244,67,54,0.1)', border:'1px solid rgba(244,67,54,0.3)', borderRadius:'12px', padding:'12px 14px', marginBottom:'16px' }}>
                <div style={{ fontSize:'12px', fontWeight:'700', color:'#F44336', marginBottom:'4px' }}>⚠️ Cancelamento no mesmo dia</div>
                <div style={{ fontSize:'12px', color:'#F5EFE6', lineHeight:'1.6' }}>Se remarcar para hoje, será necessário pagar um <strong>sinal de 50% via Pix</strong>.</div>
              </div>
            )}
            {agendamento.sinal > 0 && (
              <div style={{ background:'rgba(255,193,7,0.1)', border:'1px solid rgba(255,193,7,0.3)', borderRadius:'12px', padding:'12px 14px', marginBottom:'16px' }}>
                <div style={{ fontSize:'12px', color:'#FFC107', lineHeight:'1.6' }}>
                  💳 Sinal de <strong>R$ {agendamento.sinal.toFixed(2).replace('.',',')} </strong>via Pix <strong>não será reembolsado</strong>.
                </div>
              </div>
            )}
            {/* ✅ Fase 2: aviso do WhatsApp automático */}
            <div style={{ background:'rgba(46,125,122,0.08)', border:'1px solid rgba(46,125,122,0.2)', borderRadius:'10px', padding:'10px 12px', marginBottom:'16px', fontSize:'11px', color:'#2E7D7A' }}>
              📱 Ao cancelar, o WhatsApp abrirá automaticamente para notificar a barbearia.
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={onFechar} style={{ flex:1, padding:'14px', borderRadius:'14px', border:'1px solid #3A2018', background:'#2E1A14', color:'#9A8880', fontSize:'14px', cursor:'pointer' }}>Manter reserva</button>
              <button onClick={handleCancelar} disabled={cancelando} style={{ flex:1, padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#8B0000,#F44336)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:cancelando?'wait':'pointer' }}>
                {cancelando ? '...' : 'Sim, cancelar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 🔧 MODAL REPETIR AGENDAMENTO
// ─────────────────────────────────────────────────────────────
function ModalRepetir({ agOriginal, cliente, onConcluir, onFechar, dark }) {
  const DIAS_KEYS = ['dom','seg','ter','qua','qui','sex','sab'];
  const [diasDisponiveis] = React.useState(() => {
    const dias = [];
    for (let i=1; i<15; i++) {
      const d = new Date(); d.setDate(d.getDate()+i);
      dias.push(d.toISOString().split('T')[0]);
    }
    return dias;
  });
  const [dataSel, setDataSel]   = React.useState(null);
  const [horaSel, setHoraSel]   = React.useState(null);
  const [horarios, setHorarios] = React.useState([]);
  const [config, setConfig]     = React.useState(null);
  const [carregando, setCarr]   = React.useState(false);
  const [salvando, setSalv]     = React.useState(false);
  const [erro, setErro]         = React.useState('');

  React.useEffect(() => {
    import('firebase/firestore').then(({ doc: fd, getDoc }) => {
      getDoc(fd(db,'config','barbearia')).then(snap => { if(snap.exists()) setConfig(snap.data()); });
    });
  }, []);

  React.useEffect(() => {
    if (!dataSel || !config) return;
    setCarr(true); setHoraSel(null);
    import('firebase/firestore').then(({ collection: col, query: q, where: w, getDocs: gd }) => {
      gd(q(col(db,'agendamentos'), w('data','==',dataSel))).then(snap => {
        const ocupadas = snap.docs.map(d=>d.data())
          .filter(a => a.barbeiroId === agOriginal.barbeiroId && ['confirmado','pendente'].includes(a.status))
          .map(a => a.hora);
        const diaSem = DIAS_KEYS[new Date(dataSel+'T12:00:00').getDay()];
        const hc = config.horarios?.[diaSem];
        if (!hc?.aberto) { setHorarios([]); setCarr(false); return; }
        const slots = [];
        const durMin = agOriginal.duracao || 30;
        const [hA,mA] = hc.abertura.split(':').map(Number);
        const [hF,mF] = hc.fechamento.split(':').map(Number);
        let atual = hA*60+mA, fim = hF*60+mF;
        while (atual+durMin <= fim) {
          const hora = `${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`;
          slots.push({ hora, disponivel: !ocupadas.includes(hora) });
          atual += 30;
        }
        setHorarios(slots);
        setCarr(false);
      });
    });
  }, [dataSel, config]);

  async function confirmar() {
    if (!dataSel || !horaSel) { setErro('Selecione data e horário'); return; }
    setSalv(true);
    try {
      const { collection: col, addDoc, serverTimestamp: sTs } = await import('firebase/firestore');
      const novoAg = {
        clienteCpf:          cliente.cpf,
        clienteNome:         cliente.nome,
        clienteTel:          cliente.telefone || '',
        barbeiroId:          agOriginal.barbeiroId,
        barbeiroNome:        agOriginal.barbeiroNome,
        servico:             agOriginal.servico,
        servicoIds:          agOriginal.servicoIds || [],
        valor:               agOriginal.valor || 0,
        duracao:             agOriginal.duracao || 30,
        data:                dataSel,
        hora:                horaSel,
        pagamento:           agOriginal.pagamento || 'local',
        sinal:               0,
        status:              'confirmado',
        agendadoPor:         'cliente',
        repetidoDe:          agOriginal.firestoreId,
        // ✅ Fase 2: campos lembrete
        lembrete24hEnviado:  false,
        lembrete2hEnviado:   false,
        criadoEm:            sTs(),
      };
      await addDoc(col(db,'agendamentos'), novoAg);
      const msg = encodeURIComponent(
        `✂️ NOVO AGENDAMENTO (Repetição)\n\n` +
        `👤 ${cliente.nome}\n📞 ${cliente.telefone||'—'}\n` +
        `✂️ ${agOriginal.barbeiroNome}\n💈 ${agOriginal.servico}\n` +
        `📅 ${formatarData(dataSel)} às ${horaSel}\n` +
        `💰 R$ ${(agOriginal.valor||0).toFixed(2).replace('.',',')}`
      );
      setTimeout(() => window.open(`https://wa.me/5511977643509?text=${msg}`,'_blank'), 500);
      onConcluir();
    } catch(e) { setErro('Erro ao agendar: ' + e.message); }
    setSalv(false);
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'20px 20px 40px', border:'1px solid #3A2018', borderBottom:'none', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>🔄 Repetir Agendamento</div>
          <button onClick={onFechar} style={{ background:'none', border:'none', color:'#9A8880', fontSize:'20px', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ background:'#231410', borderRadius:'14px', padding:'14px', border:'1px solid #3A2018', marginBottom:'20px' }}>
          <div style={{ fontSize:'10px', color:'#9A8880', fontWeight:'600', textTransform:'uppercase', marginBottom:'8px' }}>Repetindo com os mesmos dados</div>
          <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
            {[
              { icon:'✂️', value: agOriginal.barbeiroNome },
              { icon:'💈', value: agOriginal.servico },
              { icon:'💰', value: `R$ ${(agOriginal.valor||0).toFixed(2).replace('.',',')}` },
              { icon:'⏱', value: `${agOriginal.duracao||30} min` },
            ].map((item,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'12px', color:'#F5EFE6', background:'#2E1A14', borderRadius:'8px', padding:'5px 8px' }}>
                <span>{item.icon}</span><span>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', marginBottom:'10px', textTransform:'uppercase' }}>Escolha a nova data</div>
        <div style={{ overflowX:'auto', display:'flex', gap:'8px', paddingBottom:'8px', marginBottom:'16px' }}>
          {diasDisponiveis.map(data => {
            const sel = dataSel===data;
            const d = new Date(data+'T12:00:00');
            const diasSem = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
            return (
              <div key={data} onClick={() => setDataSel(data)}
                style={{ minWidth:'52px', padding:'10px 6px', borderRadius:'12px', textAlign:'center', cursor:'pointer', background:sel?'#8B3A2A':'#231410', border:sel?'1.5px solid #E8C96A':'1px solid #3A2018' }}>
                <div style={{ fontSize:'10px', color:sel?'#E8C96A':'#9A8880', fontWeight:'600' }}>{diasSem[d.getDay()]}</div>
                <div style={{ fontSize:'17px', fontWeight:'700', color:'#F5EFE6', marginTop:'2px' }}>{d.getDate()}</div>
                <div style={{ fontSize:'10px', color:sel?'#E8C96A':'#9A8880' }}>{String(d.getMonth()+1).padStart(2,'0')}</div>
              </div>
            );
          })}
        </div>
        {dataSel && (
          <>
            <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', marginBottom:'10px', textTransform:'uppercase' }}>Escolha o horário</div>
            {carregando ? <div style={{ textAlign:'center', color:'#9A8880', padding:'16px' }}>Carregando...</div> :
              horarios.length===0 ? <div style={{ textAlign:'center', color:'#9A8880', padding:'12px', background:'#231410', borderRadius:'10px', marginBottom:'12px' }}>Fechado neste dia</div> :
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginBottom:'16px' }}>
                {horarios.map(h => {
                  const sel = horaSel===h.hora;
                  return (
                    <div key={h.hora} onClick={() => h.disponivel&&setHoraSel(h.hora)}
                      style={{ padding:'10px 4px', borderRadius:'10px', textAlign:'center', cursor:h.disponivel?'pointer':'not-allowed', background:sel?'#8B3A2A':h.disponivel?'#231410':'#1A0F0D', border:sel?'1.5px solid #E8C96A':'1px solid #3A2018', opacity:h.disponivel?1:0.4, fontSize:'13px', fontWeight:'600', color:sel?'#F5EFE6':h.disponivel?'#F5EFE6':'#555' }}>
                      {h.hora}
                      {!h.disponivel && <div style={{ fontSize:'8px', color:'#F44336', marginTop:'2px' }}>Ocupado</div>}
                    </div>
                  );
                })}
              </div>
            }
          </>
        )}
        {erro && <div style={{ fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center' }}>⚠️ {erro}</div>}
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onFechar} style={{ flex:1, padding:'14px', borderRadius:'14px', border:'1px solid #3A2018', background:'#231410', color:'#9A8880', fontSize:'14px', cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={confirmar} disabled={salvando || !dataSel || !horaSel}
            style={{ flex:2, padding:'14px', borderRadius:'14px', border:'none', background:(!dataSel||!horaSel||salvando)?'#2E1A14':'linear-gradient(135deg,#5C2218,#8B3A2A)', color:(!dataSel||!horaSel||salvando)?'#555':'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:(!dataSel||!horaSel||salvando)?'not-allowed':'pointer' }}>
            {salvando ? '⏳ Agendando...' : '✅ Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CardAgendamento({ ag, onCancelar, onReagendar, onAvaliar, onExcluir, onRepetir }) {
  const passado     = isPassado(ag.data, ag.hora);
  const ehHistorico = passado || ag.status?.includes('cancelado');
  const podeCancelar= !passado && ag.status !== 'cancelado_cliente' && ag.status !== 'cancelado_barbeiro' && ag.status !== 'concluido';
  const podeAvaliar = ag.status === 'concluido' && !ag.avaliado;
  const podeRepetir = ehHistorico && ag.barbeiroId && ag.servico;

  return (
    <div style={{ background:'#231410', borderRadius:'16px', border:passado?'1px solid #2A1208':'1px solid #3A2018', marginBottom:'12px', overflow:'hidden', opacity:passado?0.85:1 }}>
      <div style={{ height:'3px', background:ag.status==='confirmado'?'#4CAF50':ag.status==='concluido'?'#2E7D7A':ag.status?.includes('cancelado')?'#F44336':'#FFC107' }} />
      <div style={{ padding:'14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px' }}>
          <div>
            <div style={{ fontWeight:'700', fontSize:'15px', color:'#F5EFE6' }}>{ag.servico}</div>
            <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>✂️ {ag.barbeiroNome}</div>
            {ag.agendadoPor==='recepcao' && <div style={{ fontSize:'10px', color:'#2E7D7A', marginTop:'2px' }}>📋 Agendado pela recepção</div>}
          </div>
          <BadgeStatus status={ag.status} pagamento={ag.pagamento} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px', background:'#1A0F0D', borderRadius:'10px', padding:'10px' }}>
          {[
            { label:'Data',      value:`${diaSemana(ag.data)}, ${formatarData(ag.data)}` },
            { label:'Horário',   value:ag.hora },
            { label:'Valor',     value:`R$ ${(ag.valor||0).toFixed(2).replace('.',',')}`, gold:true },
            { label:'Pagamento', value:ag.pagamento==='pix'||ag.pagamento==='pix_sinal'?'💳 Pix':'💵 Local' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'2px' }}>{item.label}</div>
              <div style={{ fontSize:'13px', color:item.gold?'#E8C96A':'#F5EFE6', fontWeight:item.gold?'700':'600' }}>{item.value}</div>
            </div>
          ))}
        </div>
        {ag.sinal > 0 && (
          <div style={{ fontSize:'11px', color:'#2E7D7A', background:'rgba(46,125,122,0.1)', borderRadius:'8px', padding:'6px 10px', marginBottom:'10px' }}>
            💳 Sinal pago: R$ {ag.sinal.toFixed(2).replace('.',',')} · será abatido no total
          </div>
        )}
        {podeAvaliar && (
          <button onClick={() => onAvaliar(ag)} style={{ width:'100%', padding:'10px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#A07830,#C9A84C)', color:'#1A0F0D', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginBottom:'8px' }}>
            ⭐ Avaliar atendimento
          </button>
        )}
        {ag.avaliado && (
          <div style={{ fontSize:'11px', color:'#E8C96A', textAlign:'center', padding:'6px', marginBottom:'8px' }}>⭐ Avaliação enviada — obrigado!</div>
        )}
        {podeRepetir && (
          <button onClick={() => onRepetir(ag)}
            style={{ width:'100%', padding:'11px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#1A3A2A,#2E7D7A)', color:'#4CAF50', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginBottom:'8px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
            🔄 Repetir este agendamento
          </button>
        )}
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

export default function MinhasReservas({ cliente, onBack, onReagendar, dark }) {
  const s = getStyles(dark);
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [carregando, setCarregando]     = React.useState(true);
  const [cancelando, setCancelando]     = React.useState(null);
  const [avaliando, setAvaliando]       = React.useState(null);
  const [repetindo, setRepetindo]       = React.useState(null);
  const [repetidoOk, setRepetidoOk]    = React.useState(false);
  const [aba, setAba]                   = React.useState('proximos');

  React.useEffect(() => {
    if (!cliente?.cpf) return;
    const telNorm = normalizarTel(cliente.telefone);
    const q1 = query(collection(db,'agendamentos'), where('clienteCpf','==',cliente.cpf), orderBy('data','desc'), orderBy('hora','desc'));
    const q2 = telNorm ? query(collection(db,'agendamentos'), where('clienteTel','==',telNorm), orderBy('data','desc'), orderBy('hora','desc')) : null;
    const ids = new Set();
    function merge(lista) {
      return lista.filter(ag => { if(ids.has(ag.firestoreId)) return false; ids.add(ag.firestoreId); return true; })
        .filter(ag => !ag.ocultadoPorCliente)
        .sort((a,b) => b.data?.localeCompare(a.data) || b.hora?.localeCompare(a.hora));
    }
    let lista1 = [], lista2 = [];
    const unsub1 = onSnapshot(q1, snap => {
      lista1 = snap.docs.map(d=>({firestoreId:d.id,...d.data()}));
      ids.clear(); setAgendamentos(merge([...lista1,...lista2])); setCarregando(false);
    }, () => setCarregando(false));
    let unsub2 = () => {};
    if (q2) {
      unsub2 = onSnapshot(q2, snap => {
        lista2 = snap.docs.map(d=>({firestoreId:d.id,...d.data()})).filter(ag=>!ag.clienteCpf||ag.clienteCpf==='manual');
        ids.clear(); setAgendamentos(merge([...lista1,...lista2])); setCarregando(false);
      }, () => {});
    }
    return () => { unsub1(); unsub2(); };
  }, [cliente?.cpf, cliente?.telefone]);

  async function handleExcluir(ag) {
    try { await updateDoc(doc(db,'agendamentos',ag.firestoreId), { ocultadoPorCliente: true }); }
    catch(e) { console.error(e); }
  }

  const proximos  = agendamentos.filter(ag => !isPassado(ag.data, ag.hora) && !ag.status?.includes('cancelado'));
  const historico = agendamentos.filter(ag => isPassado(ag.data, ag.hora) || ag.status?.includes('cancelado'));
  const lista = aba === 'proximos' ? proximos : historico;
  const ultimoConcluido = agendamentos.find(ag => ag.status === 'concluido');

  if (avaliando) return <AvaliacaoServico agendamento={avaliando} cliente={cliente} dark={dark} onConcluir={() => setAvaliando(null)} onPular={() => setAvaliando(null)} />;

  return (
    <div style={{ ...s.app, paddingBottom:'40px' }}>
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>📋 Minhas Reservas</div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>{cliente.nome.split(' ')[0]}</div>
        </div>
      </div>

      {ultimoConcluido && aba === 'proximos' && proximos.length === 0 && (
        <div style={{ margin:'16px 16px 0', background:'linear-gradient(135deg,#1A2E1A,#1A3A2A)', border:'1px solid rgba(76,175,80,0.3)', borderRadius:'16px', padding:'16px' }}>
          <div style={{ fontSize:'10px', color:'#4CAF50', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>✂️ SEU ÚLTIMO CORTE</div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:'#F5EFE6' }}>
              {ultimoConcluido.barbeiroNome?.[0]||'?'}
            </div>
            <div>
              <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{ultimoConcluido.servico}</div>
              <div style={{ fontSize:'12px', color:'#9A8880' }}>com {ultimoConcluido.barbeiroNome} · {formatarData(ultimoConcluido.data)}</div>
            </div>
          </div>
          <button onClick={() => setRepetindo(ultimoConcluido)}
            style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
            🔄 Agendar novamente com {ultimoConcluido.barbeiroNome?.split(' ')[0]} →
          </button>
        </div>
      )}

      {repetidoOk && (
        <div style={{ margin:'12px 16px 0', background:'rgba(76,175,80,0.15)', border:'1px solid #4CAF50', borderRadius:'12px', padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'20px' }}>🎉</span>
          <div>
            <div style={{ fontWeight:'700', fontSize:'13px', color:'#4CAF50' }}>Agendamento confirmado!</div>
            <div style={{ fontSize:'12px', color:'#9A8880' }}>Repetição criada com sucesso</div>
          </div>
        </div>
      )}

      <div style={{ display:'flex', borderBottom:'1px solid #3A2018', marginTop:'16px' }}>
        {[{id:'proximos',label:`Próximos (${proximos.length})`},{id:'historico',label:`Histórico (${historico.length})`}].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{ flex:1, padding:'14px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #8B3A2A':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'13px', fontWeight:aba===a.id?'700':'400', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        {carregando ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#9A8880' }}><div style={{ fontSize:'32px', marginBottom:'12px' }}>⏳</div>Carregando reservas...</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>{aba==='proximos'?'📅':'📋'}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A', marginBottom:'8px' }}>{aba==='proximos'?'Nenhuma reserva ativa':'Nenhum histórico'}</div>
            <div style={{ fontSize:'13px', color:'#9A8880', marginBottom:'24px' }}>{aba==='proximos'?'Que tal agendar agora?':'Seus agendamentos anteriores aparecerão aqui'}</div>
            {aba==='proximos' && <button onClick={onReagendar} style={{ padding:'12px 24px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>📅 Fazer Agendamento</button>}
          </div>
        ) : (
          lista.map(ag => (
            <CardAgendamento key={ag.firestoreId} ag={ag}
              onCancelar={ag => setCancelando(ag)}
              onReagendar={onReagendar}
              onAvaliar={ag => setAvaliando(ag)}
              onExcluir={handleExcluir}
              onRepetir={ag => { setRepetindo(ag); setRepetidoOk(false); }}
            />
          ))
        )}
      </div>

      {cancelando && <ModalCancelar agendamento={cancelando} onConfirmar={() => setCancelando(null)} onFechar={() => setCancelando(null)} />}

      {repetindo && (
        <ModalRepetir
          agOriginal={repetindo}
          cliente={cliente}
          dark={dark}
          onConcluir={() => { setRepetindo(null); setRepetidoOk(true); setAba('proximos'); setTimeout(()=>setRepetidoOk(false),5000); }}
          onFechar={() => setRepetindo(null)}
        />
      )}
    </div>
  );
}
