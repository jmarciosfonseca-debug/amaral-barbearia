// AgendaBarbeiro.jsx — Flyguer BarberShop v5
// ✅ 5 abas: Agenda | Horários | Clientes | Perfil | Avaliações
// ✅ Calendário verde reativo | Lista detalhada diária
// ✅ Divulgar Horário Vago via WhatsApp deep link
// ✅ Perfil com blocos dinâmicos (Cursos, Certs, Novidades, Especialidades)
// ✅ Mural de avaliações reais

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, onSnapshot, doc,
  updateDoc, setDoc, deleteDoc, getDoc, getDocs,
  serverTimestamp, addDoc,
} from 'firebase/firestore';
import { getStyles } from './getStyles';
import CaptarClientes from './CaptarClientes';

const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DIAS_KEYS   = ['dom','seg','ter','qua','qui','sex','sab'];
const MESES       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatarData(s) {
  if (!s) return '';
  const [a,m,d] = s.split('-');
  return `${d}/${m}/${a}`;
}
function mkData(a,m,d) {
  return `${a}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function notaMedia(avs) {
  if (!avs?.length) return 0;
  return (avs.reduce((s,a)=>s+(a.nota||0),0)/avs.length).toFixed(1);
}
function estrelas(nota) {
  return '⭐'.repeat(Math.round(nota)) + '☆'.repeat(5-Math.round(nota));
}

// ─── GERADOR DE DEEP LINK ─────────────────────────────────────
function gerarDeepLink(barbeiroId, data, hora) {
  const base = 'https://flyguer-barbershop.vercel.app';
  return `${base}?barbeiro=${barbeiroId}&data=${data}&hora=${encodeURIComponent(hora)}`;
}

// ─── CALENDÁRIO REATIVO ───────────────────────────────────────
function CalendarioBarbeiro({ agendamentos, dataSel, onDiaSel }) {
  const agora   = new Date();
  const anoHoje = agora.getFullYear();
  const mesHoje = agora.getMonth();
  const hojeStr = mkData(anoHoje, mesHoje, agora.getDate());
  const [mes, setMes] = React.useState(mesHoje);
  const [ano, setAno] = React.useState(anoHoje);

  function navMes(dir) {
    let nm=mes+dir, na=ano;
    if(nm<0){nm=11;na--;} if(nm>11){nm=0;na++;}
    setMes(nm); setAno(na);
  }

  const mapaDia = React.useMemo(() => {
    const m = {};
    agendamentos.forEach(ag => {
      if (!ag.data) return;
      if (!m[ag.data]) m[ag.data] = { conf:0, canc:0 };
      if (['confirmado','pendente','concluido'].includes(ag.status)) m[ag.data].conf++;
      else if (ag.status?.includes('cancelado')) m[ag.data].canc++;
    });
    return m;
  }, [agendamentos]);

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes   = new Date(ano, mes+1, 0).getDate();
  const cells = [];
  for (let i=0;i<primeiroDia;i++) cells.push(null);
  for (let d=1;d<=diasNoMes;d++) cells.push(d);

  return (
    <div style={{ background:'#1A0F0D', borderRadius:'16px', padding:'14px', marginBottom:'12px', border:'1px solid #3A2018' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
        <button onClick={()=>navMes(-1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'4px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'18px' }}>{'<'}</button>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'15px', color:'#E8C96A', fontWeight:'700' }}>{MESES[mes]} {ano}</div>
        <button onClick={()=>navMes(1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'4px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'18px' }}>{'>'}</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', marginBottom:'6px' }}>
        {['D','S','T','Q','Q','S','S'].map((l,i)=>(
          <div key={i} style={{ textAlign:'center', fontSize:'10px', color:'#9A8880', fontWeight:'600', padding:'3px 0' }}>{l}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
        {cells.map((dia,idx) => {
          if (!dia) return <div key={idx}/>;
          const ds = mkData(ano,mes,dia);
          const info = mapaDia[ds];
          const ehHoje = ds===hojeStr, ehSel = ds===dataSel;
          const temConf=info?.conf>0, temCanc=info?.canc>0;
          let bg='transparent', border='1px solid transparent', cor='#9A8880';
          if(ehSel){bg='#3A2018';border='1.5px solid #E8C96A';cor='#F5EFE6';}
          else if(temConf&&temCanc){bg='rgba(255,193,7,0.12)';border='1px solid rgba(255,193,7,0.4)';cor='#FFC107';}
          else if(temConf){bg='rgba(76,175,80,0.15)';border='1px solid rgba(76,175,80,0.5)';cor='#4CAF50';}
          else if(temCanc){bg='rgba(244,67,54,0.1)';border='1px solid rgba(244,67,54,0.3)';cor='#F44336';}
          else if(ehHoje){bg='rgba(232,201,106,0.1)';border='1px solid rgba(232,201,106,0.3)';cor='#E8C96A';}
          return (
            <div key={idx} onClick={()=>onDiaSel(ds)}
              style={{ borderRadius:'8px', padding:'6px 2px', textAlign:'center', cursor:'pointer', background:bg, border }}>
              <div style={{ fontSize:'13px', fontWeight:temConf||ehHoje?'700':'400', color:cor }}>{dia}</div>
              {info?.conf>0 && <div style={{ fontSize:'9px', color:cor, fontWeight:'700' }}>{info.conf}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:'10px', marginTop:'10px', paddingTop:'8px', borderTop:'1px solid #2E1A14' }}>
        {[['#4CAF50','Com clientes'],['#FFC107','Misto'],['#F44336','Cancelados']].map(([c,l])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'#9A8880' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:c }}/>{l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LISTA DO DIA + DIVULGAR HORÁRIO VAGO ─────────────────────
function ListaClientesDia({ agendamentos, dataSel, config, usuario, onConcluir, onCancelar, onArquivar }) {
  const [divulgando, setDivulgando] = React.useState(null); // hora do slot sendo divulgado
  const [linkCopiado, setLinkCopiado] = React.useState(false);

  if (!dataSel) return (
    <div style={{ background:'#231410', borderRadius:'14px', padding:'20px', border:'1px solid #3A2018', textAlign:'center', marginBottom:'12px' }}>
      <div style={{ fontSize:'32px', marginBottom:'8px' }}>👆</div>
      <div style={{ fontSize:'13px', color:'#9A8880' }}>Toque em um dia no calendário</div>
    </div>
  );

  // ✅ Filtro local: exclui arquivados da agenda diária (doc preservado no Firestore)
  const agsDia = agendamentos.filter(ag=>ag.data===dataSel && !ag.arquivado).sort((a,b)=>a.hora?.localeCompare(b.hora));

  // Gerar todos os slots do dia para mostrar vagos também
  const diaSem = DIAS_KEYS[new Date(dataSel+'T12:00:00').getDay()];
  const hc = config?.horarios?.[diaSem];
  const todosSlots = React.useMemo(() => {
    if (!hc?.aberto) return [];
    const slots = [];
    const [hA,mA] = hc.abertura.split(':').map(Number);
    const [hF,mF] = hc.fechamento.split(':').map(Number);
    let atual=hA*60+mA, fim=hF*60+mF;
    while (atual+30<=fim) {
      slots.push(`${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`);
      atual+=30;
    }
    return slots;
  }, [dataSel, config]);

  const horasOcupadas = new Set(agsDia.filter(ag=>['confirmado','pendente'].includes(ag.status)).map(ag=>ag.hora));

  function handleDivulgar(hora) {
    const link = gerarDeepLink(usuario.id, dataSel, hora);
    const msg  = encodeURIComponent(
      `✂️ *Horário disponível!*\n\n` +
      `🗓 ${formatarData(dataSel)} às ${hora}\n` +
      `✂️ Barbeiro: ${usuario.nome}\n\n` +
      `Clique para agendar em 1 toque:\n${link}\n\n` +
      `_Flyguer BarberShop — Shopping Cidade das Artes, Piso 2, Nº 22_`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
    setDivulgando(hora);
    setTimeout(() => setDivulgando(null), 3000);
  }

  function handleCopiarLink(hora) {
    const link = gerarDeepLink(usuario.id, dataSel, hora);
    navigator.clipboard?.writeText(link);
    setLinkCopiado(hora);
    setTimeout(() => setLinkCopiado(null), 2000);
  }

  return (
    <div style={{ background:'#231410', borderRadius:'14px', border:'1px solid #3A2018', marginBottom:'12px', overflow:'hidden' }}>
      <div style={{ padding:'12px 14px', borderBottom:'1px solid #3A2018', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:'13px', color:'#E8C96A', fontWeight:'700' }}>📅 {formatarData(dataSel)}</div>
        <div style={{ fontSize:'11px', color:'#9A8880' }}>
          {agsDia.filter(a=>['confirmado','pendente'].includes(a.status)).length} confirmados
        </div>
      </div>

      {/* Agendamentos confirmados do dia */}
      {agsDia.map((ag,idx) => {
        const ehCanc = ag.status?.includes('cancelado');
        const ehConc = ag.status==='concluido';
        const ehConf = ['confirmado','pendente'].includes(ag.status);
        const corBarra = ehCanc?'#F44336':ehConc?'#2E7D7A':'#4CAF50';
        return (
          <div key={ag.firestoreId||idx} style={{ borderBottom:'1px solid #2E1A14', display:'flex' }}>
            <div style={{ width:'3px', background:corBarra, flexShrink:0 }}/>
            <div style={{ flex:1, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
                <div style={{ background:ehCanc?'rgba(244,67,54,0.15)':ehConc?'rgba(46,125,122,0.15)':'rgba(76,175,80,0.12)', borderRadius:'8px', padding:'6px 8px', textAlign:'center', minWidth:'48px', flexShrink:0 }}>
                  <div style={{ fontSize:'13px', fontWeight:'900', color:ehCanc?'#F44336':ehConc?'#2E7D7A':'#4CAF50' }}>{ag.hora}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'700', fontSize:'14px', color:ehCanc?'#F44336':'#F5EFE6' }}>
                    {ag.clienteNome}{ehCanc?' — CANCELADO':''}
                  </div>
                  <div style={{ fontSize:'12px', color:'#9A8880' }}>💈 {ag.servico} · {ag.duracao||30}min</div>
                  {ag.valor>0 && <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'600' }}>R$ {(ag.valor||0).toFixed(2).replace('.',',')}</div>}
                  {ag.clienteTel && <div style={{ fontSize:'11px', color:'#2E7D7A' }}>📞 {ag.clienteTel}</div>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'4px', flexShrink:0 }}>
                  {ehConf && <button onClick={()=>onConcluir(ag)} style={{ padding:'5px 8px', borderRadius:'8px', border:'none', background:'rgba(46,125,122,0.2)', color:'#2E7D7A', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>✓</button>}
                  {ehConf && <button onClick={()=>onCancelar(ag)} style={{ padding:'5px 8px', borderRadius:'8px', border:'none', background:'rgba(244,67,54,0.15)', color:'#F44336', fontSize:'11px', cursor:'pointer' }}>✗</button>}
                  {/* ✅ Cancelado: botão Arquivar em vez de WhatsApp */}
                  {ehCanc && (
                    <button onClick={()=>onArquivar(ag)}
                      title="Arquivar — some da agenda, permanece no histórico"
                      style={{ padding:'5px 8px', borderRadius:'8px', border:'1px solid rgba(155,155,155,0.25)', background:'rgba(155,155,155,0.08)', color:'#777', fontSize:'11px', cursor:'pointer' }}>
                      📦
                    </button>
                  )}
                  {/* ✅ WhatsApp só para confirmados/concluídos */}
                  {!ehCanc && ag.clienteTel && <button onClick={()=>window.open(`https://wa.me/55${ag.clienteTel.replace(/\D/g,'')}`,  '_blank')} style={{ padding:'5px 8px', borderRadius:'8px', border:'1px solid rgba(37,211,102,0.3)', background:'transparent', color:'#25D366', fontSize:'11px', cursor:'pointer' }}>📲</button>}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ✅ Slots vagos com botão "Divulgar" */}
      {hc?.aberto && todosSlots.filter(h=>!horasOcupadas.has(h)).length > 0 && (
        <div style={{ padding:'12px 14px', borderTop:'1px solid #2E1A14' }}>
          <div style={{ fontSize:'11px', color:'#9A8880', fontWeight:'600', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px' }}>
            📤 Horários vagos — divulgar
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
            {todosSlots.filter(h=>!horasOcupadas.has(h)).map(hora=>(
              <div key={hora} style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                <div style={{ padding:'5px 8px', borderRadius:'8px', background:'rgba(46,125,122,0.08)', border:'1px solid rgba(46,125,122,0.2)', fontSize:'12px', color:'#2E7D7A', fontWeight:'600' }}>{hora}</div>
                <button onClick={()=>handleDivulgar(hora)}
                  style={{ padding:'5px 10px', borderRadius:'8px', border:'none', background:divulgando===hora?'rgba(37,211,102,0.3)':'rgba(37,211,102,0.15)', color:'#25D366', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
                  {divulgando===hora?'✅':'📤'}
                </button>
                <button onClick={()=>handleCopiarLink(hora)}
                  style={{ padding:'5px 10px', borderRadius:'8px', border:'1px solid rgba(46,125,122,0.2)', background:'transparent', color:'#2E7D7A', fontSize:'11px', cursor:'pointer' }}>
                  {linkCopiado===hora?'✅':'🔗'}
                </button>
              </div>
            ))}
          </div>
          <div style={{ fontSize:'10px', color:'#555', marginTop:'8px' }}>
            📤 = enviar pelo WhatsApp · 🔗 = copiar link
          </div>
        </div>
      )}

      {agsDia.length===0 && !hc?.aberto && (
        <div style={{ padding:'20px', textAlign:'center', color:'#9A8880', fontSize:'13px' }}>Dia fechado</div>
      )}
      {agsDia.length===0 && hc?.aberto && (
        <div style={{ padding:'12px 14px', color:'#9A8880', fontSize:'13px', textAlign:'center' }}>Nenhum cliente agendado</div>
      )}
    </div>
  );
}

// ─── ABA HORÁRIOS ─────────────────────────────────────────────
function AbaHorarios({ usuario, dataSel, setDataSel, config, slotsBloqueados, setSlotsBloqueados, agendamentos }) {
  const [salvando, setSalvando] = React.useState(false);

  const diaSem = dataSel ? DIAS_KEYS[new Date(dataSel+'T12:00:00').getDay()] : null;
  const hc = diaSem && config?.horarios?.[diaSem];

  const gerarSlots = () => {
    if (!hc?.aberto) return [];
    const slots=[];
    const [hA,mA]=hc.abertura.split(':').map(Number);
    const [hF,mF]=hc.fechamento.split(':').map(Number);
    let atual=hA*60+mA, fim=hF*60+mF;
    while(atual+30<=fim){
      slots.push(`${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`);
      atual+=30;
    }
    return slots;
  };
  const slots=gerarSlots();
  const horasOcupadas = new Set(
    agendamentos.filter(ag=>ag.data===dataSel&&['confirmado','pendente'].includes(ag.status)).map(ag=>ag.hora)
  );

  async function toggleSlot(hora) {
    if(!usuario?.id||!dataSel) return;
    const id=`${usuario.id}_${dataSel}_${hora}`;
    if(slotsBloqueados.has(hora)){
      await deleteDoc(doc(db,'slots_bloqueados',id));
      setSlotsBloqueados(prev=>{const n=new Set(prev);n.delete(hora);return n;});
    } else {
      await setDoc(doc(db,'slots_bloqueados',id),{barbeiroId:usuario.id,data:dataSel,hora});
      setSlotsBloqueados(prev=>new Set([...prev,hora]));
    }
  }

  async function bloquearTudo() {
    if(!usuario?.id||!dataSel) return;
    setSalvando(true);
    const jaBloq=slots.every(s=>slotsBloqueados.has(s));
    for(const hora of slots){
      const id=`${usuario.id}_${dataSel}_${hora}`;
      if(jaBloq) await deleteDoc(doc(db,'slots_bloqueados',id));
      else await setDoc(doc(db,'slots_bloqueados',id),{barbeiroId:usuario.id,data:dataSel,hora});
    }
    setSlotsBloqueados(jaBloq?new Set():new Set(slots));
    setSalvando(false);
  }

  const todoBloqueado=slots.every(s=>slotsBloqueados.has(s));

  return (
    <div>
      {/* Seletor de data */}
      <div style={{ overflowX:'auto', display:'flex', gap:'8px', paddingBottom:'8px', marginBottom:'16px' }}>
        {Array.from({length:14},(_,i)=>{
          const base=new Date();
          const d=new Date(base.getFullYear(),base.getMonth(),base.getDate()+i);
          const ds=mkData(d.getFullYear(),d.getMonth(),d.getDate());
          const sel=ds===dataSel;
          const temAg=agendamentos.some(ag=>ag.data===ds&&['confirmado','pendente'].includes(ag.status));
          return (
            <div key={ds} onClick={()=>setDataSel(ds)}
              style={{ minWidth:'52px', padding:'8px 6px', borderRadius:'12px', textAlign:'center', cursor:'pointer', background:sel?'#8B3A2A':'#231410', border:sel?'1.5px solid #E8C96A':'1px solid #3A2018', flexShrink:0, position:'relative' }}>
              <div style={{ fontSize:'10px', color:sel?'#E8C96A':'#9A8880', fontWeight:'600' }}>{DIAS_SEMANA[d.getDay()]}</div>
              <div style={{ fontSize:'16px', fontWeight:'700', color:'#F5EFE6' }}>{d.getDate()}</div>
              {temAg&&<div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#4CAF50', margin:'2px auto 0' }}/>}
            </div>
          );
        })}
      </div>

      {!dataSel && <div style={{ textAlign:'center', padding:'20px', color:'#9A8880' }}>Selecione um dia acima</div>}
      {dataSel && !hc?.aberto && <div style={{ textAlign:'center', padding:'20px', color:'#9A8880' }}>Dia fechado conforme config da barbearia</div>}
      {dataSel && hc?.aberto && (
        <>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700' }}>{formatarData(dataSel)}</div>
            <button onClick={bloquearTudo} disabled={salvando}
              style={{ padding:'6px 12px', borderRadius:'8px', border:`1px solid ${todoBloqueado?'rgba(76,175,80,0.4)':'rgba(244,67,54,0.4)'}`, background:todoBloqueado?'rgba(76,175,80,0.1)':'rgba(244,67,54,0.1)', color:todoBloqueado?'#4CAF50':'#F44336', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
              {salvando?'...':todoBloqueado?'🔓 Abrir tudo':'🔒 Bloquear dia'}
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
            {slots.map(hora=>{
              const bloq=slotsBloqueados.has(hora);
              const ocup=horasOcupadas.has(hora);
              return (
                <div key={hora} onClick={()=>!ocup&&toggleSlot(hora)}
                  style={{ padding:'10px 4px', borderRadius:'10px', textAlign:'center', cursor:ocup?'default':'pointer',
                    background:ocup?'rgba(232,201,106,0.1)':bloq?'rgba(244,67,54,0.12)':'rgba(76,175,80,0.1)',
                    border:ocup?'1px solid rgba(232,201,106,0.3)':bloq?'1px solid rgba(244,67,54,0.4)':'1px solid rgba(76,175,80,0.3)' }}>
                  <div style={{ fontSize:'13px', fontWeight:'700', color:ocup?'#E8C96A':bloq?'#F44336':'#4CAF50' }}>{hora}</div>
                  <div style={{ fontSize:'9px', color:ocup?'#E8C96A':bloq?'#F44336':'#4CAF50', marginTop:'2px' }}>
                    {ocup?'👤':bloq?'🔒':'✅'}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', gap:'12px', marginTop:'12px', fontSize:'10px', color:'#9A8880' }}>
            {[['#4CAF50','✅ Livre'],['#F44336','🔒 Bloqueado'],['#E8C96A','👤 Ocupado']].map(([c,l])=>(
              <div key={l} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:c }}/>{l}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ABA CLIENTES ─────────────────────────────────────────────
function AbaClientes({ usuario }) {
  const [clientes, setClientes]   = React.useState([]);
  const [busca, setBusca]         = React.useState('');
  const [carregando, setCarr]     = React.useState(true);

  React.useEffect(()=>{
    if(!usuario?.id) return;
    getDocs(query(collection(db,'agendamentos'),where('barbeiroId','==',usuario.id))).then(snap=>{
      const mapa={};
      snap.docs.forEach(d=>{
        const ag=d.data();
        if(!ag.clienteCpf||ag.clienteCpf.startsWith('amigo_')||ag.status?.includes('cancelado')) return;
        const chave=ag.clienteCpf;
        if(!mapa[chave]||ag.data>(mapa[chave].ultimaData||'')) {
          mapa[chave]={cpf:chave,nome:ag.clienteNome,tel:ag.clienteTel,ultimoServico:ag.servico,ultimaData:ag.data,total:(mapa[chave]?.total||0)+1};
        } else {
          mapa[chave].total=(mapa[chave].total||0)+1;
        }
      });
      setClientes(Object.values(mapa).sort((a,b)=>(b.ultimaData||'').localeCompare(a.ultimaData||'')));
      setCarr(false);
    });
  },[usuario?.id]);

  const filtrados=clientes.filter(c=>!busca||c.nome?.toLowerCase().includes(busca.toLowerCase())||c.tel?.includes(busca));

  return (
    <div>
      <input type="text" placeholder="🔍 Buscar cliente..." value={busca} onChange={e=>setBusca(e.target.value)}
        style={{ width:'100%', background:'#231410', border:'1px solid #3A2018', borderRadius:'12px', padding:'10px 14px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box', marginBottom:'12px' }}/>
      <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'12px' }}>
        👥 {filtrados.length} cliente{filtrados.length!==1?'s':''} atendido{filtrados.length!==1?'s':''}
      </div>
      {carregando ? <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳</div>
      : filtrados.length===0 ? (
        <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>👥</div>
          <div>Ainda sem clientes atendidos</div>
        </div>
      ) : filtrados.map(c=>(
        <div key={c.cpf} style={{ background:'#231410', borderRadius:'14px', padding:'14px', border:'1px solid #3A2018', marginBottom:'10px', display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>
            {c.nome?.charAt(0)||'?'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{c.nome}</div>
            <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>
              {c.ultimoServico} · {c.ultimaData?.split('-').reverse().join('/')}
            </div>
            <div style={{ fontSize:'10px', color:'#555', marginTop:'2px' }}>{c.total} visita{c.total!==1?'s':''}</div>
          </div>
          {c.tel && (
            <button onClick={()=>window.open(`https://wa.me/55${c.tel.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${c.nome?.split(' ')[0]}! Aqui é ${usuario.nome} da Flyguer BarberShop. Tudo bem? 😊`)}`, '_blank')}
              style={{ padding:'8px 12px', borderRadius:'10px', border:'none', background:'rgba(37,211,102,0.15)', color:'#25D366', fontSize:'12px', cursor:'pointer', fontWeight:'700' }}>
              📲
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── ABA PERFIL ───────────────────────────────────────────────
const TIPOS_BLOCO = [
  { id:'especialidade', label:'✂️ Especialidade', cor:'#E8C96A' },
  { id:'curso',         label:'📚 Curso',         cor:'#2E7D7A' },
  { id:'certificado',   label:'🏆 Certificado',   cor:'#4CAF50' },
  { id:'novidade',      label:'🔥 Novidade',      cor:'#F44336' },
];

function AbaPerfil({ usuario }) {
  const [dados, setDados]         = React.useState({ bio:'', blocos:[], links:[], foto:null });
  const [fotoAmpliada, setFoto]   = React.useState(false);
  const [salvando, setSalv]       = React.useState(false);
  const [salvo, setSalvo]         = React.useState(false);
  const [novoBloco, setNovoBloco] = React.useState({ tipo:'especialidade', titulo:'', descricao:'' });
  const [adicionandoBloco, setAdd]= React.useState(false);
  const [adicionandoLink, setAddLink] = React.useState(false);
  const [novoLink, setNovoLink]   = React.useState({ rede:'instagram', handle:'', url:'' });
  const [stats, setStats]         = React.useState({ total:0, nota:0, faturado:0 });

  const REDES = [
    { id:'instagram', label:'Instagram', icon:'📸', prefix:'https://instagram.com/' },
    { id:'tiktok',    label:'TikTok',    icon:'▶️', prefix:'https://tiktok.com/@' },
    { id:'facebook',  label:'Facebook',  icon:'👤', prefix:'https://facebook.com/' },
    { id:'youtube',   label:'YouTube',   icon:'🎬', prefix:'https://youtube.com/@' },
    { id:'whatsapp',  label:'WhatsApp',  icon:'📲', prefix:'https://wa.me/55' },
    { id:'site',      label:'Site',      icon:'🌐', prefix:'' },
  ];

  // Carrega perfil do barbeiro
  React.useEffect(()=>{
    if(!usuario?.id) return;
    getDoc(doc(db,'barbeiros',usuario.id)).then(snap=>{
      if(snap.exists()){
        const d=snap.data();
        setDados({ bio:d.bio||'', blocos:d.blocos||[], links:d.links||[], foto:d.foto||null });
      }
    });
    // Stats privados — só o barbeiro vê
    getDocs(query(collection(db,'agendamentos'),where('barbeiroId','==',usuario.id))).then(snap=>{
      const ags=snap.docs.map(d=>d.data());
      const conc=ags.filter(a=>a.status==='concluido');
      const avSnap=getDocs(query(collection(db,'avaliacoes'),where('barbeiroId','==',usuario.id))).then(av=>{
        const avs=av.docs.map(d=>d.data());
        const nota=avs.length?avs.reduce((s,a)=>s+(a.nota||0),0)/avs.length:0;
        setStats({
          total:conc.length,
          nota:nota.toFixed(1),
          faturado:conc.reduce((s,a)=>s+(a.valor||0),0),
        });
      });
    });
  },[usuario?.id]);

  async function salvarPerfil() {
    if(!usuario?.id) return;
    setSalv(true);
    try {
      await updateDoc(doc(db,'barbeiros',usuario.id),{
        bio:dados.bio, blocos:dados.blocos, links:dados.links,
        atualizadoEm:serverTimestamp()
      });
      setSalvo(true); setTimeout(()=>setSalvo(false),2500);
    } catch(e){console.error(e);}
    setSalv(false);
  }

  // Foto upload
  function handleFotoUpload(e) {
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const img=new Image();
      img.onload=()=>{
        const canvas=document.createElement('canvas');
        const max=400; let w=img.width,h=img.height;
        if(w>h){if(w>max){h=h*max/w;w=max;}}else{if(h>max){w=w*max/h;h=max;}}
        canvas.width=w;canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        const b64=canvas.toDataURL('image/jpeg',0.7);
        setDados(d=>({...d,foto:b64}));
        if(usuario?.id) updateDoc(doc(db,'barbeiros',usuario.id),{foto:b64}).catch(console.error);
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Blocos
  function toggleVisivel(idx){setDados(d=>({...d,blocos:d.blocos.map((b,i)=>i===idx?{...b,visivel:!b.visivel}:b)}));}
  function removerBloco(idx){setDados(d=>({...d,blocos:d.blocos.filter((_,i)=>i!==idx)}));}
  function adicionarBloco(){
    if(!novoBloco.titulo.trim())return;
    setDados(d=>({...d,blocos:[...d.blocos,{...novoBloco,visivel:true,id:Date.now()}]}));
    setNovoBloco({tipo:'especialidade',titulo:'',descricao:''});setAdd(false);
  }

  // Links
  function adicionarLink(){
    if(!novoLink.handle.trim())return;
    const rede=REDES.find(r=>r.id===novoLink.rede);
    // ✅ Se o handle já é uma URL completa (começa com http), usa direto sem concatenar prefixo
    const handle=novoLink.handle.trim();
    const url=handle.startsWith('http')?handle:novoLink.rede==='site'?handle:(rede.prefix+handle.replace('@',''));
    setDados(d=>({...d,links:[...d.links,{...novoLink,url,id:Date.now()}]}));
    setNovoLink({rede:'instagram',handle:'',url:''});setAddLink(false);
  }
  function removerLink(idx){setDados(d=>({...d,links:d.links.filter((_,i)=>i!==idx)}));}

  const inp={width:'100%',background:'#2E1A14',border:'1px solid #3A2018',borderRadius:'10px',padding:'10px 12px',color:'#F5EFE6',fontSize:'14px',outline:'none',boxSizing:'border-box'};

  return (
    <div style={{paddingBottom:'20px'}}>

      {/* ── FOTO ── */}
      <div style={{textAlign:'center',marginBottom:'20px'}}>
        <div style={{position:'relative',display:'inline-block'}}>
          <div onClick={()=>dados.foto&&setFoto(true)}
            style={{width:'96px',height:'96px',borderRadius:'50%',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',border:'3px solid #E8C96A',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'38px',fontWeight:'700',color:'#F5EFE6',cursor:dados.foto?'pointer':'default',margin:'0 auto'}}>
            {dados.foto?<img src={dados.foto} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:usuario?.nome?.charAt(0)}
          </div>
          <label style={{position:'absolute',bottom:'2px',right:'2px',background:'#E8C96A',borderRadius:'50%',width:'26px',height:'26px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',cursor:'pointer'}}>
            📷<input type="file" accept="image/*" onChange={handleFotoUpload} style={{display:'none'}}/>
          </label>
        </div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'18px',color:'#F5EFE6',marginTop:'10px'}}>{usuario?.nome}</div>
        <div style={{fontSize:'12px',color:'#9A8880'}}>{usuario?.cargo||'Barbeiro'}</div>
        {dados.foto&&<div style={{fontSize:'10px',color:'#555',marginTop:'4px'}}>Toque na foto para ampliar</div>}
      </div>

      {/* ── STATS PRIVADOS ── */}
      <div style={{background:'linear-gradient(135deg,#1A0F0D,#2E1A14)',borderRadius:'14px',padding:'14px',border:'1px solid #3A2018',marginBottom:'16px'}}>
        <div style={{fontSize:'10px',color:'#555',fontWeight:'600',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px'}}>
          🔒 Meu desempenho (somente você vê)
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
          {[
            {label:'Atendimentos',value:stats.total,cor:'#E8C96A'},
            {label:'Nota média',  value:stats.nota>0?stats.nota:'—',cor:'#4CAF50'},
            {label:'Faturado',    value:`R$${(stats.faturado/1000).toFixed(1)}k`,cor:'#2E7D7A'},
          ].map(s=>(
            <div key={s.label} style={{background:'#231410',borderRadius:'10px',padding:'10px',textAlign:'center',border:'1px solid #3A2018'}}>
              <div style={{fontSize:'16px',fontWeight:'700',color:s.cor}}>{s.value}</div>
              <div style={{fontSize:'9px',color:'#9A8880',marginTop:'2px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BIO ── */}
      <div style={{background:'#231410',borderRadius:'14px',padding:'14px',border:'1px solid #3A2018',marginBottom:'12px'}}>
        <label style={{fontSize:'10px',color:'#E8C96A',display:'block',marginBottom:'8px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px'}}>
          Bio pública — visível para clientes
        </label>
        <textarea value={dados.bio} onChange={e=>setDados(d=>({...d,bio:e.target.value}))}
          placeholder="Conte sobre você, sua experiência e estilo de trabalho..."
          rows={4} style={{...inp,resize:'vertical',fontFamily:'inherit',lineHeight:'1.6'}}/>
      </div>

      {/* ── REDES SOCIAIS & LINKS ── */}
      <div style={{background:'#231410',borderRadius:'14px',padding:'14px',border:'1px solid #3A2018',marginBottom:'12px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
          <label style={{fontSize:'10px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px'}}>
            Redes sociais & links
          </label>
          <button onClick={()=>setAddLink(!adicionandoLink)}
            style={{padding:'4px 10px',borderRadius:'8px',border:'1px solid rgba(232,201,106,0.3)',background:'rgba(232,201,106,0.1)',color:'#E8C96A',fontSize:'11px',fontWeight:'700',cursor:'pointer'}}>
            {adicionandoLink?'✕ Cancelar':'+ Adicionar'}
          </button>
        </div>

        {adicionandoLink&&(
          <div style={{background:'#2E1A14',borderRadius:'12px',padding:'12px',border:'1px solid rgba(232,201,106,0.2)',marginBottom:'10px'}}>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'10px'}}>
              {REDES.map(r=>(
                <button key={r.id} onClick={()=>setNovoLink(l=>({...l,rede:r.id,handle:''}))}
                  style={{padding:'5px 10px',borderRadius:'8px',border:`1px solid ${novoLink.rede===r.id?'#E8C96A':'#3A2018'}`,background:novoLink.rede===r.id?'rgba(232,201,106,0.15)':'transparent',color:novoLink.rede===r.id?'#E8C96A':'#9A8880',fontSize:'12px',cursor:'pointer'}}>
                  {r.icon} {r.label}
                </button>
              ))}
            </div>
            <input type="text"
              placeholder={novoLink.rede==='site'?'https://meusite.com.br':novoLink.rede==='whatsapp'?'11999999999':'@seu_usuario'}
              value={novoLink.handle}
              onChange={e=>setNovoLink(l=>({...l,handle:e.target.value}))}
              style={{...inp,marginBottom:'8px'}}/>
            <button onClick={adicionarLink}
              style={{width:'100%',padding:'10px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',color:'#F5EFE6',fontWeight:'700',fontSize:'13px',cursor:'pointer'}}>
              ✅ Adicionar link
            </button>
          </div>
        )}

        {dados.links.length===0?(
          <div style={{textAlign:'center',padding:'16px',color:'#555',fontSize:'12px',border:'1px dashed #3A2018',borderRadius:'10px'}}>
            Adicione seus perfis para que clientes possam seguir você
          </div>
        ):dados.links.map((link,idx)=>{
          const rede=REDES.find(r=>r.id===link.rede)||{icon:'🌐',label:'Link'};
          return(
            <div key={link.id||idx} style={{display:'flex',alignItems:'center',gap:'10px',background:'#2E1A14',borderRadius:'10px',padding:'10px 12px',border:'1px solid #3A2018',marginBottom:'6px'}}>
              <div style={{fontSize:'20px',flexShrink:0}}>{rede.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:'11px',color:'#E8C96A',fontWeight:'600'}}>{rede.label}</div>
                <div style={{fontSize:'12px',color:'#F5EFE6',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'200px'}}>{link.handle}</div>
              </div>
              <button onClick={()=>window.open(link.url,'_blank')}
                style={{padding:'4px 8px',borderRadius:'6px',border:'1px solid #3A2018',background:'transparent',color:'#2E7D7A',fontSize:'11px',cursor:'pointer'}}>
                🔗
              </button>
              <button onClick={()=>removerLink(idx)}
                style={{padding:'4px 8px',borderRadius:'6px',border:'none',background:'rgba(244,67,54,0.1)',color:'#F44336',fontSize:'11px',cursor:'pointer'}}>
                🗑
              </button>
            </div>
          );
        })}
      </div>

      {/* ── ESPECIALIDADES & FORMAÇÃO ── */}
      <div style={{background:'#231410',borderRadius:'14px',padding:'14px',border:'1px solid #3A2018',marginBottom:'12px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
          <label style={{fontSize:'10px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px'}}>
            Especialidades & Formação
          </label>
          <button onClick={()=>setAdd(!adicionandoBloco)}
            style={{padding:'4px 10px',borderRadius:'8px',border:'1px solid rgba(232,201,106,0.3)',background:'rgba(232,201,106,0.1)',color:'#E8C96A',fontSize:'11px',fontWeight:'700',cursor:'pointer'}}>
            {adicionandoBloco?'✕ Cancelar':'+ Novo bloco'}
          </button>
        </div>

        {adicionandoBloco&&(
          <div style={{background:'#2E1A14',borderRadius:'12px',padding:'12px',border:'1px solid rgba(232,201,106,0.2)',marginBottom:'10px'}}>
            <div style={{display:'flex',gap:'6px',marginBottom:'10px',flexWrap:'wrap'}}>
              {TIPOS_BLOCO.map(t=>(
                <button key={t.id} onClick={()=>setNovoBloco(b=>({...b,tipo:t.id}))}
                  style={{padding:'5px 10px',borderRadius:'8px',border:`1px solid ${novoBloco.tipo===t.id?t.cor:'#3A2018'}`,background:novoBloco.tipo===t.id?`${t.cor}22`:'transparent',color:novoBloco.tipo===t.id?t.cor:'#9A8880',fontSize:'12px',cursor:'pointer'}}>
                  {t.label}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Título *" value={novoBloco.titulo}
              onChange={e=>setNovoBloco(b=>({...b,titulo:e.target.value}))}
              style={{...inp,marginBottom:'8px'}}/>
            <input type="text" placeholder="Descrição (opcional)" value={novoBloco.descricao}
              onChange={e=>setNovoBloco(b=>({...b,descricao:e.target.value}))}
              style={{...inp,marginBottom:'10px'}}/>
            <button onClick={adicionarBloco}
              style={{width:'100%',padding:'10px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',color:'#F5EFE6',fontWeight:'700',cursor:'pointer'}}>
              ✅ Adicionar bloco
            </button>
          </div>
        )}

        {dados.blocos.length===0?(
          <div style={{textAlign:'center',padding:'16px',color:'#555',fontSize:'12px',border:'1px dashed #3A2018',borderRadius:'10px'}}>
            Adicione especialidades, cursos e novidades
          </div>
        ):dados.blocos.map((bloco,idx)=>{
          const tipo=TIPOS_BLOCO.find(t=>t.id===bloco.tipo)||TIPOS_BLOCO[0];
          return(
            <div key={bloco.id||idx} style={{background:'#2E1A14',borderRadius:'10px',padding:'10px 12px',border:`1px solid ${bloco.visivel?tipo.cor+'44':'#3A2018'}`,marginBottom:'6px',display:'flex',alignItems:'center',gap:'10px',opacity:bloco.visivel?1:0.6}}>
              <div style={{flex:1}}>
                <div style={{fontSize:'10px',color:tipo.cor,fontWeight:'700',marginBottom:'2px'}}>{tipo.label}</div>
                <div style={{fontSize:'13px',color:'#F5EFE6',fontWeight:'600'}}>{bloco.titulo}</div>
                {bloco.descricao&&<div style={{fontSize:'11px',color:'#9A8880',marginTop:'2px'}}>{bloco.descricao}</div>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'4px',flexShrink:0}}>
                <button onClick={()=>toggleVisivel(idx)}
                  style={{padding:'3px 7px',borderRadius:'6px',border:'none',background:bloco.visivel?'rgba(76,175,80,0.15)':'rgba(244,67,54,0.1)',color:bloco.visivel?'#4CAF50':'#F44336',fontSize:'10px',cursor:'pointer',fontWeight:'700'}}>
                  {bloco.visivel?'👁':'🚫'}
                </button>
                <button onClick={()=>removerBloco(idx)}
                  style={{padding:'3px 7px',borderRadius:'6px',border:'1px solid #3A2018',background:'transparent',color:'#555',fontSize:'10px',cursor:'pointer'}}>
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SALVAR ── */}
      <button onClick={salvarPerfil} disabled={salvando}
        style={{width:'100%',padding:'14px',borderRadius:'14px',border:'none',background:salvo?'linear-gradient(135deg,#2E7D7A,#3A9E9A)':'linear-gradient(135deg,#5C2218,#8B3A2A)',color:'#F5EFE6',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}>
        {salvando?'⏳ Salvando...':salvo?'✅ Salvo!':'💾 Salvar perfil'}
      </button>

      {/* Modal foto ampliada */}
      {fotoAmpliada&&dados.foto&&(
        <div onClick={()=>setFoto(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,cursor:'pointer'}}>
          <img src={dados.foto} alt="" style={{maxWidth:'90%',maxHeight:'90%',borderRadius:'16px',objectFit:'contain'}}/>
          <button style={{position:'absolute',top:'20px',right:'20px',background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:'36px',height:'36px',color:'#fff',fontSize:'18px',cursor:'pointer'}}>✕</button>
        </div>
      )}
    </div>
  );
}

// ─── ABA AVALIAÇÕES ───────────────────────────────────────────
function AbaAvaliacoes({ usuario }) {
  const [avaliacoes, setAvaliacoes] = React.useState([]);
  const [carregando, setCarr]       = React.useState(true);

  React.useEffect(()=>{
    if(!usuario?.id) return;
    const unsub = onSnapshot(
      query(collection(db,'avaliacoes'), where('barbeiroId','==',usuario.id)),
      snap => { setAvaliacoes(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.criadoEm?.seconds||0)-(a.criadoEm?.seconds||0))); setCarr(false); },
      ()=>setCarr(false)
    );
    return unsub;
  },[usuario?.id]);

  const media = notaMedia(avaliacoes);

  if (carregando) return <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳</div>;

  return (
    <div>
      {/* Nota média */}
      {avaliacoes.length>0 && (
        <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', borderRadius:'16px', padding:'20px', textAlign:'center', marginBottom:'16px' }}>
          <div style={{ fontSize:'48px', fontWeight:'900', color:'#E8C96A', lineHeight:1 }}>{media}</div>
          <div style={{ fontSize:'20px', marginTop:'6px' }}>{estrelas(parseFloat(media))}</div>
          <div style={{ fontSize:'12px', color:'rgba(245,239,230,0.7)', marginTop:'6px' }}>
            Média de {avaliacoes.length} avaliação{avaliacoes.length!==1?'ões':''}
          </div>
        </div>
      )}

      {avaliacoes.length===0 ? (
        <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>⭐</div>
          <div style={{ fontSize:'14px' }}>Nenhuma avaliação ainda</div>
          <div style={{ fontSize:'12px', color:'#555', marginTop:'8px' }}>As avaliações dos clientes aparecerão aqui</div>
        </div>
      ) : avaliacoes.map(av=>(
        <div key={av.id} style={{ background:'#231410', borderRadius:'14px', padding:'14px', border:'1px solid #3A2018', marginBottom:'10px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
            <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{av.clienteNome||'Cliente'}</div>
            <div style={{ fontSize:'14px' }}>{estrelas(av.nota||0)}</div>
          </div>
          {av.servico && <div style={{ fontSize:'11px', color:'#9A8880', marginBottom:'6px' }}>💈 {av.servico}</div>}
          {av.comentario && (
            <div style={{ fontSize:'13px', color:'rgba(245,239,230,0.85)', lineHeight:'1.6', background:'#1A0F0D', borderRadius:'8px', padding:'10px', fontStyle:'italic' }}>
              "{av.comentario}"
            </div>
          )}
          {av.criadoEm && (
            <div style={{ fontSize:'10px', color:'#555', marginTop:'6px', textAlign:'right' }}>
              {av.criadoEm.toDate?.().toLocaleDateString('pt-BR')||''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function AgendaBarbeiro({ usuario, onBack, dark }) {
  const s = getStyles(dark);
  const [aba, setAba]           = React.useState('agenda');
  const [dataSel, setDataSel]   = React.useState(hoje());
  const [agendamentos, setAgs]  = React.useState([]);
  const [slotsBloq, setSlotsBloq] = React.useState(new Set());
  const [config, setConfig]     = React.useState(null);

  React.useEffect(()=>{
    getDoc(doc(db,'config','barbearia')).then(snap=>{if(snap.exists())setConfig(snap.data());});
  },[]);

  React.useEffect(()=>{
    if(!usuario?.id) return;
    const unsub=onSnapshot(query(collection(db,'agendamentos'),where('barbeiroId','==',usuario.id)),
      snap=>setAgs(snap.docs.map(d=>({firestoreId:d.id,...d.data()}))),console.error);
    return unsub;
  },[usuario?.id]);

  React.useEffect(()=>{
    if(!usuario?.id||!dataSel) return;
    const unsub=onSnapshot(query(collection(db,'slots_bloqueados'),where('barbeiroId','==',usuario.id),where('data','==',dataSel)),
      snap=>setSlotsBloq(new Set(snap.docs.map(d=>d.data().hora))),console.error);
    return unsub;
  },[usuario?.id,dataSel]);

  async function handleConcluir(ag) {
    try{await updateDoc(doc(db,'agendamentos',ag.firestoreId),{status:'concluido',concluidoEm:serverTimestamp()});}catch(e){console.error(e);}
  }
  async function handleCancelar(ag) {
    try{await updateDoc(doc(db,'agendamentos',ag.firestoreId),{status:'cancelado_barbeiro',canceladoEm:serverTimestamp()});}catch(e){console.error(e);}
  }
  // ✅ Arquivar: some da agenda diária, doc preservado no Firestore para histórico
  async function handleArquivar(ag) {
    try{await updateDoc(doc(db,'agendamentos',ag.firestoreId),{arquivado:true,arquivadoEm:serverTimestamp()});}catch(e){console.error(e);}
  }

  const disponivel = usuario?.disponivel!==false;

  // ✅ Stats do dia para o barbeiro (contagem rápida)
  const hojeStr = React.useMemo(()=>{
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },[]);

  const statsHoje = React.useMemo(()=>{
    const agsHoje = agendamentos.filter(ag=>ag.data===hojeStr);
    return {
      confirmados: agsHoje.filter(ag=>['confirmado','pendente'].includes(ag.status)).length,
      concluidos:  agsHoje.filter(ag=>ag.status==='concluido').length,
      receita:     agsHoje.filter(ag=>ag.status==='concluido').reduce((s,ag)=>s+(ag.valor||0),0),
    };
  },[agendamentos, hojeStr]);

  const ABAS = [
    { id:'agenda',     label:'📅'    },
    { id:'horarios',   label:'✏️'    },
    { id:'clientes',   label:'👥'    },
    { id:'perfil',     label:'👤'    },
    { id:'avaliacoes', label:'⭐'    },
    { id:'captar',     label:'📣'    },
  ];

  return (
    <div style={{ ...s.app, paddingBottom:'20px' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {onBack && (
            <button onClick={onBack} style={{ background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'10px', padding:'7px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'13px', fontWeight:'600', flexShrink:0 }}>
              ← Home
            </button>
          )}
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:'#F5EFE6', overflow:'hidden', flexShrink:0 }}>
              {usuario?.foto?<img src={usuario.foto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:usuario?.nome?.charAt(0)||'B'}
            </div>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'15px', color:'#F5EFE6', fontWeight:'700' }}>{usuario?.nome}</div>
              <div style={{ fontSize:'10px', color:'rgba(245,239,230,0.6)' }}>
                {ABAS.find(a=>a.id===aba)?.label} {aba.charAt(0).toUpperCase()+aba.slice(1)}
              </div>
            </div>
          </div>
          {/* Toggle disponível */}
          <div onClick={async()=>{ try{await updateDoc(doc(db,'barbeiros',usuario.id),{disponivel:!disponivel});}catch(e){} }}
            style={{ display:'flex', alignItems:'center', gap:'5px', padding:'5px 10px', borderRadius:'20px', background:disponivel?'rgba(76,175,80,0.2)':'rgba(255,193,7,0.2)', border:`1px solid ${disponivel?'rgba(76,175,80,0.4)':'rgba(255,193,7,0.4)'}`, cursor:'pointer', flexShrink:0 }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:disponivel?'#4CAF50':'#FFC107' }}/>
            <span style={{ fontSize:'11px', fontWeight:'700', color:disponivel?'#4CAF50':'#FFC107' }}>{disponivel?'Livre':'Ocupado'}</span>
          </div>
        </div>
      </div>

      {/* Abas — 5 ícones */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018' }}>
        {ABAS.map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)}
            style={{ flex:1, padding:'12px 4px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #E8C96A':'2px solid transparent', fontSize:aba===a.id?'18px':'16px', cursor:'pointer', transition:'all 0.2s', opacity:aba===a.id?1:0.5 }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        {aba==='agenda' && (
          <>
            {/* ✅ Mini dashboard do dia */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'12px' }}>
              {[
                { label:'Confirmados', value:statsHoje.confirmados, cor:'#4CAF50' },
                { label:'Concluídos',  value:statsHoje.concluidos,  cor:'#2E7D7A' },
                { label:'Receita hoje',value:`R$${statsHoje.receita.toFixed(0)}`, cor:'#E8C96A' },
              ].map(s=>(
                <div key={s.label} style={{ background:'#1A0F0D', borderRadius:'10px', padding:'10px', textAlign:'center', border:'1px solid #3A2018' }}>
                  <div style={{ fontSize:'16px', fontWeight:'700', color:s.cor }}>{s.value}</div>
                  <div style={{ fontSize:'9px', color:'#9A8880', marginTop:'2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <CalendarioBarbeiro agendamentos={agendamentos} dataSel={dataSel} onDiaSel={setDataSel}/>
            <ListaClientesDia agendamentos={agendamentos} dataSel={dataSel} config={config} usuario={usuario} onConcluir={handleConcluir} onCancelar={handleCancelar} onArquivar={handleArquivar}/>
          </>
        )}
        {aba==='horarios' && (
          <AbaHorarios usuario={usuario} dataSel={dataSel} setDataSel={setDataSel} config={config} slotsBloqueados={slotsBloq} setSlotsBloqueados={setSlotsBloq} agendamentos={agendamentos}/>
        )}
        {aba==='clientes'  && <AbaClientes usuario={usuario}/>}
        {aba==='perfil'    && <AbaPerfil usuario={usuario}/>}
        {aba==='avaliacoes'&& <AbaAvaliacoes usuario={usuario}/>
        }
        {aba==='captar'    && <CaptarClientes nomeRemetente={usuario?.nome}/>}
      </div>
    </div>
  );
}
