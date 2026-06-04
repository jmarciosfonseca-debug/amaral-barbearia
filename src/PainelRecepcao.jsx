// PainelRecepcao.jsx — Flyguer BarberShop
// ✅ v4: Arquivar cancelados (arquivado:true) — some da agenda, preservado no banco

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, onSnapshot,
  doc, getDoc, getDocs, updateDoc, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { getStyles } from './getStyles';

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
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ─── ABA AGENDA ───────────────────────────────────────────────
function AbaAgenda() {
  const [barbeiros, setBarbeiros]       = React.useState([]);
  const [barbeiroSel, setBarbeiroSel]   = React.useState(null);
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [dataSel, setDataSel]           = React.useState(hoje());
  const [mes, setMes]                   = React.useState(new Date().getMonth());
  const [ano, setAno]                   = React.useState(new Date().getFullYear());

  const agoraDt = new Date();
  const hojeStr = mkData(agoraDt.getFullYear(), agoraDt.getMonth(), agoraDt.getDate());

  React.useEffect(() => {
    getDocs(query(collection(db,'barbeiros'), where('ativo','==',true))).then(snap => {
      const lista = snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.papel!=='recepcao');
      setBarbeiros(lista);
      if (lista.length > 0) setBarbeiroSel(lista[0]);
    });
  }, []);

  React.useEffect(() => {
    if (!barbeiroSel) return;
    const unsub = onSnapshot(
      query(collection(db,'agendamentos'), where('barbeiroId','==',barbeiroSel.id)),
      snap => setAgendamentos(snap.docs.map(d=>({firestoreId:d.id,...d.data()}))),
      console.error
    );
    return unsub;
  }, [barbeiroSel]);

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes   = new Date(ano, mes+1, 0).getDate();

  const mapaDia = {};
  agendamentos.forEach(ag => {
    if (!ag.data) return;
    if (!mapaDia[ag.data]) mapaDia[ag.data] = { conf:0, canc:0 };
    if (ag.status==='confirmado'||ag.status==='pendente') mapaDia[ag.data].conf++;
    else if (ag.status?.includes('cancelado')) mapaDia[ag.data].canc++;
  });

  const cells = [];
  for (let i=0; i<primeiroDia; i++) cells.push(null);
  for (let d=1; d<=diasNoMes; d++) cells.push(d);

  // ✅ PONTO 1: filtra arquivados da lista do dia
  const agsDia = agendamentos
    .filter(ag => ag.data===dataSel && !ag.arquivado)
    .sort((a,b) => a.hora?.localeCompare(b.hora));

  async function concluir(ag) {
    await updateDoc(doc(db,'agendamentos',ag.firestoreId), { status:'concluido', concluidoEm:serverTimestamp() });
  }
  async function cancelar(ag) {
    await updateDoc(doc(db,'agendamentos',ag.firestoreId), { status:'cancelado_barbeiro', canceladoEm:serverTimestamp() });
  }
  // ✅ PONTO 2: função arquivar
  async function arquivar(ag) {
    await updateDoc(doc(db,'agendamentos',ag.firestoreId), { arquivado:true, arquivadoEm:serverTimestamp() });
  }

  return (
    <div>
      {/* Seletor de barbeiro */}
      <div style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'8px', marginBottom:'14px' }}>
        {barbeiros.map(b => (
          <div key={b.id} onClick={() => setBarbeiroSel(b)}
            style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', borderRadius:'20px', border:barbeiroSel?.id===b.id?'1.5px solid #E8C96A':'1px solid #3A2018', background:barbeiroSel?.id===b.id?'#2E1A14':'#231410', cursor:'pointer', flexShrink:0 }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:'#F5EFE6' }}>
              {b.nome?.charAt(0)}
            </div>
            <span style={{ fontSize:'13px', fontWeight:'600', color:barbeiroSel?.id===b.id?'#E8C96A':'#F5EFE6', whiteSpace:'nowrap' }}>{b.nome?.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div style={{ background:'#1A0F0D', borderRadius:'14px', padding:'12px', marginBottom:'12px', border:'1px solid #3A2018' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
          <button onClick={() => { let nm=mes-1,na=ano; if(nm<0){nm=11;na--;} setMes(nm);setAno(na); }}
            style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'3px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'16px' }}>{'<'}</button>
          <div style={{ fontSize:'14px', color:'#E8C96A', fontWeight:'700' }}>{MESES[mes]} {ano}</div>
          <button onClick={() => { let nm=mes+1,na=ano; if(nm>11){nm=0;na++;} setMes(nm);setAno(na); }}
            style={{ background:'#2E1A14', border:'1px solid #3A2018', borderRadius:'8px', padding:'3px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'16px' }}>{'>'}</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px', marginBottom:'4px' }}>
          {['D','S','T','Q','Q','S','S'].map((l,i)=>(
            <div key={i} style={{ textAlign:'center', fontSize:'9px', color:'#9A8880', fontWeight:'600', padding:'2px 0' }}>{l}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'3px' }}>
          {cells.map((dia,idx) => {
            if (!dia) return <div key={idx}/>;
            const ds   = mkData(ano, mes, dia);
            const info = mapaDia[ds];
            const ehHoje = ds===hojeStr;
            const ehSel  = ds===dataSel;
            const corPt  = info?.canc&&info?.conf?'#FFC107':info?.canc?'#F44336':info?.conf?'#4CAF50':null;
            return (
              <div key={idx} onClick={()=>setDataSel(ds)}
                style={{ borderRadius:'6px', padding:'5px 2px', textAlign:'center', cursor:'pointer',
                  background:ehSel?'#3A2018':ehHoje?'rgba(232,201,106,0.1)':'transparent',
                  border:ehSel?'1.5px solid #E8C96A':ehHoje?'1px solid rgba(232,201,106,0.3)':'1px solid transparent' }}>
                <div style={{ fontSize:'12px', fontWeight:'700', color:ehHoje?'#E8C96A':ehSel?'#F5EFE6':'#9A8880' }}>{dia}</div>
                {corPt && <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:corPt, margin:'1px auto 0' }}/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista do dia */}
      <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', marginBottom:'8px' }}>
        {barbeiroSel?.nome} — {formatarData(dataSel)} ({agsDia.length} agendamento{agsDia.length!==1?'s':''})
      </div>
      {agsDia.length === 0 ? (
        <div style={{ background:'#231410', borderRadius:'12px', padding:'16px', textAlign:'center', border:'1px solid #3A2018' }}>
          <div style={{ fontSize:'13px', color:'#9A8880' }}>Sem agendamentos neste dia</div>
        </div>
      ) : agsDia.map(ag => {
        const ehCanc = ag.status?.includes('cancelado');
        const ehConc = ag.status === 'concluido';
        const ehConf = ag.status === 'confirmado';
        return (
          <div key={ag.firestoreId} style={{ background:ehCanc?'rgba(244,67,54,0.05)':'#231410', borderRadius:'12px', padding:'12px 14px', border:ehCanc?'1px solid rgba(244,67,54,0.3)':ehConc?'1px solid rgba(46,125,122,0.3)':'1px solid #3A2018', marginBottom:'8px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ fontWeight:'700', fontSize:'14px', color:'#E8C96A', width:'44px', flexShrink:0 }}>{ag.hora}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:'700', fontSize:'13px', color:ehCanc?'#F44336':ehConc?'#2E7D7A':'#F5EFE6' }}>
                  {ag.clienteNome}{ehCanc?' — CANCELADO':''}
                </div>
                <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>
                  💈 {ag.servico} · R$ {(ag.valor||0).toFixed(2).replace('.',',')}
                </div>
              </div>
              {/* ✅ PONTO 3: botões condicionais por status */}
              <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                {ehConf && (
                  <>
                    <button onClick={()=>concluir(ag)}
                      style={{ padding:'5px 8px', borderRadius:'6px', border:'none', background:'rgba(46,125,122,0.2)', color:'#2E7D7A', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>✓</button>
                    <button onClick={()=>cancelar(ag)}
                      style={{ padding:'5px 8px', borderRadius:'6px', border:'none', background:'rgba(244,67,54,0.15)', color:'#F44336', fontSize:'11px', cursor:'pointer' }}>✗</button>
                  </>
                )}
                {/* WhatsApp só para não cancelados */}
                {!ehCanc && ag.clienteTel && (
                  <button onClick={()=>window.open(`https://wa.me/55${ag.clienteTel.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${ag.clienteNome?.split(' ')[0]}! Confirmamos seu agendamento dia ${formatarData(ag.data)} às ${ag.hora} com ${barbeiroSel?.nome}. Te esperamos! ✂️`)}`, '_blank')}
                    style={{ padding:'5px 8px', borderRadius:'6px', border:'none', background:'rgba(37,211,102,0.15)', color:'#25D366', fontSize:'11px', cursor:'pointer' }}>📲</button>
                )}
                {/* ✅ Arquivar só para cancelados */}
                {ehCanc && (
                  <button onClick={()=>arquivar(ag)}
                    title="Arquivar — some da agenda, permanece no histórico"
                    style={{ padding:'5px 8px', borderRadius:'6px', border:'1px solid rgba(155,155,155,0.25)', background:'rgba(155,155,155,0.08)', color:'#777', fontSize:'11px', cursor:'pointer' }}>
                    📦
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

// ─── ABA SERVIÇOS / PLANOS ─────────────────────────────────────
function AbaServicos() {
  const [servicos, setServicos] = React.useState({ avulsos:[], combos:[] });
  const [planos,   setPlanos]   = React.useState([]);
  const [aba2, setAba2]         = React.useState('servicos');

  React.useEffect(() => {
    getDoc(doc(db,'config','servicos')).then(snap => { if(snap.exists()) setServicos(snap.data()); });
    getDocs(collection(db,'planos')).then(snap => setPlanos(snap.docs.map(d=>({id:d.id,...d.data()}))));
  }, []);

  const todos = [...(servicos.avulsos?.filter(s=>s.ativo)||[]), ...(servicos.combos?.filter(s=>s.ativo)||[])];

  return (
    <div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
        {['servicos','planos'].map(t => (
          <button key={t} onClick={() => setAba2(t)}
            style={{ flex:1, padding:'10px', borderRadius:'10px', border:aba2===t?'1.5px solid #E8C96A':'1px solid #3A2018', background:aba2===t?'#2E1A14':'#231410', color:aba2===t?'#E8C96A':'#9A8880', fontSize:'13px', fontWeight:aba2===t?'700':'400', cursor:'pointer' }}>
            {t === 'servicos' ? '✂️ Serviços' : '🎫 Planos'}
          </button>
        ))}
      </div>
      {aba2 === 'servicos' && (
        todos.length === 0
          ? <div style={{ textAlign:'center', padding:'20px', color:'#9A8880' }}>Nenhum serviço configurado</div>
          : todos.map((sv,i) => (
            <div key={i} style={{ background:'#231410', borderRadius:'12px', padding:'12px 14px', border:'1px solid #3A2018', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{sv.nome}</div>
                <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>⏱ {sv.duracao} min</div>
              </div>
              <div style={{ fontSize:'18px', fontWeight:'900', color:'#E8C96A' }}>R$ {(sv.valor||0).toFixed(2).replace('.',',')}</div>
            </div>
          ))
      )}
      {aba2 === 'planos' && (
        planos.length === 0
          ? <div style={{ textAlign:'center', padding:'20px', color:'#9A8880' }}>Nenhum plano configurado</div>
          : planos.map(pl => (
            <div key={pl.id} style={{ background:'linear-gradient(135deg,#2E1A14,#231410)', borderRadius:'14px', padding:'16px', border:'1px solid rgba(232,201,106,0.2)', marginBottom:'10px' }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'16px', color:'#E8C96A', fontWeight:'700', marginBottom:'4px' }}>{pl.nome}</div>
              <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'8px' }}>{pl.descricao}</div>
              <div style={{ fontSize:'22px', fontWeight:'900', color:'#F5EFE6' }}>R$ {(pl.valor||0).toFixed(2).replace('.',',')}<span style={{ fontSize:'12px', color:'#9A8880', fontWeight:'400' }}>/mês</span></div>
              {pl.beneficios && pl.beneficios.map((b,i) => (
                <div key={i} style={{ fontSize:'12px', color:'#4CAF50', marginTop:'4px' }}>✅ {b}</div>
              ))}
            </div>
          ))
      )}
    </div>
  );
}

// ─── ABA CLIENTES ─────────────────────────────────────────────
function AbaClientes() {
  const [busca, setBusca]           = React.useState('');
  const [todos, setTodos]           = React.useState([]);
  const [carregando, setCarr]       = React.useState(true);
  const [clienteSel, setClienteSel] = React.useState(null);
  const [historico, setHistorico]   = React.useState([]);
  const [loadingHist, setLoadHist]  = React.useState(false);

  // ✅ Carrega todos os clientes ao abrir — ordem alfabética
  React.useEffect(() => {
    getDocs(collection(db,'clientes')).then(snap => {
      const lista = snap.docs
        .map(d=>({id:d.id,...d.data()}))
        .filter(c=>c.nome)
        .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
      setTodos(lista);
      setCarr(false);
    }).catch(()=>setCarr(false));
  }, []);

  // ✅ Busca ativa por nome ou telefone com debounce 300ms
  const timer = React.useRef(null);
  function handleBusca(v) {
    setBusca(v);
    clearTimeout(timer.current);
  }

  // Filtra localmente — nome ou telefone
  const filtrados = React.useMemo(() => {
    if (!busca.trim()) return todos;
    const b = busca.toLowerCase().replace(/\D/g,'') || busca.toLowerCase();
    return todos.filter(c => {
      const nome = c.nome?.toLowerCase()||'';
      const tel  = (c.telefone||'').replace(/\D/g,'');
      return nome.includes(busca.toLowerCase()) || tel.includes(b);
    });
  }, [busca, todos]);

  // ✅ Ao clicar no cliente — carrega histórico de agendamentos
  async function abrirHistorico(c) {
    setClienteSel(c);
    setLoadHist(true);
    try {
      const snap = await getDocs(
        query(collection(db,'agendamentos'),
          where('clienteCpf','==',c.cpf||c.id),
          // orderBy removido para evitar índice composto
        )
      );
      const ags = snap.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>b.data?.localeCompare(a.data)||b.hora?.localeCompare(a.hora));
      setHistorico(ags);
    } catch(e) { console.error(e); setHistorico([]); }
    setLoadHist(false);
  }

  function formatarData(s) { if(!s)return''; const[a,m,d]=s.split('-'); return`${d}/${m}/${a}`; }

  // ─── Tela de histórico do cliente ───
  if (clienteSel) {
    return (
      <div>
        <button onClick={()=>{setClienteSel(null);setHistorico([]);}}
          style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'14px', cursor:'pointer', marginBottom:'16px', display:'flex', alignItems:'center', gap:'6px' }}>
          ← Voltar à lista
        </button>
        {/* Card do cliente */}
        <div style={{ background:'linear-gradient(135deg,#2E1A14,#231410)', borderRadius:'14px', padding:'16px', border:'1px solid #8B3A2A', marginBottom:'16px', display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>
            {clienteSel.nome?.charAt(0)||'?'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'16px', color:'#F5EFE6', fontWeight:'700' }}>{clienteSel.nome}</div>
            <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>📞 {clienteSel.telefone||'—'}</div>
            <div style={{ fontSize:'11px', color:'#9A8880' }}>CPF: {clienteSel.cpf||'—'}</div>
          </div>
          {clienteSel.telefone && (
            <button onClick={()=>window.open(`https://wa.me/55${clienteSel.telefone.replace(/\D/g,'')}`, '_blank')}
              style={{ padding:'8px 12px', borderRadius:'10px', border:'none', background:'rgba(37,211,102,0.15)', color:'#25D366', fontSize:'12px', cursor:'pointer' }}>📲</button>
          )}
        </div>
        {/* Histórico */}
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>
          Histórico de agendamentos
        </div>
        {loadingHist ? (
          <div style={{ textAlign:'center', padding:'30px', color:'#9A8880' }}>⏳ Carregando...</div>
        ) : historico.length === 0 ? (
          <div style={{ textAlign:'center', padding:'30px', color:'#9A8880', fontSize:'13px' }}>Nenhum agendamento encontrado</div>
        ) : historico.map(ag => {
          const ehCanc = ag.status?.includes('cancelado');
          const ehConc = ag.status === 'concluido';
          return (
            <div key={ag.id} style={{ background:'#231410', borderRadius:'12px', padding:'12px 14px', border:`1px solid ${ehCanc?'rgba(244,67,54,0.25)':ehConc?'rgba(46,125,122,0.25)':'#3A2018'}`, marginBottom:'8px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:'700', fontSize:'13px', color:'#F5EFE6' }}>{ag.servico}</div>
                  <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>✂️ {ag.barbeiroNome} · {formatarData(ag.data)} às {ag.hora}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'13px', fontWeight:'700', color:'#E8C96A' }}>R$ {(ag.valor||0).toFixed(2).replace('.',',')}</div>
                  <div style={{ fontSize:'10px', marginTop:'3px', padding:'2px 7px', borderRadius:'8px', fontWeight:'600',
                    background:ehCanc?'rgba(244,67,54,0.15)':ehConc?'rgba(46,125,122,0.15)':'rgba(76,175,80,0.15)',
                    color:ehCanc?'#F44336':ehConc?'#2E7D7A':'#4CAF50' }}>
                    {ehCanc?'✗ Cancelado':ehConc?'✓ Concluído':'● Confirmado'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Lista de clientes ───
  return (
    <div>
      {/* Busca */}
      <input type="text" placeholder="🔍 Buscar por nome ou telefone..." value={busca}
        onChange={e=>handleBusca(e.target.value)}
        style={{ width:'100%', background:'#231410', border:'1px solid #3A2018', borderRadius:'12px', padding:'10px 14px', color:'#F5EFE6', fontSize:'14px', outline:'none', boxSizing:'border-box', marginBottom:'10px' }} />
      <div style={{ fontSize:'11px', color:'#9A8880', marginBottom:'12px' }}>
        👥 {filtrados.length} cliente{filtrados.length!==1?'s':''} cadastrado{filtrados.length!==1?'s':''}
        {busca && ` · filtrando por "${busca}"`}
      </div>
      {carregando ? (
        <div style={{ textAlign:'center', padding:'40px', color:'#9A8880' }}>⏳ Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign:'center', padding:'30px', color:'#9A8880', fontSize:'13px' }}>Nenhum cliente encontrado</div>
      ) : filtrados.map(c => (
        <div key={c.id} onClick={()=>abrirHistorico(c)}
          style={{ background:'#231410', borderRadius:'12px', padding:'12px 14px', border:'1px solid #3A2018', marginBottom:'8px', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', transition:'background 0.15s' }}
          onMouseEnter={e=>e.currentTarget.style.background='#2A1810'}
          onMouseLeave={e=>e.currentTarget.style.background='#231410'}>
          <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>
            {c.nome?.charAt(0)||'?'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:'700', fontSize:'14px', color:'#F5EFE6' }}>{c.nome}</div>
            <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>📞 {c.telefone||'—'} · CPF: {c.cpf||'—'}</div>
          </div>
          <div style={{ fontSize:'11px', color:'#555' }}>Ver histórico →</div>
        </div>
      ))}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function PainelRecepcao({ onBack, dark }) {
  const s = getStyles(dark);
  const [aba, setAba] = React.useState('agenda');

  const ABAS = [
    { id:'agenda',   label:'📅 Agenda'  },
    { id:'clientes', label:'👥 Clientes' },
    { id:'servicos', label:'💈 Serviços' },
  ];

  return (
    <div style={{ ...s.app, paddingBottom:'30px' }}>
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>Painel da Recepção</div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>Flyguer BarberShop</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', padding:'12px 16px', borderBottom:'1px solid #3A2018' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding:'10px 4px', borderRadius:'12px', border:aba===a.id?'1.5px solid #E8C96A':'1px solid #3A2018', background:aba===a.id?'#2E1A14':'#231410', color:aba===a.id?'#E8C96A':'#9A8880', fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>
      <div style={{ padding:'16px' }}>
        {aba === 'agenda'   && <AbaAgenda />}
        {aba === 'clientes' && <AbaClientes />}
        {aba === 'servicos' && <AbaServicos />}
      </div>
    </div>
  );
}
