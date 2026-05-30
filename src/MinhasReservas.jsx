// MinhasReservas.jsx — Flyguer BarberShop
// ✅ Passo 14 — botão Avaliar após atendimento concluído

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, orderBy,
  onSnapshot, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { getStyles } from './getStyles';
import { notificarBarbeariaCancel } from './notificacoes';
import AvaliacaoServico from './AvaliacaoServico'; // ✅ P14

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

function ModalCancelar({ agendamento, onConfirmar, onFechar }) {
  const [cancelando, setCancelando] = React.useState(false);
  const [cancelado, setCancelado]   = React.useState(false);
  const ehHoje = agendamento.data === hoje();

  async function handleCancelar() {
    setCancelando(true);
    try {
      await updateDoc(doc(db, 'agendamentos', agendamento.firestoreId), {
        status: 'cancelado_cliente',
        canceladoEm: serverTimestamp(),
      });
      setCancelado(true);
      setTimeout(() => {
        notificarBarbeariaCancel(agendamento);
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
            <div style={{ background:'rgba(46,125,122,0.08)', border:'1px solid rgba(46,125,122,0.2)', borderRadius:'10px', padding:'10px 12px', marginBottom:'16px', fontSize:'11px', color:'#2E7D7A' }}>
              📱 Ao cancelar, o WhatsApp abrirá automaticamente para notificar a barbearia.
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={onFechar} style={{ flex:1, padding:'14px', borderRadius:'14px', border:'1px solid #3A2018', background:'#2E1A14', color:'#9A8880', fontSize:'14px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Manter reserva</button>
              <button onClick={handleCancelar} disabled={cancelando} style={{ flex:1, padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#8B0000,#F44336)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:cancelando?'wait':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                {cancelando ? '...' : 'Sim, cancelar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CardAgendamento({ ag, onCancelar, onReagendar, onAvaliar }) {
  const passado = isPassado(ag.data, ag.hora);
  const podeCancelar = !passado && ag.status !== 'cancelado_cliente' && ag.status !== 'cancelado_barbeiro' && ag.status !== 'concluido';
  const podeAvaliar  = ag.status === 'concluido' && !ag.avaliado; // ✅ P14

  return (
    <div style={{ background:'#231410', borderRadius:'16px', border:passado?'1px solid #2A1208':'1px solid #3A2018', marginBottom:'12px', overflow:'hidden', opacity:passado?0.7:1 }}>
      <div style={{ height:'3px', background:ag.status==='confirmado'?'#4CAF50':ag.status==='concluido'?'#2E7D7A':ag.status?.includes('cancelado')?'#F44336':'#FFC107' }} />
      <div style={{ padding:'14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px' }}>
          <div>
            <div style={{ fontWeight:'700', fontSize:'15px', color:'#F5EFE6' }}>{ag.servico}</div>
            <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>✂️ {ag.barbeiroNome}</div>
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

        {/* ✅ Botão Avaliar */}
        {podeAvaliar && (
          <button onClick={() => onAvaliar(ag)}
            style={{ width:'100%', padding:'10px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#A07830,#C9A84C)', color:'#1A0F0D', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginBottom:'8px', fontFamily:"'DM Sans',sans-serif" }}>
            ⭐ Avaliar atendimento
          </button>
        )}

        {ag.avaliado && (
          <div style={{ fontSize:'11px', color:'#E8C96A', textAlign:'center', padding:'6px', marginBottom:'8px' }}>
            ⭐ Avaliação enviada — obrigado!
          </div>
        )}

        {podeCancelar && (
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={() => onReagendar(ag)} style={{ flex:1, padding:'10px', borderRadius:'10px', border:'1px solid #3A2018', background:'#2E1A14', color:'#E8C96A', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>🔄 Reagendar</button>
            <button onClick={() => onCancelar(ag)} style={{ flex:1, padding:'10px', borderRadius:'10px', border:'none', background:'rgba(244,67,54,0.15)', color:'#F44336', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>✗ Cancelar</button>
          </div>
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
  const [avaliando, setAvaliando]       = React.useState(null); // ✅ P14
  const [aba, setAba]                   = React.useState('proximos');

  React.useEffect(() => {
    if (!cliente?.cpf) return;
    const q = query(
      collection(db, 'agendamentos'),
      where('clienteCpf', '==', cliente.cpf),
      orderBy('data', 'desc'),
      orderBy('hora', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      setAgendamentos(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
      setCarregando(false);
    }, err => { console.error(err); setCarregando(false); });
    return () => unsub();
  }, [cliente?.cpf]);

  const proximos  = agendamentos.filter(ag => !isPassado(ag.data, ag.hora) && !ag.status?.includes('cancelado'));
  const historico = agendamentos.filter(ag => isPassado(ag.data, ag.hora) || ag.status?.includes('cancelado'));
  const lista = aba === 'proximos' ? proximos : historico;

  // ✅ Se está avaliando, mostra tela de avaliação
  if (avaliando) {
    return (
      <AvaliacaoServico
        agendamento={avaliando}
        cliente={cliente}
        dark={dark}
        onConcluir={() => setAvaliando(null)}
        onPular={() => setAvaliando(null)}
      />
    );
  }

  return (
    <div style={{ ...s.app, paddingBottom:'40px' }}>
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>📋 Minhas Reservas</div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>{cliente.nome.split(' ')[0]}</div>
        </div>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid #3A2018' }}>
        {[
          { id:'proximos',  label:`Próximos (${proximos.length})`  },
          { id:'historico', label:`Histórico (${historico.length})` },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{ flex:1, padding:'14px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #8B3A2A':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'13px', fontWeight:aba===a.id?'700':'400', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        {carregando ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#9A8880' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>⏳</div>Carregando reservas...
          </div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>{aba==='proximos'?'📅':'📋'}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A', marginBottom:'8px' }}>
              {aba==='proximos'?'Nenhuma reserva ativa':'Nenhum histórico'}
            </div>
            <div style={{ fontSize:'13px', color:'#9A8880', marginBottom:'24px' }}>
              {aba==='proximos'?'Que tal agendar agora?':'Seus agendamentos anteriores aparecerão aqui'}
            </div>
            {aba==='proximos' && (
              <button onClick={onReagendar} style={{ padding:'12px 24px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                📅 Fazer Agendamento
              </button>
            )}
          </div>
        ) : (
          lista.map(ag => (
            <CardAgendamento
              key={ag.firestoreId}
              ag={ag}
              onCancelar={ag => setCancelando(ag)}
              onReagendar={onReagendar}
              onAvaliar={ag => setAvaliando(ag)} // ✅ P14
            />
          ))
        )}
      </div>

      {cancelando && (
        <ModalCancelar agendamento={cancelando} onConfirmar={() => setCancelando(null)} onFechar={() => setCancelando(null)} />
      )}
    </div>
  );
}
