// AgendaBarbeiro.jsx — Flyguer BarberShop
// ✅ v3: Calendário com cores, lista de clientes do dia, cancelamentos em vermelho

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, setDoc, deleteDoc, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { getStyles } from './getStyles';

const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DIAS_KEYS   = ['dom','seg','ter','qua','qui','sex','sab'];
const MESES       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatarData(dataStr) {
  if (!dataStr) return '';
  const [a,m,d] = dataStr.split('-');
  return `${d}/${m}/${a}`;
}
function mkData(a,m,d) {
  return `${a}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

// ─── CALENDÁRIO DO BARBEIRO ────────────────────────────────────
function CalendarioBarbeiro({ agendamentos, slotsBloqueados, dataSel, onDiaSel, config }) {
  const agoraDt = new Date();
  const anoHoje = agoraDt.getFullYear();
  const mesHoje = agoraDt.getMonth();
  const diaHoje = agoraDt.getDate();
  const hojeStr = mkData(anoHoje, mesHoje, diaHoje);

  const [mes, setMes] = React.useState(mesHoje);
  const [ano, setAno] = React.useState(anoHoje);

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes   = new Date(ano, mes+1, 0).getDate();

  function navMes(dir) {
    let nm = mes+dir, na = ano;
    if (nm<0)  { nm=11; na--; }
    if (nm>11) { nm=0;  na++; }
    setMes(nm); setAno(na);
  }

  // Status por dia: confirmados, cancelados, mistos
  const mapaDia = {};
  agendamentos.forEach(ag => {
    if (!ag.data) return;
    if (!mapaDia[ag.data]) mapaDia[ag.data] = { conf:0, canc:0, pre:0, total:0 };
    mapaDia[ag.data].total++;
    if (ag.status === 'confirmado' || ag.status === 'pendente') mapaDia[ag.data].conf++;
    else if (ag.status?.includes('cancelado')) mapaDia[ag.data].canc++;
    else if (ag.status === 'pre_agendamento') mapaDia[ag.data].pre++;
  });

  const cells = [];
  for (let i=0; i<primeiroDia; i++) cells.push(null);
  for (let d=1; d<=diasNoMes; d++) cells.push(d);

  return (
    <div style={{ background:'#1A0F0D', borderRadius:'16px', padding:'14px', marginBottom:'12px', border:'1px solid #3A2018' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <button onClick={()=>navMes(-1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'4px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'18px' }}>{'<'}</button>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'15px', color:'#E8C96A', fontWeight:'700' }}>{MESES[mes]} {ano}</div>
        <button onClick={()=>navMes(1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'4px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'18px' }}>{'>'}</button>
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
          const info    = mapaDia[dataStr];
          const ehHoje  = dataStr === hojeStr;
          const ehSel   = dataStr === dataSel;
          const temConf = info?.conf > 0;
          const temCanc = info?.canc > 0;
          const corPonto = temCanc && temConf ? '#FFC107' : temCanc ? '#F44336' : temConf ? '#4CAF50' : null;
          return (
            <div key={idx} onClick={() => onDiaSel(dataStr)}
              style={{ borderRadius:'8px', padding:'6px 2px', textAlign:'center', cursor:'pointer',
                background: ehSel?'#3A2018':ehHoje?'rgba(232,201,106,0.1)':'transparent',
                border: ehSel?'1.5px solid #E8C96A':ehHoje?'1px solid rgba(232,201,106,0.3)':'1px solid transparent',
              }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:ehHoje?'#E8C96A':ehSel?'#F5EFE6':'#9A8880' }}>{dia}</div>
              {corPonto && <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:corPonto, margin:'2px auto 0' }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:'12px', marginTop:'10px', paddingTop:'8px', borderTop:'1px solid #2E1A14' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'#9A8880' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#4CAF50' }} /> Confirmados
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'#9A8880' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#FFC107' }} /> Misto
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'#9A8880' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#F44336' }} /> Cancelado
        </div>
      </div>
    </div>
  );
}

// ─── LISTA DE CLIENTES DO DIA ─────────────────────────────────
function ListaClientesDia({ agendamentos, dataSel, onConcluir, onCancelar }) {
  if (!dataSel) return null;
  const agsDia = agendamentos
    .filter(ag => ag.data === dataSel)
    .sort((a,b) => a.hora?.localeCompare(b.hora));

  if (agsDia.length === 0) {
    return (
      <div style={{ background:'#231410', borderRadius:'14px', padding:'20px', border:'1px solid #3A2018', textAlign:'center', marginBottom:'12px' }}>
        <div style={{ fontSize:'13px', color:'#9A8880' }}>Nenhum agendamento neste dia</div>
      </div>
    );
  }

  return (
    <div style={{ background:'#231410', borderRadius:'14px', border:'1px solid #3A2018', marginBottom:'12px', overflow:'hidden' }}>
      <div style={{ padding:'12px 14px', borderBottom:'1px solid #3A2018', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase' }}>
          {formatarData(dataSel)} — {agsDia.length} agendamento{agsDia.length!==1?'s':''}
        </div>
        <div style={{ display:'flex', gap:'8px', fontSize:'11px' }}>
          <span style={{ color:'#4CAF50' }}>{agsDia.filter(a=>a.status==='confirmado').length} conf.</span>
          {agsDia.filter(a=>a.status?.includes('cancelado')).length > 0 && (
            <span style={{ color:'#F44336' }}>{agsDia.filter(a=>a.status?.includes('cancelado')).length} canc.</span>
          )}
        </div>
      </div>
      {agsDia.map(ag => {
        const ehCanc = ag.status?.includes('cancelado');
        const ehConc = ag.status === 'concluido';
        return (
          <div key={ag.id||ag.firestoreId} style={{ padding:'12px 14px', borderBottom:'1px solid #2E1A14', background: ehCanc?'rgba(244,67,54,0.05)':'transparent' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ fontWeight:'700', fontSize:'14px', color:'#E8C96A', width:'44px', flexShrink:0 }}>{ag.hora}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:'700', fontSize:'13px', color: ehCanc?'#F44336':ehConc?'#2E7D7A':'#F5EFE6' }}>
                  {ag.clienteNome}
                  {ehCanc && ' — CANCELADO'}
                </div>
                <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>
                  💈 {ag.servico} · {ag.duracao||30}min · R$ {(ag.valor||0).toFixed(2).replace('.',',')}
                </div>
                {ag.clienteTel && (
                  <div style={{ fontSize:'11px', color:'#3A9E9A', marginTop:'2px' }}>📞 {ag.clienteTel}</div>
                )}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'4px', flexShrink:0 }}>
                {ag.status === 'confirmado' && (
                  <button onClick={() => onConcluir(ag)}
                    style={{ padding:'5px 10px', borderRadius:'8px', border:'none', background:'rgba(46,125,122,0.2)', color:'#2E7D7A', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
                    ✓ Concluir
                  </button>
                )}
                {ag.status === 'confirmado' && (
                  <button onClick={() => onCancelar(ag)}
                    style={{ padding:'5px 10px', borderRadius:'8px', border:'none', background:'rgba(244,67,54,0.15)', color:'#F44336', fontSize:'11px', cursor:'pointer' }}>
                    ✗
                  </button>
                )}
                {ag.clienteTel && (
                  <button onClick={() => window.open(`https://wa.me/55${ag.clienteTel.replace(/\D/g,'')}`, '_blank')}
                    style={{ padding:'5px 10px', borderRadius:'8px', border:'1px solid rgba(37,211,102,0.3)', background:'transparent', color:'#25D366', fontSize:'11px', cursor:'pointer' }}>
                    📲
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ABA HORÁRIOS / DISPONIBILIDADE ───────────────────────────
function AbaHorarios({ usuario, dataSel, config, slotsBloqueados, setSlotsBloqueados }) {
  const [salvando, setSalvando] = React.useState(false);

  const diaSem = dataSel ? DIAS_KEYS[new Date(dataSel+'T12:00:00').getDay()] : null;
  const hc     = diaSem && config?.horarios?.[diaSem];

  const gerarSlots = () => {
    if (!hc?.aberto) return [];
    const slots = [];
    const [hA,mA] = hc.abertura.split(':').map(Number);
    const [hF,mF] = hc.fechamento.split(':').map(Number);
    let atual = hA*60+mA, fim = hF*60+mF;
    while (atual+30 <= fim) {
      slots.push(`${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`);
      atual += 30;
    }
    return slots;
  };

  const slots = gerarSlots();

  async function toggleSlot(hora) {
    if (!usuario?.id || !dataSel) return;
    const id = `${usuario.id}_${dataSel}_${hora}`;
    if (slotsBloqueados.has(hora)) {
      await deleteDoc(doc(db,'slots_bloqueados',id));
      setSlotsBloqueados(prev => { const n = new Set(prev); n.delete(hora); return n; });
    } else {
      await setDoc(doc(db,'slots_bloqueados',id), { barbeiroId:usuario.id, data:dataSel, hora });
      setSlotsBloqueados(prev => new Set([...prev, hora]));
    }
  }

  async function bloquearTudo() {
    if (!usuario?.id || !dataSel) return;
    setSalvando(true);
    const jaBloq = slots.every(s => slotsBloqueados.has(s));
    for (const hora of slots) {
      const id = `${usuario.id}_${dataSel}_${hora}`;
      if (jaBloq) await deleteDoc(doc(db,'slots_bloqueados',id));
      else await setDoc(doc(db,'slots_bloqueados',id), { barbeiroId:usuario.id, data:dataSel, hora });
    }
    setSlotsBloqueados(jaBloq ? new Set() : new Set(slots));
    setSalvando(false);
  }

  if (!dataSel) return <div style={{ textAlign:'center', padding:'20px', color:'#9A8880', fontSize:'13px' }}>Selecione um dia no calendário</div>;
  if (!hc?.aberto) return <div style={{ textAlign:'center', padding:'20px', color:'#9A8880', fontSize:'13px' }}>Dia fechado conforme configuração</div>;

  const todoBloqueado = slots.every(s => slotsBloqueados.has(s));

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700' }}>Controle de disponibilidade — {formatarData(dataSel)}</div>
        <button onClick={bloquearTudo} disabled={salvando}
          style={{ padding:'6px 12px', borderRadius:'8px', border:'1px solid rgba(244,67,54,0.4)', background:todoBloqueado?'rgba(76,175,80,0.15)':'rgba(244,67,54,0.1)', color:todoBloqueado?'#4CAF50':'#F44336', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
          {salvando?'...':todoBloqueado?'🔓 Abrir tudo':'🔒 Bloquear dia'}
        </button>
      </div>
      <div style={{ fontSize:'11px', color:'#9A8880', marginBottom:'10px' }}>Toque para abrir ou fechar um horário</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
        {slots.map(hora => {
          const bloqueado = slotsBloqueados.has(hora);
          return (
            <div key={hora} onClick={() => toggleSlot(hora)}
              style={{ padding:'12px 4px', borderRadius:'10px', textAlign:'center', cursor:'pointer',
                background: bloqueado?'rgba(244,67,54,0.15)':'rgba(76,175,80,0.1)',
                border: bloqueado?'1px solid rgba(244,67,54,0.4)':'1px solid rgba(76,175,80,0.3)' }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:bloqueado?'#F44336':'#4CAF50' }}>{hora}</div>
              <div style={{ fontSize:'9px', color:bloqueado?'#F44336':'#4CAF50', marginTop:'2px' }}>{bloqueado?'🔒 Fechado':'✅ Livre'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function AgendaBarbeiro({ usuario, dark }) {
  const s = getStyles(dark);
  const [aba, setAba]                   = React.useState('agenda');
  const [dataSel, setDataSel]           = React.useState(hoje());
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [slotsBloqueados, setSlotsBloqueados] = React.useState(new Set());
  const [config, setConfig]             = React.useState(null);
  const [clientes, setClientes]         = React.useState([]);
  const [buscaCliente, setBuscaCliente] = React.useState('');

  // Carregar config
  React.useEffect(() => {
    import('firebase/firestore').then(({ doc:fd, getDoc }) => {
      getDoc(fd(db,'config','barbearia')).then(snap => { if(snap.exists()) setConfig(snap.data()); });
    });
  }, []);

  // Agendamentos em tempo real
  React.useEffect(() => {
    if (!usuario?.id) return;
    const unsub = onSnapshot(
      query(collection(db,'agendamentos'), where('barbeiroId','==',usuario.id)),
      snap => setAgendamentos(snap.docs.map(d=>({firestoreId:d.id,...d.data()}))),
      console.error
    );
    return unsub;
  }, [usuario?.id]);

  // Slots bloqueados para data selecionada
  React.useEffect(() => {
    if (!usuario?.id || !dataSel) return;
    const unsub = onSnapshot(
      query(collection(db,'slots_bloqueados'), where('barbeiroId','==',usuario.id), where('data','==',dataSel)),
      snap => setSlotsBloqueados(new Set(snap.docs.map(d=>d.data().hora))),
      console.error
    );
    return unsub;
  }, [usuario?.id, dataSel]);

  // Clientes atendidos
  React.useEffect(() => {
    if (!usuario?.id || aba !== 'clientes') return;
    getDocs(query(collection(db,'agendamentos'), where('barbeiroId','==',usuario.id))).then(snap => {
      const mapa = {};
      snap.docs.forEach(d => {
        const ag = d.data();
        if (!ag.clienteCpf || ag.clienteCpf.startsWith('amigo_') || ag.status?.includes('cancelado')) return;
        if (!mapa[ag.clienteCpf] || ag.data > mapa[ag.clienteCpf].data) {
          mapa[ag.clienteCpf] = { cpf:ag.clienteCpf, nome:ag.clienteNome, tel:ag.clienteTel, ultimoServico:ag.servico, ultimaData:ag.data };
        }
      });
      setClientes(Object.values(mapa).sort((a,b) => (b.ultimaData||'').localeCompare(a.ultimaData||'')));
    });
  }, [usuario?.id, aba]);

  async function handleConcluir(ag) {
    await updateDoc(doc(db,'agendamentos',ag.firestoreId), { status:'concluido', concluidoEm: serverTimestamp() });
  }
  async function handleCancelarBarbeiro(ag) {
    await updateDoc(doc(db,'agendamentos',ag.firestoreId), { status:'cancelado_barbeiro', canceladoEm: serverTimestamp() });
  }

  const clientesFiltrados = clientes.filter(c =>
    !buscaCliente || c.nome?.toLowerCase().includes(buscaCliente.toLowerCase()) || c.tel?.includes(buscaCliente)
  );

  const disponivel = usuario?.disponivel !== false;

  return (
    <div style={{ ...s.app, paddingBottom:'20px' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'700', color:'#F5EFE6' }}>
            {usuario?.nome?.charAt(0)||'B'}
          </div>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'16px', color:'#F5EFE6', fontWeight:'700' }}>{usuario?.nome}</div>
            <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>Minha Agenda</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', borderRadius:'20px', background: disponivel?'rgba(76,175,80,0.2)':'rgba(255,193,7,0.2)', border:`1px solid ${disponivel?'rgba(76,175,80,0.4)':'rgba(255,193,7,0.4)'}`, cursor:'pointer' }}
          onClick={async () => {
            await updateDoc(doc(db,'barbeiros',usuario.id), { disponivel: !disponivel });
          }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: disponivel?'#4CAF50':'#FFC107' }} />
          <span style={{ fontSize:'12px', fontWeight:'700', color: disponivel?'#4CAF50':'#FFC107' }}>{disponivel?'Disponível':'Ocupado'}</span>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018' }}>
        {[
          { id:'agenda',   label:'📅 Agenda' },
          { id:'horarios', label:'✏️ Horários' },
          { id:'clientes', label:'👥 Clientes' },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ flex:1, padding:'13px 4px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #E8C96A':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        {/* Aba Agenda */}
        {aba === 'agenda' && (
          <>
            <CalendarioBarbeiro
              agendamentos={agendamentos}
              slotsBloqueados={slotsBloqueados}
              dataSel={dataSel}
              onDiaSel={setDataSel}
              config={config}
            />
            <ListaClientesDia
              agendamentos={agendamentos}
              dataSel={dataSel}
              onConcluir={handleConcluir}
              onCancelar={handleCancelarBarbeiro}
            />
          </>
        )}

        {/* Aba Horários */}
        {aba === 'horarios' && (
          <>
            {/* Seletor de data */}
            <div style={{ overflowX:'auto', display:'flex', gap:'8px', paddingBottom:'8px', marginBottom:'16px' }}>
              {Array.from({length:14},(_,i) => {
                const agoraDt = new Date();
                const d = new Date(agoraDt.getFullYear(), agoraDt.getMonth(), agoraDt.getDate()+i);
                const ds = mkData(d.getFullYear(), d.getMonth(), d.getDate());
                const sel = ds===dataSel;
                return (
                  <div key={ds} onClick={() => setDataSel(ds)}
                    style={{ minWidth:'52px', padding:'8px 6px', borderRadius:'12px', textAlign:'center', cursor:'pointer', background:sel?'#8B3A2A':'#231410', border:sel?'1.5px solid #E8C96A':'1px solid #3A2018', flexShrink:0 }}>
                    <div style={{ fontSize:'10px', color:sel?'#E8C96A':'#9A8880', fontWeight:'600' }}>{DIAS_SEMANA[d.getDay()]}</div>
                    <div style={{ fontSize:'16px', fontWeight:'700', color:'#F5EFE6' }}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <AbaHorarios usuario={usuario} dataSel={dataSel} config={config} slotsBloqueados={slotsBloqueados} setSlotsBloqueados={setSlotsBloqueados} />
          </>
        )}

        {/* Aba Clientes */}
        {aba === 'clientes' && (
          <>
            <div style={{ marginBottom:'14px' }}>
              <input
                type="text"
                placeholder="🔍 Buscar cliente..."
                value={buscaCliente}
                onChange={e => setBuscaCliente(e.target.value)}
                style={{ width:'100%', background:'#231410', border:'1px solid #3A2018', borderRadius:'12px', padding:'10px 14px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box' }}
              />
            </div>
            <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'12px' }}>
              👥 {clientesFiltrados.length} cliente{clientesFiltrados.length!==1?'s':''} atendido{clientesFiltrados.length!==1?'s':''}
            </div>
            {clientesFiltrados.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>👥</div>
                <div style={{ fontSize:'14px' }}>Ainda sem clientes atendidos</div>
              </div>
            ) : clientesFiltrados.map(c => (
              <div key={c.cpf} style={{ background:'#231410', borderRadius:'14px', padding:'14px', border:'1px solid #3A2018', marginBottom:'10px', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>
                  {c.nome?.charAt(0)||'?'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{c.nome}</div>
                  <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>
                    {c.ultimoServico} · {c.ultimaData ? c.ultimaData.split('-').reverse().join('/') : ''}
                  </div>
                </div>
                {c.tel && (
                  <button onClick={() => window.open(`https://wa.me/55${c.tel.replace(/\D/g,'')}`, '_blank')}
                    style={{ padding:'8px 12px', borderRadius:'10px', border:'none', background:'rgba(37,211,102,0.15)', color:'#25D366', fontSize:'12px', cursor:'pointer', fontWeight:'700' }}>
                    📲
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
