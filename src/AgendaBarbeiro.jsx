// AgendaBarbeiro.jsx — Flyguer BarberShop
// ✅ NOVO: Calendário mensal com pontinhos
// ✅ NOVO: Barbeiro controla horários, bloqueios e disponibilidade
// ✅ NOVO: Lista de clientes com disparo WhatsApp
// ✅ Notificação em tempo real de novo agendamento

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDoc, getDocs, setDoc, deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getStyles, DIAS_SEMANA } from './getStyles';

// ── Helpers ───────────────────────────────────────────────────
function hoje() { return new Date().toISOString().split('T')[0]; }
function getMesAno() { const d = new Date(); return { mes: d.getMonth(), ano: d.getFullYear() }; }
function formatarData(s) { if(!s) return ''; const [a,m,d]=s.split('-'); return `${d}/${m}/${a}`; }
function diaSemanaCompleto(s) { return ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][new Date(s+'T12:00:00').getDay()]; }
function strData(ano, mes, dia) { return `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`; }

function tocarBip() {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(1046, ctx.currentTime);
    o.frequency.setValueAtTime(1318, ctx.currentTime+0.15);
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.4);
    o.start(ctx.currentTime); o.stop(ctx.currentTime+0.4);
  } catch(e){}
}

// ── Calendário Mensal ─────────────────────────────────────────
function CalendarioMensal({ barbeiroId, onDiaSel, dataSel }) {
  const hoje_str = hoje();
  const [mes, setMes]     = React.useState(getMesAno().mes);
  const [ano, setAno]     = React.useState(getMesAno().ano);
  const [agMap, setAgMap] = React.useState({}); // { 'YYYY-MM-DD': count }

  React.useEffect(() => {
    if (!barbeiroId) return;
    const ini = strData(ano, mes, 1);
    const fim = strData(ano, mes+1 > 11 ? ano+1 : ano, mes+1 > 11 ? 0 : mes+1, 1);
    const q = query(
      collection(db,'agendamentos'),
      where('barbeiroId','==',barbeiroId),
      where('data','>=',ini),
      where('data','<', strData(mes+1>11?ano+1:ano, mes+1>11?0:mes+1, 1)),
      where('status','in',['confirmado','concluido'])
    );
    const unsub = onSnapshot(q, snap => {
      const map = {};
      snap.docs.forEach(d => {
        const dt = d.data().data;
        map[dt] = (map[dt]||0) + 1;
      });
      setAgMap(map);
    }, ()=>{});
    return ()=>unsub();
  }, [barbeiroId, mes, ano]);

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes  = new Date(ano, mes+1, 0).getDate();

  function navMes(dir) {
    setMes(m => {
      const novoMes = m + dir;
      if (novoMes < 0) { setAno(a => a-1); return 11; }
      if (novoMes > 11) { setAno(a => a+1); return 0; }
      return novoMes;
    });
  }

  const cells = [];
  for (let i=0; i<primeiroDia; i++) cells.push(null);
  for (let d=1; d<=diasNoMes; d++) cells.push(d);

  return (
    <div style={{ background:'#1A0F0D', borderRadius:'16px', padding:'16px', marginBottom:'16px', border:'1px solid #3A2018' }}>
      {/* Navegação mês */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <button onClick={()=>navMes(-1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'6px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>‹</button>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'16px', color:'#E8C96A', fontWeight:'700' }}>
          {MESES[mes]} {ano}
        </div>
        <button onClick={()=>navMes(1)} style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'6px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>›</button>
      </div>

      {/* Cabeçalho dias semana */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px', marginBottom:'8px' }}>
        {['D','S','T','Q','Q','S','S'].map((d,i) => (
          <div key={i} style={{ textAlign:'center', fontSize:'10px', color:'#9A8880', fontWeight:'600', padding:'4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Grid dias */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'4px' }}>
        {cells.map((dia, idx) => {
          if (!dia) return <div key={idx} />;
          const dataStr = strData(ano, mes, dia);
          const count   = agMap[dataStr] || 0;
          const isHojeD = dataStr === hoje_str;
          const isSel   = dataStr === dataSel;
          const temAg   = count > 0;
          const passado = dataStr < hoje_str;

          return (
            <div key={idx} onClick={() => onDiaSel(dataStr)}
              style={{ borderRadius:'10px', padding:'6px 2px', textAlign:'center', cursor:'pointer', position:'relative',
                background: isSel ? '#8B3A2A' : isHojeD ? 'rgba(232,201,106,0.15)' : temAg ? 'rgba(76,175,80,0.1)' : '#231410',
                border: isSel ? '1.5px solid #E8C96A' : isHojeD ? '1px solid rgba(232,201,106,0.4)' : temAg ? '1px solid rgba(76,175,80,0.3)' : '1px solid #2E1A14',
                opacity: passado && !temAg ? 0.4 : 1,
              }}>
              <div style={{ fontSize:'14px', fontWeight:'700', color: isSel ? '#F5EFE6' : isHojeD ? '#E8C96A' : '#F5EFE6' }}>{dia}</div>
              {/* Pontinhos de agendamentos */}
              {temAg && (
                <div style={{ display:'flex', justifyContent:'center', gap:'2px', marginTop:'2px', flexWrap:'wrap' }}>
                  {count <= 3 ? Array.from({length:count}).map((_,i) => (
                    <div key={i} style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#4CAF50' }} />
                  )) : (
                    <div style={{ fontSize:'9px', color:'#4CAF50', fontWeight:'700' }}>{count}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Configuração de Horários do Barbeiro ──────────────────────
function ConfigHorarios({ barbeiroId, onFechar }) {
  const DIAS_KEYS = ['dom','seg','ter','qua','qui','sex','sab'];
  const DIAS_LABEL = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

  const [config, setConfig]     = React.useState(null);
  const [salvando, setSalvando] = React.useState(false);
  const [toast, setToast]       = React.useState('');

  React.useEffect(() => {
    // Carrega config do barbeiro ou usa padrão
    getDoc(doc(db,'barbeiros_config',barbeiroId)).then(snap => {
      if (snap.exists()) {
        setConfig(snap.data());
      } else {
        // Padrão: seg-sab aberto 9h-19h, dom fechado
        const padrao = {};
        DIAS_KEYS.forEach((d,i) => {
          padrao[d] = { aberto: i > 0, abertura:'09:00', fechamento:'19:00', almoco:{ ativo:false, inicio:'12:00', fim:'13:00' } };
        });
        setConfig({ horarios: padrao });
      }
    }).catch(()=>{
      const padrao = {};
      DIAS_KEYS.forEach((d,i) => {
        padrao[d] = { aberto: i > 0, abertura:'09:00', fechamento:'19:00', almoco:{ ativo:false, inicio:'12:00', fim:'13:00' } };
      });
      setConfig({ horarios: padrao });
    });
  }, [barbeiroId]);

  function setDia(diaKey, campo, valor) {
    setConfig(c => ({ ...c, horarios: { ...c.horarios, [diaKey]: { ...c.horarios[diaKey], [campo]: valor } } }));
  }
  function setAlmoco(diaKey, campo, valor) {
    setConfig(c => ({ ...c, horarios: { ...c.horarios, [diaKey]: { ...c.horarios[diaKey], almoco: { ...c.horarios[diaKey].almoco, [campo]: valor } } } }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      await setDoc(doc(db,'barbeiros_config',barbeiroId), { ...config, atualizadoEm: serverTimestamp() }, { merge:true });
      setToast('✅ Horários salvos!');
      setTimeout(() => { setToast(''); onFechar(); }, 1500);
    } catch(e) { setToast('❌ Erro ao salvar'); }
    setSalvando(false);
  }

  if (!config) return <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳ Carregando...</div>;

  const inp = { background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', fontSize:'13px', outline:'none', fontFamily:"'DM Sans',sans-serif" };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>🕐 Meus Horários</div>
          <button onClick={onFechar} style={{ background:'none', border:'none', color:'#9A8880', fontSize:'20px', cursor:'pointer' }}>✕</button>
        </div>

        {DIAS_KEYS.map((dk, i) => {
          const d = config.horarios?.[dk] || { aberto:false, abertura:'09:00', fechamento:'19:00', almoco:{ativo:false,inicio:'12:00',fim:'13:00'} };
          return (
            <div key={dk} style={{ background:'#231410', borderRadius:'12px', padding:'14px', marginBottom:'10px', border:`1px solid ${d.aberto?'#3A2018':'rgba(244,67,54,0.2)'}` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: d.aberto?'12px':'0' }}>
                <div style={{ fontWeight:'700', fontSize:'14px', color: d.aberto?'#F5EFE6':'#555' }}>{DIAS_LABEL[i]}</div>
                <div onClick={() => setDia(dk,'aberto',!d.aberto)}
                  style={{ width:'44px', height:'24px', borderRadius:'12px', background:d.aberto?'#4CAF50':'#3A2018', position:'relative', cursor:'pointer', transition:'background 0.2s' }}>
                  <div style={{ position:'absolute', top:'3px', left:d.aberto?'23px':'3px', width:'18px', height:'18px', borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
                </div>
              </div>

              {d.aberto && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
                    <div>
                      <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'4px' }}>Abertura</div>
                      <input type="time" value={d.abertura} onChange={e=>setDia(dk,'abertura',e.target.value)} style={{...inp, width:'100%', boxSizing:'border-box'}} />
                    </div>
                    <div>
                      <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'4px' }}>Fechamento</div>
                      <input type="time" value={d.fechamento} onChange={e=>setDia(dk,'fechamento',e.target.value)} style={{...inp, width:'100%', boxSizing:'border-box'}} />
                    </div>
                  </div>

                  {/* Almoço */}
                  <div style={{ background:'#1A0F0D', borderRadius:'10px', padding:'10px 12px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: d.almoco?.ativo?'10px':'0' }}>
                      <div style={{ fontSize:'12px', color:'#9A8880' }}>🍽 Pausa / Almoço</div>
                      <div onClick={() => setAlmoco(dk,'ativo',!d.almoco?.ativo)}
                        style={{ width:'36px', height:'20px', borderRadius:'10px', background:d.almoco?.ativo?'#E8C96A':'#3A2018', position:'relative', cursor:'pointer', transition:'background 0.2s' }}>
                        <div style={{ position:'absolute', top:'2px', left:d.almoco?.ativo?'18px':'2px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
                      </div>
                    </div>
                    {d.almoco?.ativo && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                        <div>
                          <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'4px' }}>Início</div>
                          <input type="time" value={d.almoco.inicio} onChange={e=>setAlmoco(dk,'inicio',e.target.value)} style={{...inp, width:'100%', boxSizing:'border-box'}} />
                        </div>
                        <div>
                          <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'4px' }}>Fim</div>
                          <input type="time" value={d.almoco.fim} onChange={e=>setAlmoco(dk,'fim',e.target.value)} style={{...inp, width:'100%', boxSizing:'border-box'}} />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {toast && <div style={{ textAlign:'center', padding:'10px', fontSize:'13px', color: toast.startsWith('✅')?'#4CAF50':'#F44336', marginBottom:'10px' }}>{toast}</div>}

        <button onClick={salvar} disabled={salvando}
          style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:'#fff', fontWeight:'800', fontSize:'15px', cursor:'pointer', marginTop:'10px' }}>
          {salvando?'⏳ Salvando...':'✅ Salvar meus horários'}
        </button>
      </div>
    </div>
  );
}

// ── Lista de Clientes do Barbeiro ─────────────────────────────
function ListaClientesBarbeiro({ barbeiroId, onFechar, inline }) {
  const [clientes, setClientes] = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [busca, setBusca]       = React.useState('');

  React.useEffect(() => {
    // Busca clientes que já agendaram com esse barbeiro
    // ✅ Fix: inclui confirmado e concluido para mostrar todos os clientes
    getDocs(query(collection(db,'agendamentos'), where('barbeiroId','==',barbeiroId))).then(snap => {
      const map = {};
      snap.docs.forEach(d => {
        const ag = d.data();
        // ✅ Fix: aceita todos os status exceto cancelados
        if (!ag.clienteCpf || ag.clienteCpf === 'encaixe' || ag.clienteCpf?.startsWith('amigo_')) return;
        if (ag.status?.includes('cancelado')) return;
        if (!map[ag.clienteCpf]) {
          map[ag.clienteCpf] = { nome: ag.clienteNome, tel: ag.clienteTel, cpf: ag.clienteCpf, visitas: 0, ultimo: ag.data };
        }
        map[ag.clienteCpf].visitas++;
        if (ag.data > map[ag.clienteCpf].ultimo) map[ag.clienteCpf].ultimo = ag.data;
      });
      setClientes(Object.values(map).sort((a,b) => b.visitas - a.visitas));
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, [barbeiroId]);

  const filtrados = clientes.filter(c =>
    !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.tel?.includes(busca)
  );

  function dispararWhatsApp(cliente) {
    const tel = cliente.tel?.replace(/\D/g,'');
    if (!tel) return;
    const msg = encodeURIComponent(
      `Olá, ${cliente.nome?.split(' ')[0]}! 👋\n\nTemo um horário disponível para você na Flyguer BarberShop!\n\nQuer agendar? Acesse:\n📲 https://flyguer-barbershop.vercel.app\n\n📍 Shopping Cidade das Artes — Piso 2, Nº 22`
    );
    window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
  }

  const inner = (
    <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A' }}>👥 Meus Clientes</div>
            <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>{clientes.length} clientes atendidos</div>
          </div>
        </div>

        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar cliente..."
          style={{ width:'100%', background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'10px', padding:'10px 14px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box', marginBottom:'14px' }} />

        {loading && <div style={{ textAlign:'center', padding:'30px', color:'#9A8880' }}>⏳ Carregando...</div>}

        {!loading && filtrados.length === 0 && (
          <div style={{ textAlign:'center', padding:'30px', color:'#9A8880' }}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>👥</div>
            <div>{busca ? 'Nenhum cliente encontrado' : 'Ainda sem clientes atendidos'}</div>
          </div>
        )}

        {filtrados.map(c => (
          <div key={c.cpf} style={{ background:'#231410', border:'1px solid #3A2018', borderRadius:'12px', padding:'12px 14px', marginBottom:'8px', display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>
              {(c.nome||'?')[0].toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{c.nome}</div>
              <div style={{ fontSize:'11px', color:'#9A8880' }}>📞 {c.tel||'—'} · {c.visitas} visita{c.visitas!==1?'s':''}</div>
              <div style={{ fontSize:'10px', color:'#555', marginTop:'2px' }}>Último: {formatarData(c.ultimo)}</div>
            </div>
            {c.tel && (
              <button onClick={() => dispararWhatsApp(c)}
                style={{ background:'rgba(37,211,102,0.15)', border:'1px solid rgba(37,211,102,0.3)', borderRadius:'10px', padding:'8px 10px', color:'#25D366', fontSize:'11px', fontWeight:'700', cursor:'pointer', flexShrink:0 }}>
                📲
              </button>
            )}
          </div>
        ))}
    </div>
  );

  if (inline) return inner;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#1A0F0D', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'430px', padding:'24px 20px 40px', border:'1px solid #3A2018', borderBottom:'none', maxHeight:'90vh', overflowY:'auto' }}>
        {inner}
      </div>
    </div>
  );
}

// ── Card de Agendamento ───────────────────────────────────────
function CardAgendamento({ ag, onConcluir, concluindo, mostrarValor, mostrarCliente }) {
  const isConcluido = ag.status === 'concluido';
  const isCancelado = ag.status ? ag.status.includes('cancelado') : false;

  function ligarWhatsApp() {
    const tel = ag.clienteTel?.replace(/\D/g,'');
    if (!tel) return;
    const msg = encodeURIComponent(`Olá, ${ag.clienteNome?.split(' ')[0]}! 👋\nSeu horário é às ${ag.hora}. Te esperamos na Flyguer BarberShop!`);
    window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
  }

  return (
    <div style={{ background:'#231410', borderRadius:'16px', border:isConcluido?'1px solid #2E7D7A':isCancelado?'1px solid #3A1010':'1px solid #3A2018', marginBottom:'12px', overflow:'hidden', opacity:isCancelado?0.5:1 }}>
      <div style={{ height:'3px', background:isConcluido?'#2E7D7A':isCancelado?'#F44336':ag.pagamento==='pix'||ag.pagamento==='pix_sinal'?'#2E7D7A':'#8B3A2A' }} />
      <div style={{ padding:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'22px', fontWeight:'700', color:'#E8C96A' }}>{ag.hora}</div>
          <div style={{ fontSize:'11px', padding:'4px 10px', borderRadius:'20px', fontWeight:'600', background:isConcluido?'rgba(46,125,122,0.2)':isCancelado?'rgba(244,67,54,0.15)':'rgba(76,175,80,0.15)', color:isConcluido?'#2E7D7A':isCancelado?'#F44336':'#4CAF50' }}>
            {isConcluido?'✓ Concluído':isCancelado?'✗ Cancelado':'● Confirmado'}
          </div>
        </div>
        <div style={{ marginBottom:'12px' }}>
          {mostrarCliente ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:'700', fontSize:'16px', color:'#F5EFE6' }}>{ag.clienteNome?.split(' ').slice(0,2).join(' ')}</div>
                {ag.clienteTel && <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>📞 {ag.clienteTel}</div>}
              </div>
              {ag.clienteTel && (
                <button onClick={ligarWhatsApp}
                  style={{ background:'rgba(37,211,102,0.15)', border:'1px solid rgba(37,211,102,0.3)', borderRadius:'10px', padding:'8px 12px', color:'#25D366', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                  📲
                </button>
              )}
            </div>
          ) : (
            <div style={{ fontWeight:'700', fontSize:'16px', color:'#9A8880' }}>Cliente</div>
          )}
          <div style={{ fontSize:'13px', color:'#9A8880', marginTop:'4px' }}>💈 {ag.servico}</div>
        </div>
        {mostrarValor && (
          <div style={{ display:'flex', gap:'10px', background:'#1A0F0D', borderRadius:'10px', padding:'10px 12px', marginBottom:'12px' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'2px' }}>Valor</div>
              <div style={{ fontSize:'16px', fontWeight:'700', color:'#E8C96A' }}>R$ {(ag.valor||0).toFixed(2).replace('.',',')}</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'2px' }}>Pagamento</div>
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#F5EFE6' }}>
                {ag.pagamento==='pix'||ag.pagamento==='pix_sinal'?'💳 Pix':'💵 Local'}
              </div>
            </div>
          </div>
        )}
        {!isConcluido && !isCancelado && (
          <button onClick={() => onConcluir(ag)} disabled={concluindo===ag.firestoreId}
            style={{ width:'100%', padding:'10px', borderRadius:'10px', border:'none', background:concluindo===ag.firestoreId?'#2E1A14':'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:'#F5EFE6', fontSize:'13px', fontWeight:'700', cursor:concluindo===ag.firestoreId?'wait':'pointer' }}>
            {concluindo===ag.firestoreId?'...':'✓ Marcar como Concluído'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Grade de bloqueio de slots ────────────────────────────────
function GradeSlots({ barbeiroId, dataSel, agendamentos }) {
  const [slotsBloqueados, setSlotsBloqueados] = React.useState(new Set());

  React.useEffect(() => {
    if (!barbeiroId || !dataSel) return;
    getDocs(query(collection(db,'slots_bloqueados'), where('barbeiroId','==',barbeiroId), where('data','==',dataSel))).then(snap => {
      setSlotsBloqueados(new Set(snap.docs.map(d => d.data().hora)));
    });
  }, [barbeiroId, dataSel]);

  async function toggleSlot(hora) {
    const id = `${barbeiroId}_${dataSel}_${hora}`;
    const bloqueado = slotsBloqueados.has(hora);
    if (!bloqueado) {
      await setDoc(doc(db,'slots_bloqueados',id), { barbeiroId, data:dataSel, hora, bloqueadoEm:new Date().toISOString() });
      setSlotsBloqueados(prev => new Set([...prev, hora]));
    } else {
      await deleteDoc(doc(db,'slots_bloqueados',id));
      setSlotsBloqueados(prev => { const n = new Set(prev); n.delete(hora); return n; });
    }
  }

  const slots = [];
  for (let h=8; h<24; h++) {
    for (let m=0; m<60; m+=30) {
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    }
  }

  return (
    <div style={{ background:'#1A0F0D', borderRadius:'14px', padding:'14px', marginBottom:'16px', border:'1px solid #3A2018' }}>
      <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', marginBottom:'4px' }}>🔧 Controle de disponibilidade — {formatarData(dataSel)}</div>
      <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'12px' }}>Toque para abrir ou fechar um horário</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
        {slots.map(hora => {
          const agAtivo = agendamentos.find(a => a.hora===hora && !a.status?.includes('cancelado'));
          const bloqueado = slotsBloqueados.has(hora);
          return (
            <div key={hora} onClick={() => !agAtivo && toggleSlot(hora)}
              style={{ borderRadius:'8px', padding:'8px 4px', textAlign:'center', cursor:agAtivo?'default':'pointer',
                background: agAtivo?'rgba(139,58,42,0.4)':bloqueado?'rgba(244,67,54,0.15)':'rgba(76,175,80,0.08)',
                border: agAtivo?'1px solid rgba(139,58,42,0.6)':bloqueado?'1px solid rgba(244,67,54,0.4)':'1px solid rgba(76,175,80,0.2)',
              }}>
              <div style={{ fontSize:'12px', fontWeight:'700', color:agAtivo?'#E8C96A':bloqueado?'#F44336':'#4CAF50' }}>{hora}</div>
              <div style={{ fontSize:'8px', color:'#9A8880', marginTop:'2px' }}>
                {agAtivo ? '✂️ Ocupado' : bloqueado ? '🔒 Fechado' : '✅ Livre'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function AgendaBarbeiro({ usuario, onBack, dark }) {
  const s = getStyles(dark);
  const [aba, setAba]               = React.useState('agenda'); // agenda | grade | clientes
  const [dataSel, setDataSel]       = React.useState(hoje());
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [carregando, setCarregando] = React.useState(false);
  const [concluindo, setConcluindo] = React.useState(null);
  const [disponivel, setDisponivel] = React.useState(usuario?.disponivel ?? true);
  const [salvandoDisp, setSalvandoDisp] = React.useState(false);
  const [novoToast, setNovoToast]   = React.useState(null);
  const [permissoes, setPermissoes] = React.useState({ verValores:true, verClientes:true, editarHorarios:true, verListaClientes:true, dispararWhatsApp:true, bloquearSlots:true });
  const [showHorarios, setShowHorarios] = React.useState(false);
  const [showClientes, setShowClientes] = React.useState(false);
  const countRef = React.useRef(0);

  // Carrega permissões
  React.useEffect(() => {
    if (!usuario?.id) return;
    getDoc(doc(db,'barbeiros',usuario.id)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setPermissoes({
          verValores:        d.permVerValores        ?? true,
          verClientes:       d.permVerClientes       ?? true,
          editarHorarios:    d.permEditarHorarios    ?? true,
          verListaClientes:  d.permVerListaClientes  ?? true,
          dispararWhatsApp:  d.permDispararWhatsApp  ?? true,
          bloquearSlots:     d.permBloquearSlots     ?? true,
        });
        setDisponivel(d.disponivel ?? true);
      }
    }).catch(()=>{});
  }, [usuario?.id]);

  // Listener de agendamentos do dia selecionado
  React.useEffect(() => {
    if (!usuario?.id) return;
    setCarregando(true);
    const q = query(collection(db,'agendamentos'), where('barbeiroId','==',usuario.id), where('data','==',dataSel));
    const unsub = onSnapshot(q, snap => {
      const ags = snap.docs.map(d=>({firestoreId:d.id,...d.data()}))
        .filter(a => a && a.hora) // protege contra dados incompletos
        .sort((a,b)=>(a.hora||'').localeCompare(b.hora||''));
      if (countRef.current > 0 && ags.length > countRef.current) {
        const novo = ags.filter(a=>!a.status?.includes('cancelado')).pop();
        if (novo) {
          setNovoToast(novo);
          tocarBip();
          if (navigator.vibrate) navigator.vibrate([150,80,150]);
          setTimeout(() => setNovoToast(null), 6000);
        }
      }
      countRef.current = ags.length;
      setAgendamentos(ags);
      setCarregando(false);
    }, ()=>setCarregando(false));
    return ()=>unsub();
  }, [usuario?.id, dataSel]);

  async function handleConcluir(ag) {
    setConcluindo(ag.firestoreId);
    try { await updateDoc(doc(db,'agendamentos',ag.firestoreId), { status:'concluido', concluidoEm:serverTimestamp() }); }
    catch(e) { console.error(e); }
    finally { setConcluindo(null); }
  }

  async function toggleDisponivel() {
    if (!usuario?.id) return;
    setSalvandoDisp(true);
    const novo = !disponivel;
    setDisponivel(novo); // atualiza UI imediatamente
    try {
      await updateDoc(doc(db,'barbeiros',usuario.id), { disponivel:novo, atualizadoEm:serverTimestamp() });
    } catch(e) {
      console.error('Erro toggle disponivel:', e);
      setDisponivel(!novo); // reverte se falhou
    }
    setSalvandoDisp(false);
  }

  const confirmados = agendamentos.filter(a=>a.status==='confirmado');
  const concluidos  = agendamentos.filter(a=>a.status==='concluido');
  const totalDia    = agendamentos.filter(a=>a.status && !a.status.includes('cancelado')).reduce((acc,a)=>acc+(a.valor||0),0);

  return (
    <div style={{ ...s.app, paddingBottom:'40px' }}>

      {/* Toast novo agendamento */}
      {novoToast && (
        <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'430px', zIndex:9999, background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', padding:'14px 20px', borderRadius:'0 0 16px 16px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <span style={{ fontSize:'28px' }}>🔔</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:'800', fontSize:'13px', color:'#fff' }}>NOVO AGENDAMENTO!</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.85)', marginTop:'2px' }}>
                {permissoes.verClientes ? novoToast.clienteNome?.split(' ')[0] : 'Novo cliente'} · {novoToast.hora} · {novoToast.servico}
              </div>
            </div>
            <button onClick={()=>setNovoToast(null)} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'50%', width:'28px', height:'28px', color:'#fff', fontSize:'14px', cursor:'pointer' }}>✕</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>✂️ {usuario?.nome}</div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>Minha Agenda</div>
        </div>
        <div onClick={salvandoDisp?undefined:toggleDisponivel}
          style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,0.2)', borderRadius:'20px', padding:'6px 12px', cursor:salvandoDisp?'wait':'pointer' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:disponivel?'#4CAF50':'#FFC107' }} />
          <span style={{ fontSize:'12px', color:'#F5EFE6', fontWeight:'600' }}>{salvandoDisp?'...':disponivel?'Disponível':'Ocupado'}</span>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018', background:'#1A0F0D' }}>
        {[
          { id:'agenda',   label:'📅 Agenda'        },
          { id:'grade',    label:'🔧 Horários'       },
          ...(permissoes.verListaClientes ? [{ id:'clientes', label:'👥 Clientes' }] : []),
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ flex:1, padding:'12px 6px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #8B3A2A':'2px solid transparent', color:aba===a.id?'#E8C96A':'#9A8880', fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ═══ ABA AGENDA ═══ */}
      {aba === 'agenda' && (
        <div style={{ padding:'16px' }}>
          {/* Calendário */}
          <CalendarioMensal barbeiroId={usuario?.id} onDiaSel={setDataSel} dataSel={dataSel} />

          {/* Resumo do dia */}
          <div style={{ fontSize:'14px', color:'#E8C96A', fontWeight:'700', marginBottom:'12px' }}>
            {diaSemanaCompleto(dataSel)}, {formatarData(dataSel)}
            {dataSel === hoje() && <span style={{ marginLeft:'8px', fontSize:'11px', color:'#9A8880' }}>— Hoje</span>}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:permissoes.verValores?'1fr 1fr 1fr':'1fr 1fr', gap:'8px', marginBottom:'16px' }}>
            {[
              { label:'Confirmados', value:confirmados.length, color:'#4CAF50' },
              { label:'Concluídos',  value:concluidos.length,  color:'#2E7D7A' },
              ...(permissoes.verValores ? [{ label:'Receita', value:`R$${totalDia.toFixed(0)}`, color:'#E8C96A' }] : []),
            ].map(item => (
              <div key={item.label} style={{ background:'#231410', borderRadius:'12px', padding:'12px 10px', textAlign:'center', border:'1px solid #3A2018' }}>
                <div style={{ fontSize:'18px', fontWeight:'700', color:item.color }}>{item.value}</div>
                <div style={{ fontSize:'10px', color:'#9A8880', marginTop:'2px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Agendamentos */}
          {carregando ? (
            <div style={{ textAlign:'center', padding:'30px', color:'#9A8880' }}>⏳ Carregando...</div>
          ) : agendamentos.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', background:'#231410', borderRadius:'16px', border:'1px solid #3A2018' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>📅</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'16px', color:'#E8C96A', marginBottom:'6px' }}>Sem agendamentos</div>
              <div style={{ fontSize:'12px', color:'#9A8880' }}>Nenhum cliente para {dataSel===hoje()?'hoje':formatarData(dataSel)}</div>
            </div>
          ) : agendamentos.map(ag => (
            <CardAgendamento key={ag.firestoreId} ag={ag}
              onConcluir={handleConcluir} concluindo={concluindo}
              mostrarValor={permissoes.verValores}
              mostrarCliente={permissoes.verClientes}
            />
          ))}
        </div>
      )}

      {/* ═══ ABA HORÁRIOS / GRADE ═══ */}
      {aba === 'grade' && (
        <div style={{ padding:'16px' }}>
          {/* Botão configurar horários semanais */}
          {permissoes.editarHorarios && (
            <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
              <button onClick={() => setShowHorarios(true)}
                style={{ flex:1, padding:'13px', borderRadius:'14px', border:'1px solid rgba(232,201,106,0.3)', background:'rgba(232,201,106,0.08)', color:'#E8C96A', fontSize:'13px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                🕐 Horários semanais
              </button>
              <button onClick={async () => {
                // ✅ Bloqueia/desbloqueia o dia inteiro
                const { collection: col, query: q, where: w, getDocs: gd, doc: fd, setDoc, deleteDoc } = await import('firebase/firestore');
                const snap = await gd(q(col(db,'slots_bloqueados'), w('barbeiroId','==',usuario.id), w('data','==',dataSel)));
                if (snap.size > 0) {
                  // Desbloqueia tudo
                  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
                  setSlotsBloqueados(new Set());
                } else {
                  // Bloqueia todas as horas do dia
                  const slots = [];
                  for (let h=8; h<24; h++) for (let m=0; m<60; m+=30) slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
                  await Promise.all(slots.map(hora => setDoc(fd(db,'slots_bloqueados',`${usuario.id}_${dataSel}_${hora}`), { barbeiroId:usuario.id, data:dataSel, hora, bloqueadoEm:new Date().toISOString() })));
                  setSlotsBloqueados(new Set(slots));
                }
              }}
                style={{ padding:'13px 16px', borderRadius:'14px', border:'1px solid rgba(244,67,54,0.3)', background:'rgba(244,67,54,0.08)', color:'#F44336', fontSize:'13px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', whiteSpace:'nowrap' }}>
                🔒 {slotsBloqueados.size > 0 ? 'Abrir dia' : 'Fechar dia'}
              </button>
            </div>
          )}

          {/* Grade do dia selecionado */}
          <div style={{ fontSize:'13px', color:'#E8C96A', fontWeight:'600', marginBottom:'12px' }}>
            Disponibilidade — {diaSemanaCompleto(dataSel)}, {formatarData(dataSel)}
          </div>

          {/* Seletor de data simples */}
          <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'8px', marginBottom:'12px' }}>
            {Array.from({length:14},(_,i)=>{
              const d = new Date(); d.setDate(d.getDate()+i);
              const ds = d.toISOString().split('T')[0];
              const sel = ds===dataSel;
              return (
                <div key={ds} onClick={()=>setDataSel(ds)}
                  style={{ minWidth:'52px', padding:'8px 6px', borderRadius:'12px', textAlign:'center', cursor:'pointer', background:sel?'#8B3A2A':'#231410', border:sel?'1.5px solid #E8C96A':'1px solid #3A2018', flexShrink:0 }}>
                  <div style={{ fontSize:'10px', color:sel?'#E8C96A':'#9A8880', fontWeight:'600' }}>{DIAS_SEMANA[d.getDay()]}</div>
                  <div style={{ fontSize:'16px', fontWeight:'700', color:'#F5EFE6' }}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          {permissoes.bloquearSlots && (
            <GradeSlots barbeiroId={usuario?.id} dataSel={dataSel} agendamentos={agendamentos} />
          )}
        </div>
      )}

      {/* ═══ ABA CLIENTES ═══ */}
      {aba === 'clientes' && permissoes.verListaClientes && (
        <div style={{ padding:'16px' }}>
          <div style={{ background:'rgba(232,201,106,0.08)', border:'1px solid rgba(232,201,106,0.2)', borderRadius:'12px', padding:'12px 14px', marginBottom:'16px' }}>
            <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', marginBottom:'4px' }}>👥 Meus Clientes</div>
            <div style={{ fontSize:'12px', color:'#9A8880' }}>Clientes que já foram atendidos por você. Toque em 📲 para enviar mensagem.</div>
          </div>
          <ListaClientesBarbeiro barbeiroId={usuario?.id} onFechar={() => setAba('agenda')} inline />
        </div>
      )}

      {/* Modais */}
      {showHorarios && <ConfigHorarios barbeiroId={usuario?.id} onFechar={() => setShowHorarios(false)} />}
    </div>
  );
}
