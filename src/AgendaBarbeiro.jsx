// AgendaBarbeiro.jsx — Flyguer BarberShop
// ✅ v4: Calendário reativo VERDE para dias com agendamento
//        Lista detalhada diária com nome/hora/serviço
//        Botão ← Voltar para Home visível
//        Sem pré-agendamento

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, setDoc, deleteDoc, serverTimestamp,
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
// ✅ Dias com agendamentos confirmados ficam VERDES
// ✅ Dias com cancelamentos ficam VERMELHOS
// ✅ Misto: amarelo
function CalendarioBarbeiro({ agendamentos, dataSel, onDiaSel }) {
  const agoraDt = new Date();
  const anoHoje = agoraDt.getFullYear();
  const mesHoje = agoraDt.getMonth();
  const hojeStr = mkData(anoHoje, mesHoje, agoraDt.getDate());

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

  // ✅ Mapa de status por dia — só conta confirmados e cancelados
  const mapaDia = React.useMemo(() => {
    const mapa = {};
    agendamentos.forEach(ag => {
      if (!ag.data) return;
      if (!mapa[ag.data]) mapa[ag.data] = { conf: 0, canc: 0 };
      if (['confirmado','pendente','concluido'].includes(ag.status)) mapa[ag.data].conf++;
      else if (ag.status?.includes('cancelado')) mapa[ag.data].canc++;
    });
    return mapa;
  }, [agendamentos]);

  const cells = [];
  for (let i=0; i<primeiroDia; i++) cells.push(null);
  for (let d=1; d<=diasNoMes; d++) cells.push(d);

  return (
    <div style={{ background:'#1A0F0D', borderRadius:'16px', padding:'14px', marginBottom:'12px', border:'1px solid #3A2018' }}>
      {/* Navegação de mês */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <button onClick={()=>navMes(-1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'4px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'18px' }}>{'<'}</button>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'15px', color:'#E8C96A', fontWeight:'700' }}>{MESES[mes]} {ano}</div>
        <button onClick={()=>navMes(1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'4px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'18px' }}>{'>'}</button>
      </div>

      {/* Cabeçalho dias da semana */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', marginBottom:'6px' }}>
        {['D','S','T','Q','Q','S','S'].map((l,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:'10px', color:'#9A8880', fontWeight:'600', padding:'3px 0' }}>{l}</div>
        ))}
      </div>

      {/* Grid de dias */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
        {cells.map((dia, idx) => {
          if (!dia) return <div key={idx} />;
          const dataStr = mkData(ano, mes, dia);
          const info    = mapaDia[dataStr];
          const ehHoje  = dataStr === hojeStr;
          const ehSel   = dataStr === dataSel;
          const temConf = (info?.conf || 0) > 0;
          const temCanc = (info?.canc || 0) > 0;
          const temAg   = temConf || temCanc;

          // ✅ Cor do fundo do dia baseada em agendamentos
          let bgDia = 'transparent';
          let borderDia = '1px solid transparent';
          let corNumero = '#9A8880';
          let corPonto = null;

          if (ehSel) {
            bgDia = '#3A2018';
            borderDia = '1.5px solid #E8C96A';
            corNumero = '#F5EFE6';
          } else if (temConf && temCanc) {
            // Misto: amarelo
            bgDia = 'rgba(255,193,7,0.12)';
            borderDia = '1px solid rgba(255,193,7,0.4)';
            corNumero = '#FFC107';
            corPonto = '#FFC107';
          } else if (temConf) {
            // ✅ VERDE — dia com cliente confirmado
            bgDia = 'rgba(76,175,80,0.15)';
            borderDia = '1px solid rgba(76,175,80,0.5)';
            corNumero = '#4CAF50';
            corPonto = '#4CAF50';
          } else if (temCanc) {
            // Vermelho — só cancelados
            bgDia = 'rgba(244,67,54,0.1)';
            borderDia = '1px solid rgba(244,67,54,0.3)';
            corNumero = '#F44336';
            corPonto = '#F44336';
          } else if (ehHoje) {
            bgDia = 'rgba(232,201,106,0.1)';
            borderDia = '1px solid rgba(232,201,106,0.3)';
            corNumero = '#E8C96A';
          }

          return (
            <div key={idx} onClick={() => onDiaSel(dataStr)}
              style={{ borderRadius:'8px', padding:'6px 2px', textAlign:'center', cursor:'pointer', background:bgDia, border:borderDia, transition:'all 0.15s' }}>
              <div style={{ fontSize:'13px', fontWeight: temAg||ehHoje?'700':'400', color: corNumero }}>{dia}</div>
              {/* Contador de clientes no dia */}
              {temConf && (
                <div style={{ fontSize:'9px', color: corPonto, marginTop:'1px', fontWeight:'700' }}>
                  {info.conf}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div style={{ display:'flex', gap:'12px', marginTop:'10px', paddingTop:'8px', borderTop:'1px solid #2E1A14', flexWrap:'wrap' }}>
        {[
          { cor:'#4CAF50', label:'Com clientes' },
          { cor:'#FFC107', label:'Misto' },
          { cor:'#F44336', label:'Cancelados' },
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

// ─── LISTA DE CLIENTES DO DIA ─────────────────────────────────
// ✅ Lista detalhada: hora · nome · serviço · valor · telefone
function ListaClientesDia({ agendamentos, dataSel, onConcluir, onCancelar }) {
  if (!dataSel) {
    return (
      <div style={{ background:'#231410', borderRadius:'14px', padding:'20px', border:'1px solid #3A2018', textAlign:'center', marginBottom:'12px' }}>
        <div style={{ fontSize:'32px', marginBottom:'8px' }}>👆</div>
        <div style={{ fontSize:'13px', color:'#9A8880' }}>Toque em um dia no calendário para ver os agendamentos</div>
      </div>
    );
  }

  const agsDia = agendamentos
    .filter(ag => ag.data === dataSel)
    .sort((a, b) => (a.hora||'').localeCompare(b.hora||''));

  const confirmados = agsDia.filter(ag => ['confirmado','pendente'].includes(ag.status));
  const cancelados  = agsDia.filter(ag => ag.status?.includes('cancelado'));
  const concluidos  = agsDia.filter(ag => ag.status === 'concluido');

  if (agsDia.length === 0) {
    return (
      <div style={{ background:'#231410', borderRadius:'14px', padding:'20px', border:'1px solid #3A2018', textAlign:'center', marginBottom:'12px' }}>
        <div style={{ fontSize:'32px', marginBottom:'8px' }}>📅</div>
        <div style={{ fontSize:'13px', color:'#9A8880' }}>Nenhum agendamento em {formatarData(dataSel)}</div>
      </div>
    );
  }

  return (
    <div style={{ background:'#231410', borderRadius:'14px', border:'1px solid #3A2018', marginBottom:'12px', overflow:'hidden' }}>
      {/* Cabeçalho da lista */}
      <div style={{ padding:'12px 14px', borderBottom:'1px solid #3A2018', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:'13px', color:'#E8C96A', fontWeight:'700' }}>
          📅 {formatarData(dataSel)}
        </div>
        <div style={{ display:'flex', gap:'10px', fontSize:'12px' }}>
          {confirmados.length > 0 && (
            <span style={{ color:'#4CAF50', fontWeight:'700' }}>✅ {confirmados.length}</span>
          )}
          {concluidos.length > 0 && (
            <span style={{ color:'#2E7D7A', fontWeight:'700' }}>✓ {concluidos.length}</span>
          )}
          {cancelados.length > 0 && (
            <span style={{ color:'#F44336', fontWeight:'700' }}>✗ {cancelados.length}</span>
          )}
        </div>
      </div>

      {/* Cards de cada agendamento */}
      {agsDia.map((ag, idx) => {
        const ehCanc = ag.status?.includes('cancelado');
        const ehConc = ag.status === 'concluido';
        const ehConf = ag.status === 'confirmado' || ag.status === 'pendente';
        const corBarra = ehCanc ? '#F44336' : ehConc ? '#2E7D7A' : '#4CAF50';

        return (
          <div key={ag.firestoreId||idx} style={{
            borderBottom: idx < agsDia.length-1 ? '1px solid #2E1A14' : 'none',
            background: ehCanc ? 'rgba(244,67,54,0.04)' : 'transparent',
          }}>
            {/* Barra colorida lateral */}
            <div style={{ display:'flex' }}>
              <div style={{ width:'3px', background: corBarra, flexShrink:0 }} />
              <div style={{ flex:1, padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
                  {/* Hora */}
                  <div style={{ background: ehCanc?'rgba(244,67,54,0.15)':ehConc?'rgba(46,125,122,0.15)':'rgba(76,175,80,0.12)', borderRadius:'8px', padding:'6px 8px', textAlign:'center', flexShrink:0, minWidth:'48px' }}>
                    <div style={{ fontSize:'14px', fontWeight:'900', color: ehCanc?'#F44336':ehConc?'#2E7D7A':'#4CAF50' }}>{ag.hora}</div>
                  </div>

                  {/* Dados do cliente */}
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                      <div style={{ fontWeight:'700', fontSize:'14px', color: ehCanc?'#F44336':ehConc?'#9A8880':'#F5EFE6' }}>
                        {ag.clienteNome}
                      </div>
                      {ehCanc && <span style={{ fontSize:'10px', color:'#F44336', background:'rgba(244,67,54,0.15)', borderRadius:'4px', padding:'2px 6px' }}>CANCELADO</span>}
                      {ehConc && <span style={{ fontSize:'10px', color:'#2E7D7A', background:'rgba(46,125,122,0.15)', borderRadius:'4px', padding:'2px 6px' }}>CONCLUÍDO</span>}
                    </div>
                    <div style={{ fontSize:'12px', color:'#9A8880' }}>
                      💈 {ag.servico} · {ag.duracao||30}min
                    </div>
                    {ag.valor > 0 && (
                      <div style={{ fontSize:'12px', color:'#E8C96A', marginTop:'2px', fontWeight:'600' }}>
                        R$ {(ag.valor||0).toFixed(2).replace('.',',')}
                      </div>
                    )}
                    {ag.clienteTel && (
                      <div style={{ fontSize:'11px', color:'#2E7D7A', marginTop:'2px' }}>
                        📞 {ag.clienteTel}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px', flexShrink:0 }}>
                    {ehConf && (
                      <button onClick={() => onConcluir(ag)}
                        style={{ padding:'6px 10px', borderRadius:'8px', border:'none', background:'rgba(46,125,122,0.2)', color:'#2E7D7A', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
                        ✓ OK
                      </button>
                    )}
                    {ehConf && (
                      <button onClick={() => onCancelar(ag)}
                        style={{ padding:'6px 10px', borderRadius:'8px', border:'none', background:'rgba(244,67,54,0.15)', color:'#F44336', fontSize:'11px', cursor:'pointer' }}>
                        ✗
                      </button>
                    )}
                    {ag.clienteTel && (
                      <button onClick={() => window.open(`https://wa.me/55${ag.clienteTel.replace(/\D/g,'')}`, '_blank')}
                        style={{ padding:'6px 10px', borderRadius:'8px', border:'1px solid rgba(37,211,102,0.3)', background:'transparent', color:'#25D366', fontSize:'11px', cursor:'pointer' }}>
                        📲
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Resumo do dia */}
      {confirmados.length > 0 && (
        <div style={{ padding:'10px 14px', background:'rgba(76,175,80,0.06)', borderTop:'1px solid #2E1A14' }}>
          <div style={{ fontSize:'11px', color:'#4CAF50', fontWeight:'600' }}>
            ✅ {confirmados.length} cliente{confirmados.length!==1?'s':''} confirmado{confirmados.length!==1?'s':''} hoje
            {confirmados[0]?.valor > 0 ? ` · R$ ${confirmados.reduce((acc,ag)=>acc+(ag.valor||0),0).toFixed(2).replace('.',',')} previstos` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ABA HORÁRIOS / DISPONIBILIDADE ───────────────────────────
function AbaHorarios({ usuario, dataSel, setDataSel, config, slotsBloqueados, setSlotsBloqueados }) {
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

  if (!dataSel) return (
    <div style={{ textAlign:'center', padding:'20px', color:'#9A8880', fontSize:'13px' }}>
      Selecione um dia abaixo
    </div>
  );
  if (!hc?.aberto) return (
    <div style={{ textAlign:'center', padding:'20px', color:'#9A8880', fontSize:'13px' }}>
      Dia fechado conforme configuração da barbearia
    </div>
  );

  const todoBloqueado = slots.every(s => slotsBloqueados.has(s));

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700' }}>
          {formatarData(dataSel)}
        </div>
        <button onClick={bloquearTudo} disabled={salvando}
          style={{ padding:'6px 12px', borderRadius:'8px', border:'1px solid rgba(244,67,54,0.4)', background:todoBloqueado?'rgba(76,175,80,0.15)':'rgba(244,67,54,0.1)', color:todoBloqueado?'#4CAF50':'#F44336', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
          {salvando ? '...' : todoBloqueado ? '🔓 Abrir tudo' : '🔒 Bloquear dia'}
        </button>
      </div>
      <div style={{ fontSize:'11px', color:'#9A8880', marginBottom:'10px' }}>Toque para abrir ou fechar um horário</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
        {slots.map(hora => {
          const bloqueado = slotsBloqueados.has(hora);
          return (
            <div key={hora} onClick={() => toggleSlot(hora)}
              style={{ padding:'12px 4px', borderRadius:'10px', textAlign:'center', cursor:'pointer',
                background: bloqueado ? 'rgba(244,67,54,0.15)' : 'rgba(76,175,80,0.1)',
                border: bloqueado ? '1px solid rgba(244,67,54,0.4)' : '1px solid rgba(76,175,80,0.3)' }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:bloqueado?'#F44336':'#4CAF50' }}>{hora}</div>
              <div style={{ fontSize:'9px', color:bloqueado?'#F44336':'#4CAF50', marginTop:'2px' }}>{bloqueado?'🔒':'✅'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function AgendaBarbeiro({ usuario, onBack, dark }) {
  const s = getStyles(dark);
  const [aba, setAba]                   = React.useState('agenda');
  const [dataSel, setDataSel]           = React.useState(hoje());
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [slotsBloqueados, setSlotsBloqueados] = React.useState(new Set());
  const [config, setConfig]             = React.useState(null);
  const [clientes, setClientes]         = React.useState([]);
  const [buscaCliente, setBuscaCliente] = React.useState('');

  // Carregar config da barbearia
  React.useEffect(() => {
    import('firebase/firestore').then(({ doc: fd, getDoc }) => {
      getDoc(fd(db,'config','barbearia')).then(snap => { if(snap.exists()) setConfig(snap.data()); });
    });
  }, []);

  // ✅ Agendamentos em tempo real — TODOS os meses para pintar o calendário corretamente
  React.useEffect(() => {
    if (!usuario?.id) return;
    const unsub = onSnapshot(
      query(collection(db,'agendamentos'), where('barbeiroId','==',usuario.id)),
      snap => setAgendamentos(snap.docs.map(d=>({ firestoreId:d.id, ...d.data() }))),
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

  // Lista de clientes (aba clientes)
  React.useEffect(() => {
    if (!usuario?.id || aba !== 'clientes') return;
    import('firebase/firestore').then(({ getDocs: gDocs }) => {
      gDocs(query(collection(db,'agendamentos'), where('barbeiroId','==',usuario.id))).then(snap => {
        const mapa = {};
        snap.docs.forEach(d => {
          const ag = d.data();
          if (!ag.clienteCpf || ag.clienteCpf.startsWith('amigo_') || ag.status?.includes('cancelado')) return;
          if (!mapa[ag.clienteCpf] || ag.data > mapa[ag.clienteCpf].ultimaData) {
            mapa[ag.clienteCpf] = { cpf:ag.clienteCpf, nome:ag.clienteNome, tel:ag.clienteTel, ultimoServico:ag.servico, ultimaData:ag.data };
          }
        });
        setClientes(Object.values(mapa).sort((a,b) => (b.ultimaData||'').localeCompare(a.ultimaData||'')));
      });
    });
  }, [usuario?.id, aba]);

  async function handleConcluir(ag) {
    try {
      await updateDoc(doc(db,'agendamentos',ag.firestoreId), { status:'concluido', concluidoEm:serverTimestamp() });
    } catch(e) { console.error(e); }
  }

  async function handleCancelar(ag) {
    try {
      await updateDoc(doc(db,'agendamentos',ag.firestoreId), { status:'cancelado_barbeiro', canceladoEm:serverTimestamp() });
    } catch(e) { console.error(e); }
  }

  const clientesFiltrados = clientes.filter(c =>
    !buscaCliente || c.nome?.toLowerCase().includes(buscaCliente.toLowerCase()) || c.tel?.includes(buscaCliente)
  );

  const disponivel = usuario?.disponivel !== false;

  return (
    <div style={{ ...s.app, paddingBottom:'20px' }}>
      {/* ✅ Header com botão ← Voltar para Home bem visível */}
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
          {/* ✅ Botão voltar */}
          {onBack && (
            <button onClick={onBack}
              style={{ background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'10px', padding:'7px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'13px', fontWeight:'600', display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
              ← Home
            </button>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flex:1 }}>
            <div style={{ width:'38px', height:'38px', borderRadius:'50%', background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>
              {usuario?.nome?.charAt(0)||'B'}
            </div>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'15px', color:'#F5EFE6', fontWeight:'700' }}>{usuario?.nome}</div>
              <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>Minha Agenda</div>
            </div>
          </div>
          {/* Toggle disponível */}
          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 10px', borderRadius:'20px', background:disponivel?'rgba(76,175,80,0.2)':'rgba(255,193,7,0.2)', border:`1px solid ${disponivel?'rgba(76,175,80,0.4)':'rgba(255,193,7,0.4)'}`, cursor:'pointer', flexShrink:0 }}
            onClick={async () => {
              try { await updateDoc(doc(db,'barbeiros',usuario.id), { disponivel:!disponivel }); } catch(e){}
            }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:disponivel?'#4CAF50':'#FFC107' }} />
            <span style={{ fontSize:'11px', fontWeight:'700', color:disponivel?'#4CAF50':'#FFC107' }}>
              {disponivel?'Disponível':'Ocupado'}
            </span>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018' }}>
        {[
          { id:'agenda',   label:'📅 Agenda'   },
          { id:'horarios', label:'✏️ Horários'  },
          { id:'clientes', label:'👥 Clientes'  },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ flex:1, padding:'13px 4px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #E8C96A':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        {/* ─── ABA AGENDA ─── */}
        {aba === 'agenda' && (
          <>
            <CalendarioBarbeiro
              agendamentos={agendamentos}
              dataSel={dataSel}
              onDiaSel={setDataSel}
            />
            <ListaClientesDia
              agendamentos={agendamentos}
              dataSel={dataSel}
              onConcluir={handleConcluir}
              onCancelar={handleCancelar}
            />
          </>
        )}

        {/* ─── ABA HORÁRIOS ─── */}
        {aba === 'horarios' && (
          <>
            {/* Seletor de data horizontal */}
            <div style={{ overflowX:'auto', display:'flex', gap:'8px', paddingBottom:'8px', marginBottom:'16px' }}>
              {Array.from({length:14}, (_,i) => {
                const base = new Date();
                const d = new Date(base.getFullYear(), base.getMonth(), base.getDate()+i);
                const ds = mkData(d.getFullYear(), d.getMonth(), d.getDate());
                const sel = ds === dataSel;
                // ✅ Mostra ponto verde se tem agendamentos no dia
                const temAg = agendamentos.some(ag => ag.data===ds && ['confirmado','pendente'].includes(ag.status));
                return (
                  <div key={ds} onClick={() => setDataSel(ds)}
                    style={{ minWidth:'52px', padding:'8px 6px', borderRadius:'12px', textAlign:'center', cursor:'pointer', background:sel?'#8B3A2A':'#231410', border:sel?'1.5px solid #E8C96A':'1px solid #3A2018', flexShrink:0, position:'relative' }}>
                    <div style={{ fontSize:'10px', color:sel?'#E8C96A':'#9A8880', fontWeight:'600' }}>{DIAS_SEMANA[d.getDay()]}</div>
                    <div style={{ fontSize:'16px', fontWeight:'700', color:'#F5EFE6' }}>{d.getDate()}</div>
                    {temAg && <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#4CAF50', margin:'2px auto 0' }} />}
                  </div>
                );
              })}
            </div>
            <AbaHorarios
              usuario={usuario}
              dataSel={dataSel}
              setDataSel={setDataSel}
              config={config}
              slotsBloqueados={slotsBloqueados}
              setSlotsBloqueados={setSlotsBloqueados}
            />
          </>
        )}

        {/* ─── ABA CLIENTES ─── */}
        {aba === 'clientes' && (
          <>
            <div style={{ marginBottom:'14px' }}>
              <input type="text" placeholder="🔍 Buscar cliente..." value={buscaCliente}
                onChange={e => setBuscaCliente(e.target.value)}
                style={{ width:'100%', background:'#231410', border:'1px solid #3A2018', borderRadius:'12px', padding:'10px 14px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
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
