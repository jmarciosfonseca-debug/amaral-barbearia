// PainelRecepcao.jsx — Flyguer BarberShop v5
// ✅ Notificações tempo real globais (independente de aba/barbeiro selecionado)
// ✅ Sino sempre visível, popup persistente até fechar manualmente
// ✅ Encaixe manual — agendamento na hora pela recepção
// ✅ Controle de caixa — registrar pagamento por forma (Dinheiro/Pix/Débito/Crédito)
// ✅ Dashboard do dia com receita real

import React from 'react';
import { db } from './firebase';
import {
  collection, query, where, onSnapshot,
  doc, getDoc, getDocs, updateDoc, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { getStyles } from './getStyles';
import CaptarClientes from './CaptarClientes';

// ✅ Ponto 4: helper WhatsApp — desktop usa web.whatsapp.com, mobile usa wa.me
function abrirWhatsApp(tel, texto) {
  const encoded = encodeURIComponent(texto);
  const num = tel.replace(/\D/g, '');
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  const url = isDesktop
    ? `https://web.whatsapp.com/send?phone=55${num}&text=${encoded}`
    : `https://wa.me/55${num}?text=${encoded}`;
  window.open(url, '_blank');
}


// ─── HELPERS ─────────────────────────────────────────────────
function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatarData(s) { if(!s)return''; const[a,m,d]=s.split('-'); return`${d}/${m}/${a}`; }
function mkData(a,m,d) { return`${a}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function tocarSino() {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [880,1100,880].forEach((freq,i)=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      osc.frequency.value=freq; osc.type='sine';
      gain.gain.setValueAtTime(0.3,ctx.currentTime+i*0.15);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.15+0.3);
      osc.start(ctx.currentTime+i*0.15);osc.stop(ctx.currentTime+i*0.15+0.3);
    });
  } catch(e){}
}

const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const FORMAS_PAG=[
  {id:'dinheiro',label:'💵 Dinheiro'},
  {id:'pix',     label:'💜 Pix'},
  {id:'debito',  label:'💳 Débito'},
  {id:'credito', label:'💳 Crédito'},
];

// ─── MODAL PAGAMENTO ──────────────────────────────────────────
function ModalPagamento({ ag, onConfirmar, onFechar }) {
  const [forma, setForma]   = React.useState('dinheiro');
  const [valor, setValor]   = React.useState((ag.valor||0).toFixed(2));
  const [salvando, setSalv] = React.useState(false);

  async function confirmar() {
    setSalv(true);
    try {
      await updateDoc(doc(db,'agendamentos',ag.firestoreId), {
        pago:true,
        formaPagamento:forma,
        valorRecebido:parseFloat(valor)||0,
        pagoEm:serverTimestamp(),
        status:'concluido',
        concluidoEm:serverTimestamp(),
      });
      onConfirmar();
    } catch(e){console.error(e);}
    setSalv(false);
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:9999}}>
      <div style={{background:'#1A0F0D',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:'900px',padding:'24px 20px 40px',border:'1px solid #3A2018',borderBottom:'none'}}>
        <div style={{textAlign:'center',marginBottom:'20px'}}>
          <div style={{fontSize:'32px',marginBottom:'8px'}}>💰</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:'18px',color:'#F5EFE6'}}>Registrar Pagamento</div>
          <div style={{fontSize:'13px',color:'#9A8880',marginTop:'4px'}}>{ag.clienteNome} · {ag.servico}</div>
        </div>
        <div style={{marginBottom:'16px'}}>
          <label style={{fontSize:'11px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',display:'block',marginBottom:'8px'}}>Valor recebido</label>
          <input type="number" value={valor} onChange={e=>setValor(e.target.value)} step="0.01"
            style={{width:'100%',background:'#231410',border:'1px solid #3A2018',borderRadius:'12px',padding:'14px',color:'#E8C96A',fontSize:'22px',fontWeight:'700',outline:'none',boxSizing:'border-box',textAlign:'center'}}/>
        </div>
        <div style={{marginBottom:'20px'}}>
          <label style={{fontSize:'11px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',display:'block',marginBottom:'8px'}}>Forma de pagamento</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {FORMAS_PAG.map(f=>(
              <button key={f.id} onClick={()=>setForma(f.id)}
                style={{padding:'12px',borderRadius:'12px',border:forma===f.id?'1.5px solid #E8C96A':'1px solid #3A2018',background:forma===f.id?'#2E1A14':'#231410',color:forma===f.id?'#E8C96A':'#9A8880',fontSize:'14px',fontWeight:forma===f.id?'700':'400',cursor:'pointer'}}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <button onClick={onFechar} style={{flex:1,padding:'14px',borderRadius:'14px',border:'1px solid #3A2018',background:'#2E1A14',color:'#9A8880',fontSize:'14px',cursor:'pointer'}}>Cancelar</button>
          <button onClick={confirmar} disabled={salvando}
            style={{flex:2,padding:'14px',borderRadius:'14px',border:'none',background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)',color:'#F5EFE6',fontSize:'14px',fontWeight:'700',cursor:salvando?'wait':'pointer'}}>
            {salvando?'⏳ Salvando...':'✅ Confirmar recebimento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ABA AGENDA ───────────────────────────────────────────────
function AbaAgenda({ onEncaixe, agendamentosGlobais=[] }) {
  const [barbeiros, setBarbeiros]       = React.useState([]);
  const [barbeiroSel, setBarbeiroSel]   = React.useState(null);
  // ✅ agendamentos vêm do stream global (prop) — sem estado local nem listener por barbeiro
  const [dataSel, setDataSel]           = React.useState(hoje());
  const [mes, setMes]                   = React.useState(new Date().getMonth());
  const [ano, setAno]                   = React.useState(new Date().getFullYear());
  const [modalPag, setModalPag]         = React.useState(null);

  const hojeStr = mkData(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  React.useEffect(()=>{
    getDocs(query(collection(db,'barbeiros'),where('ativo','==',true))).then(snap=>{
      const lista=snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.papel!=='recepcao');
      setBarbeiros(lista);
      if(lista.length>0)setBarbeiroSel(lista[0]);
    });
  },[]);

  // ✅ Ponto 2: sem listener por barbeiro — agendamentos vêm do stream global do PainelRecepcao
  // O filtro por barbeiroSel é feito localmente em memória abaixo

  const primeiroDia=new Date(ano,mes,1).getDay();
  const diasNoMes=new Date(ano,mes+1,0).getDate();
  const mapaDia={};
  agsBarbeiro.forEach(ag=>{
    if(!ag.data)return;
    if(!mapaDia[ag.data])mapaDia[ag.data]={conf:0,canc:0};
    if(['confirmado','pendente'].includes(ag.status))mapaDia[ag.data].conf++;
    else if(ag.status?.includes('cancelado'))mapaDia[ag.data].canc++;
  });
  const cells=[];
  for(let i=0;i<primeiroDia;i++)cells.push(null);
  for(let d=1;d<=diasNoMes;d++)cells.push(d);

  // ✅ Filtro: sem arquivados
  // ✅ Filtro local: barbeiro selecionado + data + sem arquivados
  const agsBarbeiro = barbeiroSel ? agendamentosGlobais.filter(ag=>ag.barbeiroId===barbeiroSel.id) : [];
  const agsDia=agsBarbeiro.filter(ag=>ag.data===dataSel&&!ag.arquivado).sort((a,b)=>a.hora?.localeCompare(b.hora));

  async function concluir(ag){await updateDoc(doc(db,'agendamentos',ag.firestoreId),{status:'concluido',concluidoEm:serverTimestamp()});}
  async function cancelar(ag){await updateDoc(doc(db,'agendamentos',ag.firestoreId),{status:'cancelado_barbeiro',canceladoEm:serverTimestamp()});}
  async function arquivar(ag){await updateDoc(doc(db,'agendamentos',ag.firestoreId),{arquivado:true,arquivadoEm:serverTimestamp()});}

  return (
    <div>
      {/* Seletor de barbeiro */}
      <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'8px',marginBottom:'14px'}}>
        {barbeiros.map(b=>(
          <div key={b.id} onClick={()=>setBarbeiroSel(b)}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 14px',borderRadius:'20px',border:barbeiroSel?.id===b.id?'1.5px solid #E8C96A':'1px solid #3A2018',background:barbeiroSel?.id===b.id?'#2E1A14':'#231410',cursor:'pointer',flexShrink:0}}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',color:'#F5EFE6',overflow:'hidden',flexShrink:0}}>
              {b.foto?<img src={b.foto} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:b.nome?.charAt(0)}
            </div>
            <span style={{fontSize:'13px',fontWeight:'600',color:barbeiroSel?.id===b.id?'#E8C96A':'#F5EFE6',whiteSpace:'nowrap'}}>{b.nome?.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div style={{background:'#1A0F0D',borderRadius:'14px',padding:'12px',marginBottom:'12px',border:'1px solid #3A2018'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
          <button onClick={()=>{let nm=mes-1,na=ano;if(nm<0){nm=11;na--;}setMes(nm);setAno(na);}}
            style={{background:'#2E1A14',border:'1px solid #3A2018',borderRadius:'8px',padding:'3px 10px',color:'#F5EFE6',cursor:'pointer',fontSize:'16px'}}>{'<'}</button>
          <div style={{fontSize:'14px',color:'#E8C96A',fontWeight:'700'}}>{MESES[mes]} {ano}</div>
          <button onClick={()=>{let nm=mes+1,na=ano;if(nm>11){nm=0;na++;}setMes(nm);setAno(na);}}
            style={{background:'#2E1A14',border:'1px solid #3A2018',borderRadius:'8px',padding:'3px 10px',color:'#F5EFE6',cursor:'pointer',fontSize:'16px'}}>{'>'}</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',marginBottom:'4px'}}>
          {['D','S','T','Q','Q','S','S'].map((l,i)=>(
            <div key={i} style={{textAlign:'center',fontSize:'9px',color:'#9A8880',fontWeight:'600',padding:'2px 0'}}>{l}</div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'3px'}}>
          {cells.map((dia,idx)=>{
            if(!dia)return<div key={idx}/>;
            const ds=mkData(ano,mes,dia);
            const info=mapaDia[ds];
            const ehHoje=ds===hojeStr,ehSel=ds===dataSel;
            const corPt=info?.canc&&info?.conf?'#FFC107':info?.canc?'#F44336':info?.conf?'#4CAF50':null;
            return(
              <div key={idx} onClick={()=>setDataSel(ds)}
                style={{borderRadius:'6px',padding:'5px 2px',textAlign:'center',cursor:'pointer',
                  background:ehSel?'#3A2018':ehHoje?'rgba(232,201,106,0.1)':'transparent',
                  border:ehSel?'1.5px solid #E8C96A':ehHoje?'1px solid rgba(232,201,106,0.3)':'1px solid transparent'}}>
                <div style={{fontSize:'12px',fontWeight:'700',color:ehHoje?'#E8C96A':ehSel?'#F5EFE6':'#9A8880'}}>{dia}</div>
                {corPt&&<div style={{width:'4px',height:'4px',borderRadius:'50%',background:corPt,margin:'1px auto 0'}}/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Header da lista + botão encaixe */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
        <div style={{fontSize:'12px',color:'#E8C96A',fontWeight:'700'}}>
          {barbeiroSel?.nome} — {formatarData(dataSel)} ({agsDia.length})
        </div>
        <button onClick={()=>onEncaixe(barbeiroSel,dataSel)}
          style={{padding:'6px 12px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',color:'#F5EFE6',fontSize:'12px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
          ➕ Encaixe
        </button>
      </div>

      {/* Lista do dia */}
      {agsDia.length===0?(
        <div style={{background:'#231410',borderRadius:'12px',padding:'20px',textAlign:'center',border:'1px solid #3A2018'}}>
          <div style={{fontSize:'13px',color:'#9A8880',marginBottom:'8px'}}>Sem agendamentos neste dia</div>
          <button onClick={()=>onEncaixe(barbeiroSel,dataSel)}
            style={{padding:'8px 16px',borderRadius:'10px',border:'none',background:'rgba(139,58,42,0.3)',color:'#E8C96A',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>
            ➕ Fazer encaixe agora
          </button>
        </div>
      ):agsDia.map(ag=>{
        const ehCanc=ag.status?.includes('cancelado');
        const ehConc=ag.status==='concluido';
        const ehConf=ag.status==='confirmado'||ag.status==='pendente';
        const ehPago=ag.pago;
        return(
          <div key={ag.firestoreId} style={{background:ehCanc?'rgba(244,67,54,0.05)':'#231410',borderRadius:'12px',padding:'12px 14px',border:ehCanc?'1px solid rgba(244,67,54,0.3)':ehConc?'1px solid rgba(46,125,122,0.3)':'1px solid #3A2018',marginBottom:'8px'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
              <div style={{fontWeight:'700',fontSize:'15px',color:'#E8C96A',width:'44px',flexShrink:0,paddingTop:'2px'}}>{ag.hora}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:'700',fontSize:'13px',color:ehCanc?'#F44336':ehConc?'#2E7D7A':'#F5EFE6'}}>
                  {ag.clienteNome}{ehCanc?' — CANCELADO':''}
                </div>
                <div style={{fontSize:'11px',color:'#9A8880',marginTop:'2px'}}>💈 {ag.servico} · R$ {(ag.valor||0).toFixed(2).replace('.',',')}</div>
                {ehPago&&(
                  <div style={{fontSize:'10px',color:'#4CAF50',marginTop:'2px'}}>
                    ✅ Pago · {FORMAS_PAG.find(f=>f.id===ag.formaPagamento)?.label||ag.formaPagamento} · R$ {(ag.valorRecebido||0).toFixed(2).replace('.',',')}
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:'5px',flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
                {ehConf&&!ehPago&&(
                  <button onClick={()=>setModalPag(ag)}
                    style={{padding:'5px 8px',borderRadius:'6px',border:'none',background:'rgba(232,201,106,0.2)',color:'#E8C96A',fontSize:'11px',fontWeight:'700',cursor:'pointer'}}>
                    💰
                  </button>
                )}
                {ehConf&&(
                  <button onClick={()=>concluir(ag)}
                    style={{padding:'5px 8px',borderRadius:'6px',border:'none',background:'rgba(46,125,122,0.2)',color:'#2E7D7A',fontSize:'11px',fontWeight:'700',cursor:'pointer'}}>✓</button>
                )}
                {ehConf&&(
                  <button onClick={()=>cancelar(ag)}
                    style={{padding:'5px 8px',borderRadius:'6px',border:'none',background:'rgba(244,67,54,0.15)',color:'#F44336',fontSize:'11px',cursor:'pointer'}}>✗</button>
                )}
                {!ehCanc&&ag.clienteTel&&(
                  <button onClick={()=>window.open(`https://wa.me/55${ag.clienteTel.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${ag.clienteNome?.split(' ')[0]}! Confirmamos seu agendamento dia ${formatarData(ag.data)} às ${ag.hora} com ${barbeiroSel?.nome}. Te esperamos! ✂️`)}`, '_blank')}
                    style={{padding:'5px 8px',borderRadius:'6px',border:'none',background:'rgba(37,211,102,0.15)',color:'#25D366',fontSize:'11px',cursor:'pointer'}}>📲</button>
                )}
                {ehCanc&&(
                  <button onClick={()=>arquivar(ag)} title="Arquivar"
                    style={{padding:'5px 8px',borderRadius:'6px',border:'1px solid rgba(155,155,155,0.25)',background:'rgba(155,155,155,0.08)',color:'#777',fontSize:'11px',cursor:'pointer'}}>📦</button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {modalPag&&<ModalPagamento ag={modalPag} onConfirmar={()=>setModalPag(null)} onFechar={()=>setModalPag(null)}/>}
    </div>
  );
}

// ─── ABA ENCAIXE ─────────────────────────────────────────────
function AbaEncaixe({ barbeiroInicial, dataInicial, onConcluir }) {
  const [barbeiros, setBarbeiros] = React.useState([]);
  const [barbeiro, setBarbeiro]   = React.useState(barbeiroInicial||null);
  const [servicos, setServicos]   = React.useState([]);
  const [servico, setServico]     = React.useState(null);
  const [dataSel, setDataSel]     = React.useState(dataInicial||hoje());
  const [horaSel, setHoraSel]     = React.useState(null);
  const [horarios, setHorarios]   = React.useState([]);
  const [config, setConfig]       = React.useState(null);
  const [nomeCliente, setNome]    = React.useState('');
  const [telCliente, setTel]      = React.useState('');
  const [salvando, setSalv]       = React.useState(false);
  const [erro, setErro]           = React.useState('');
  const [formaPag, setFormaPag]   = React.useState('dinheiro');
  const DIAS_KEYS=['dom','seg','ter','qua','qui','sex','sab'];

  React.useEffect(()=>{
    getDocs(query(collection(db,'barbeiros'),where('ativo','==',true))).then(snap=>{
      const lista=snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.papel!=='recepcao');
      setBarbeiros(lista);
      if(!barbeiroInicial&&lista.length>0)setBarbeiro(lista[0]);
    });
    getDoc(doc(db,'config','barbearia')).then(snap=>{if(snap.exists())setConfig(snap.data());});
    getDoc(doc(db,'config','servicos')).then(snap=>{
      if(snap.exists()){
        const d=snap.data();
        const todos=[...(d.avulsos?.filter(s=>s.ativo)||[]),...(d.combos?.filter(s=>s.ativo)||[])];
        setServicos(todos);
        if(todos.length>0)setServico(todos[0]);
      }
    });
  },[]);

  React.useEffect(()=>{
    if(!barbeiro||!dataSel||!config||!servico)return;
    const diaSem=DIAS_KEYS[new Date(dataSel+'T12:00:00').getDay()];
    const hc=config.horarios?.[diaSem];
    if(!hc?.aberto){setHorarios([]);return;}
    getDocs(query(collection(db,'agendamentos'),where('data','==',dataSel))).then(snap=>{
      const ocupadas=snap.docs.map(d=>d.data()).filter(a=>a.barbeiroId===barbeiro.id&&['confirmado','pendente'].includes(a.status)).map(a=>a.hora);
      const slots=[];
      const[hA,mA]=hc.abertura.split(':').map(Number);
      const[hF,mF]=hc.fechamento.split(':').map(Number);
      let atual=hA*60+mA,fim=hF*60+mF;
      // Slots de 30min
      while(atual+30<=fim){
        const hora=`${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`;
        slots.push({hora,disponivel:!ocupadas.includes(hora)});
        atual+=30;
      }
      setHorarios(slots);
    });
  },[barbeiro,dataSel,config,servico]);

  async function confirmar(){
    if(!barbeiro||!servico||!horaSel){setErro('Selecione barbeiro, serviço e horário');return;}
    setSalv(true);setErro('');
    try{
      const nome=nomeCliente.trim()||'Cliente Encaixe';
      const ag={
        clienteCpf:`encaixe_${Date.now()}`,
        clienteNome:nome,
        clienteTel:telCliente.replace(/\D/g,'')||'',
        barbeiroId:barbeiro.id,barbeiroNome:barbeiro.nome,
        servico:servico.nome,valor:servico.valor,duracao:servico.duracao,
        data:dataSel,hora:horaSel,
        pagamento:formaPag,sinal:0,
        status:'confirmado',agendadoPor:'recepcao',
        criadoEm:serverTimestamp(),
      };
      await addDoc(collection(db,'agendamentos'),ag);
      onConcluir();
    }catch(e){setErro('Erro: '+e.message);}
    setSalv(false);
  }

  return (
    <div style={{paddingBottom:'20px'}}>
      <div style={{background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)',borderRadius:'14px',padding:'14px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
        <div style={{fontSize:'28px'}}>➕</div>
        <div>
          <div style={{fontWeight:'700',fontSize:'15px',color:'#fff'}}>Encaixe Manual</div>
          <div style={{fontSize:'12px',color:'rgba(255,255,255,0.8)'}}>Agendamento imediato pela recepção</div>
        </div>
      </div>

      {/* Barbeiro */}
      <div style={{fontSize:'11px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Barbeiro</div>
      <div style={{display:'flex',gap:'8px',marginBottom:'16px',overflowX:'auto',paddingBottom:'4px'}}>
        {barbeiros.map(b=>(
          <div key={b.id} onClick={()=>{setBarbeiro(b);setHoraSel(null);}}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 14px',borderRadius:'20px',border:barbeiro?.id===b.id?'1.5px solid #E8C96A':'1px solid #3A2018',background:barbeiro?.id===b.id?'#2E1A14':'#231410',cursor:'pointer',flexShrink:0}}>
            <span style={{fontSize:'13px',fontWeight:'600',color:barbeiro?.id===b.id?'#E8C96A':'#F5EFE6'}}>{b.nome?.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {/* Serviço */}
      <div style={{fontSize:'11px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Serviço</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'16px'}}>
        {servicos.map(sv=>(
          <div key={sv.id||sv.nome} onClick={()=>setServico(sv)}
            style={{padding:'8px 14px',borderRadius:'10px',border:servico?.nome===sv.nome?'1.5px solid #E8C96A':'1px solid #3A2018',background:servico?.nome===sv.nome?'#2E1A14':'#231410',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{fontSize:'12px',color:servico?.nome===sv.nome?'#E8C96A':'#F5EFE6',fontWeight:servico?.nome===sv.nome?'700':'400'}}>{sv.nome}</span>
            <span style={{fontSize:'11px',color:'#9A8880'}}>R$ {(sv.valor||0).toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Data */}
      <div style={{fontSize:'11px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Data</div>
      <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'4px',marginBottom:'16px'}}>
        {Array.from({length:7},(_,i)=>{
          const d=new Date(); d.setDate(d.getDate()+i);
          const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const sel=ds===dataSel;
          return(
            <div key={ds} onClick={()=>{setDataSel(ds);setHoraSel(null);}}
              style={{minWidth:'52px',padding:'8px 6px',borderRadius:'12px',textAlign:'center',cursor:'pointer',background:sel?'#8B3A2A':'#231410',border:sel?'1.5px solid #E8C96A':'1px solid #3A2018',flexShrink:0}}>
              <div style={{fontSize:'9px',color:sel?'#E8C96A':'#9A8880',fontWeight:'600'}}>
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()]}
              </div>
              <div style={{fontSize:'16px',fontWeight:'700',color:'#F5EFE6'}}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Horários */}
      {horarios.length>0&&(
        <>
          <div style={{fontSize:'11px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Horário</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'6px',marginBottom:'16px'}}>
            {horarios.map(h=>(
              <div key={h.hora} onClick={()=>h.disponivel&&setHoraSel(h.hora)}
                style={{padding:'8px 4px',borderRadius:'8px',textAlign:'center',cursor:h.disponivel?'pointer':'not-allowed',
                  background:horaSel===h.hora?'#8B3A2A':h.disponivel?'#231410':'#1A0F0D',
                  border:horaSel===h.hora?'1.5px solid #E8C96A':'1px solid #3A2018',
                  opacity:h.disponivel?1:0.35}}>
                <div style={{fontSize:'12px',fontWeight:'700',color:horaSel===h.hora?'#F5EFE6':h.disponivel?'#F5EFE6':'#555'}}>{h.hora}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {horarios.length===0&&barbeiro&&(
        <div style={{textAlign:'center',padding:'12px',color:'#9A8880',fontSize:'12px',marginBottom:'16px'}}>Dia fechado ou sem horários disponíveis</div>
      )}

      {/* Nome e telefone */}
      <div style={{fontSize:'11px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Cliente (opcional)</div>
      <input type="text" placeholder="Nome do cliente (ou deixe em branco)" value={nomeCliente} onChange={e=>setNome(e.target.value)}
        style={{width:'100%',background:'#231410',border:'1px solid #3A2018',borderRadius:'10px',padding:'10px 14px',color:'#F5EFE6',fontSize:'14px',outline:'none',boxSizing:'border-box',marginBottom:'8px'}}/>
      <input type="tel" placeholder="Telefone (opcional)" value={telCliente} onChange={e=>setTel(e.target.value)}
        style={{width:'100%',background:'#231410',border:'1px solid #3A2018',borderRadius:'10px',padding:'10px 14px',color:'#F5EFE6',fontSize:'14px',outline:'none',boxSizing:'border-box',marginBottom:'16px'}}/>

      {/* Forma de pagamento */}
      <div style={{fontSize:'11px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Pagamento previsto</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'20px'}}>
        {FORMAS_PAG.map(f=>(
          <button key={f.id} onClick={()=>setFormaPag(f.id)}
            style={{padding:'10px',borderRadius:'10px',border:formaPag===f.id?'1.5px solid #E8C96A':'1px solid #3A2018',background:formaPag===f.id?'#2E1A14':'#231410',color:formaPag===f.id?'#E8C96A':'#9A8880',fontSize:'13px',fontWeight:formaPag===f.id?'700':'400',cursor:'pointer'}}>
            {f.label}
          </button>
        ))}
      </div>

      {erro&&<div style={{fontSize:'12px',color:'#F44336',marginBottom:'12px',textAlign:'center',background:'rgba(244,67,54,0.1)',borderRadius:'8px',padding:'10px'}}>⚠️ {erro}</div>}

      <button onClick={confirmar} disabled={salvando||!barbeiro||!servico||!horaSel}
        style={{width:'100%',padding:'14px',borderRadius:'14px',border:'none',background:(!barbeiro||!servico||!horaSel)?'#2E1A14':'linear-gradient(135deg,#2E7D7A,#3A9E9A)',color:(!barbeiro||!servico||!horaSel)?'#555':'#F5EFE6',fontSize:'15px',fontWeight:'700',cursor:(!barbeiro||!servico||!horaSel)||salvando?'not-allowed':'pointer'}}>
        {salvando?'⏳ Confirmando...':'✅ Confirmar encaixe'}
      </button>
    </div>
  );
}

// ─── ABA SERVIÇOS ─────────────────────────────────────────────
function AbaServicos() {
  const [servicos, setServicos] = React.useState({ avulsos:[], combos:[] });
  const [planos,   setPlanos]   = React.useState([]);
  const [aba2, setAba2]         = React.useState('servicos');
  React.useEffect(()=>{
    getDoc(doc(db,'config','servicos')).then(snap=>{if(snap.exists())setServicos(snap.data());});
    getDocs(collection(db,'planos')).then(snap=>setPlanos(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[]);
  const todos=[...(servicos.avulsos?.filter(s=>s.ativo)||[]),...(servicos.combos?.filter(s=>s.ativo)||[])];
  return (
    <div>
      <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
        {['servicos','planos'].map(t=>(
          <button key={t} onClick={()=>setAba2(t)}
            style={{flex:1,padding:'10px',borderRadius:'10px',border:aba2===t?'1.5px solid #E8C96A':'1px solid #3A2018',background:aba2===t?'#2E1A14':'#231410',color:aba2===t?'#E8C96A':'#9A8880',fontSize:'13px',fontWeight:aba2===t?'700':'400',cursor:'pointer'}}>
            {t==='servicos'?'✂️ Serviços':'🎫 Planos'}
          </button>
        ))}
      </div>
      {aba2==='servicos'&&(todos.length===0?<div style={{textAlign:'center',padding:'20px',color:'#9A8880'}}>Nenhum serviço configurado</div>:todos.map((sv,i)=>(
        <div key={i} style={{background:'#231410',borderRadius:'12px',padding:'12px 14px',border:'1px solid #3A2018',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:'700',fontSize:'14px',color:'#F5EFE6'}}>{sv.nome}</div>
            <div style={{fontSize:'12px',color:'#9A8880',marginTop:'2px'}}>⏱ {sv.duracao} min</div>
          </div>
          <div style={{fontSize:'18px',fontWeight:'900',color:'#E8C96A'}}>R$ {(sv.valor||0).toFixed(2).replace('.',',')}</div>
        </div>
      )))}
      {aba2==='planos'&&(planos.length===0?<div style={{textAlign:'center',padding:'20px',color:'#9A8880'}}>Nenhum plano configurado</div>:planos.map(pl=>(
        <div key={pl.id} style={{background:'linear-gradient(135deg,#2E1A14,#231410)',borderRadius:'14px',padding:'16px',border:'1px solid rgba(232,201,106,0.2)',marginBottom:'10px'}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:'16px',color:'#E8C96A',fontWeight:'700',marginBottom:'4px'}}>{pl.nome}</div>
          <div style={{fontSize:'12px',color:'#9A8880',marginBottom:'8px'}}>{pl.descricao}</div>
          <div style={{fontSize:'22px',fontWeight:'900',color:'#F5EFE6'}}>R$ {(pl.valor||0).toFixed(2).replace('.',',')}<span style={{fontSize:'12px',color:'#9A8880',fontWeight:'400'}}>/mês</span></div>
          {pl.beneficios&&pl.beneficios.map((b,i)=>(<div key={i} style={{fontSize:'12px',color:'#4CAF50',marginTop:'4px'}}>✅ {b}</div>))}
        </div>
      )))}
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

  React.useEffect(()=>{
    getDocs(collection(db,'clientes')).then(snap=>{
      setTodos(snap.docs.map(d=>({id:d.id,...d.data()})).filter(c=>c.nome).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')));
      setCarr(false);
    }).catch(()=>setCarr(false));
  },[]);

  const filtrados=React.useMemo(()=>{
    if(!busca.trim())return todos;
    const b=busca.toLowerCase();
    return todos.filter(c=>(c.nome||'').toLowerCase().includes(b)||(c.telefone||'').includes(busca));
  },[busca,todos]);

  const [assinatura, setAssinatura] = React.useState(null); // ✅ Ponto 5: badge VIP

  async function abrirHistorico(c){
    setClienteSel(c);setLoadHist(true);setAssinatura(null);
    try{
      const snap=await getDocs(query(collection(db,'agendamentos'),where('clienteCpf','==',c.cpf||c.id)));
      setHistorico(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.data?.localeCompare(a.data)||b.hora?.localeCompare(a.hora)));
      // ✅ Ponto 5: lê assinaturaResumo do documento do cliente para badge no balcão
      if(c.assinaturaResumo?.assinaturaAtiva){
        setAssinatura(c.assinaturaResumo);
      }
    }catch(e){console.error(e);setHistorico([]);}
    setLoadHist(false);
  }

  async function darBaixaCorte(){
    if(!clienteSel?.assinaturaResumo?.assinaturaAtiva)return;
    const novoResumo={...clienteSel.assinaturaResumo, cortesRestantes:Math.max(0,(clienteSel.assinaturaResumo.cortesRestantes||0)-1)};
    try{
      await updateDoc(doc(db,'clientes',clienteSel.id),{assinaturaResumo:novoResumo});
      setAssinatura(novoResumo);
      setClienteSel(prev=>({...prev,assinaturaResumo:novoResumo}));
    }catch(e){console.error(e);}
  }

  async function gerarPDF(){
    if(!window.jspdf){
      await new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
      });
    }
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const W=210,nome=clienteSel.nome||'Cliente';
    const total=historico.filter(a=>!a.status?.includes('cancelado')).reduce((s,a)=>s+(a.valor||0),0);
    pdf.setFillColor(92,34,24);pdf.rect(0,0,W,42,'F');
    pdf.setTextColor(232,201,106);pdf.setFontSize(22);pdf.setFont('helvetica','bold');
    pdf.text('Flyguer BarberShop',W/2,16,{align:'center'});
    pdf.setFontSize(9);pdf.setTextColor(245,239,230);pdf.setFont('helvetica','normal');
    pdf.text('Nossa Arte, Seu Estilo.',W/2,23,{align:'center'});
    pdf.text('Shopping Cidade das Artes - Piso 2, No 22 - Sao Paulo, SP',W/2,29,{align:'center'});
    pdf.text('(11) 97764-3509  |  flyguer-barbershop.vercel.app',W/2,35,{align:'center'});
    pdf.setFillColor(245,239,230);pdf.rect(0,42,W,12,'F');
    pdf.setTextColor(92,34,24);pdf.setFontSize(11);pdf.setFont('helvetica','bold');
    pdf.text('HISTORICO DE AGENDAMENTOS',W/2,50,{align:'center'});
    let y=62;
    pdf.setFillColor(35,20,16);pdf.roundedRect(10,y-6,W-20,26,3,3,'F');
    pdf.setTextColor(232,201,106);pdf.setFontSize(10);pdf.setFont('helvetica','bold');pdf.text('DADOS DO CLIENTE',15,y);y+=6;
    pdf.setTextColor(245,239,230);pdf.setFont('helvetica','normal');pdf.setFontSize(9);
    pdf.text(`Nome: ${nome}`,15,y);y+=5;
    pdf.text(`Telefone: ${clienteSel.telefone||'—'}`,15,y);pdf.text(`CPF: ${clienteSel.cpf||'—'}`,110,y);y+=5;
    pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`,15,y);
    y+=12;
    pdf.setFillColor(139,58,42);pdf.rect(10,y,W-20,8,'F');
    pdf.setTextColor(245,239,230);pdf.setFontSize(8);pdf.setFont('helvetica','bold');
    pdf.text('DATA',14,y+5.5);pdf.text('HORA',38,y+5.5);pdf.text('SERVICO',54,y+5.5);
    pdf.text('BARBEIRO',110,y+5.5);pdf.text('VALOR',148,y+5.5);pdf.text('STATUS',170,y+5.5);
    y+=8;
    historico.forEach((ag,idx)=>{
      if(y>270){pdf.addPage();y=20;}
      const ehCanc=ag.status?.includes('cancelado'),ehConc=ag.status==='concluido';
      if(idx%2===0){pdf.setFillColor(30,15,12);pdf.rect(10,y,W-20,8,'F');}
      pdf.setTextColor(245,239,230);pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);
      pdf.text(formatarData(ag.data)||'—',14,y+5.5);pdf.text(ag.hora||'—',38,y+5.5);
      pdf.text((ag.servico||'').substring(0,24),54,y+5.5);
      pdf.text((ag.barbeiroNome||'').substring(0,14),110,y+5.5);
      pdf.text(`R$ ${(ag.valor||0).toFixed(2).replace('.',',')}`,148,y+5.5);
      if(ehCanc)pdf.setTextColor(244,67,54);else if(ehConc)pdf.setTextColor(46,125,122);else pdf.setTextColor(76,175,80);
      pdf.text(ehCanc?'Cancelado':ehConc?'Concluido':'Confirmado',170,y+5.5);
      y+=8;
    });
    pdf.setFillColor(92,34,24);pdf.rect(0,285,W,12,'F');
    pdf.setTextColor(154,136,128);pdf.setFontSize(7);pdf.setFont('helvetica','normal');
    pdf.text('Flyguer BarberShop — documento gerado automaticamente pelo sistema',W/2,292,{align:'center'});
    pdf.save(`historico_${nome.replace(/[^a-zA-Z0-9]/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  async function excluirDaVista(ag){
    try{await updateDoc(doc(db,'agendamentos',ag.id),{ocultadoRecepcao:true});setHistorico(prev=>prev.filter(a=>a.id!==ag.id));}catch(e){console.error(e);}
  }

  if(clienteSel){
    const totalGasto=historico.filter(a=>!a.status?.includes('cancelado')).reduce((s,a)=>s+(a.valor||0),0);
    const conc=historico.filter(a=>a.status==='concluido').length;
    return(
      <div>
        <button onClick={()=>{setClienteSel(null);setHistorico([]);}}
          style={{background:'none',border:'none',color:'#E8C96A',fontSize:'14px',cursor:'pointer',marginBottom:'16px'}}>
          ← Voltar à lista
        </button>
        <div style={{background:'linear-gradient(135deg,#2E1A14,#231410)',borderRadius:'14px',padding:'16px',border:'1px solid #8B3A2A',marginBottom:'12px',display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{width:'52px',height:'52px',borderRadius:'50%',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',fontWeight:'700',color:'#F5EFE6',flexShrink:0}}>
            {clienteSel.nome?.charAt(0)||'?'}
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:'16px',color:'#F5EFE6',fontWeight:'700'}}>{clienteSel.nome}</div>
            <div style={{fontSize:'12px',color:'#9A8880',marginTop:'2px'}}>📞 {clienteSel.telefone||'—'}</div>
            <div style={{fontSize:'11px',color:'#9A8880'}}>CPF: {clienteSel.cpf||'—'}</div>
          </div>
          {clienteSel.telefone&&(
            <button onClick={()=>{
              const p=clienteSel.nome?.split(' ')[0]||'';
              const msg=encodeURIComponent(`Olá, ${p}! 👋\n\nAqui é a equipe da *Flyguer BarberShop* ✂️\n\n📅 Agende seu próximo horário:\nhttps://flyguer-barbershop.vercel.app\n\n📍 Shopping Cidade das Artes — Piso 2, Nº 22\n📞 (11) 97764-3509\n\n_Flyguer BarberShop — Nossa Arte, Seu Estilo._`);
              window.open(`https://wa.me/55${clienteSel.telefone.replace(/\D/g,'')}?text=${msg}`,'_blank');
            }} style={{padding:'8px 12px',borderRadius:'10px',border:'none',background:'rgba(37,211,102,0.15)',color:'#25D366',fontSize:'12px',cursor:'pointer',fontWeight:'700'}}>📲</button>
          )}
        </div>
        {/* ✅ Ponto 5: Badge assinatura VIP */}
        {assinatura?.assinaturaAtiva && (
          <div style={{background:'linear-gradient(135deg,rgba(201,168,76,0.15),rgba(201,168,76,0.05))',border:'1px solid rgba(201,168,76,0.4)',borderRadius:'12px',padding:'12px 14px',marginBottom:'12px',display:'flex',alignItems:'center',gap:'12px'}}>
            <div style={{fontSize:'28px',flexShrink:0}}>⭐</div>
            <div style={{flex:1}}>
              <div style={{fontSize:'13px',fontWeight:'700',color:'#E8C96A'}}>Plano {assinatura.planoNome}</div>
              <div style={{fontSize:'12px',color:'#F5EFE6',marginTop:'2px'}}>
                <span style={{fontWeight:'700',fontSize:'18px',color:'#4CAF50'}}>{assinatura.cortesRestantes}</span>
                <span style={{color:'#9A8880'}}> / {assinatura.cortesTotais} cortes restantes</span>
              </div>
            </div>
            <button onClick={darBaixaCorte} disabled={assinatura.cortesRestantes===0}
              style={{padding:'8px 12px',borderRadius:'10px',border:'none',background:assinatura.cortesRestantes>0?'rgba(76,175,80,0.2)':'rgba(100,100,100,0.2)',color:assinatura.cortesRestantes>0?'#4CAF50':'#555',fontSize:'11px',fontWeight:'700',cursor:assinatura.cortesRestantes>0?'pointer':'not-allowed',whiteSpace:'nowrap'}}>
              {assinatura.cortesRestantes>0?'✂️ Dar baixa':'Esgotado'}
            </button>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px'}}>
          {[{label:'Concluídos',value:conc,cor:'#2E7D7A'},{label:'Total gasto',value:`R$ ${totalGasto.toFixed(2).replace('.',',')}`,cor:'#E8C96A'}].map(item=>(
            <div key={item.label} style={{background:'#231410',borderRadius:'12px',padding:'12px',textAlign:'center',border:'1px solid #3A2018'}}>
              <div style={{fontSize:'16px',fontWeight:'700',color:item.cor}}>{item.value}</div>
              <div style={{fontSize:'10px',color:'#9A8880',marginTop:'2px'}}>{item.label}</div>
            </div>
          ))}
        </div>
        <button onClick={gerarPDF}
          style={{width:'100%',padding:'10px',borderRadius:'10px',border:'1px solid rgba(232,201,106,0.3)',background:'rgba(232,201,106,0.08)',color:'#E8C96A',fontSize:'13px',fontWeight:'600',cursor:'pointer',marginBottom:'16px'}}>
          📄 Exportar PDF do histórico
        </button>
        <div style={{fontSize:'11px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px'}}>
          Histórico ({historico.length})
        </div>
        {loadingHist?<div style={{textAlign:'center',padding:'30px',color:'#9A8880'}}>⏳</div>:historico.length===0?(
          <div style={{textAlign:'center',padding:'30px',color:'#9A8880',fontSize:'13px'}}>Nenhum agendamento</div>
        ):historico.map(ag=>{
          const ehCanc=ag.status?.includes('cancelado'),ehConc=ag.status==='concluido';
          return(
            <div key={ag.id} style={{background:'#231410',borderRadius:'12px',padding:'12px 14px',border:`1px solid ${ehCanc?'rgba(244,67,54,0.25)':ehConc?'rgba(46,125,122,0.25)':'#3A2018'}`,marginBottom:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:'700',fontSize:'13px',color:'#F5EFE6'}}>{ag.servico}</div>
                  <div style={{fontSize:'11px',color:'#9A8880',marginTop:'2px'}}>✂️ {ag.barbeiroNome} · {formatarData(ag.data)} às {ag.hora}</div>
                </div>
                <div style={{textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px'}}>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#E8C96A'}}>R$ {(ag.valor||0).toFixed(2).replace('.',',')}</div>
                  <div style={{fontSize:'10px',padding:'2px 7px',borderRadius:'8px',fontWeight:'600',background:ehCanc?'rgba(244,67,54,0.15)':ehConc?'rgba(46,125,122,0.15)':'rgba(76,175,80,0.15)',color:ehCanc?'#F44336':ehConc?'#2E7D7A':'#4CAF50'}}>
                    {ehCanc?'✗ Cancelado':ehConc?'✓ Concluído':'● Confirmado'}
                  </div>
                  <button onClick={()=>excluirDaVista(ag)}
                    style={{fontSize:'10px',padding:'2px 6px',borderRadius:'6px',border:'1px solid #2A1208',background:'transparent',color:'#444',cursor:'pointer'}}>
                    🗑 Ocultar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return(
    <div>
      <input type="text" placeholder="🔍 Buscar por nome ou telefone..." value={busca} onChange={e=>setBusca(e.target.value)}
        style={{width:'100%',background:'#231410',border:'1px solid #3A2018',borderRadius:'12px',padding:'10px 14px',color:'#F5EFE6',fontSize:'14px',outline:'none',boxSizing:'border-box',marginBottom:'10px'}}/>
      <div style={{fontSize:'11px',color:'#9A8880',marginBottom:'12px'}}>
        👥 {filtrados.length} cliente{filtrados.length!==1?'s':''}{busca?` · "${busca}"`:' cadastrados'}
      </div>
      {carregando?<div style={{textAlign:'center',padding:'40px',color:'#9A8880'}}>⏳</div>:filtrados.length===0?(
        <div style={{textAlign:'center',padding:'30px',color:'#9A8880',fontSize:'13px'}}>Nenhum cliente encontrado</div>
      ):filtrados.map(c=>(
        <div key={c.id} onClick={()=>abrirHistorico(c)}
          style={{background:'#231410',borderRadius:'12px',padding:'12px 14px',border:'1px solid #3A2018',marginBottom:'8px',display:'flex',alignItems:'center',gap:'12px',cursor:'pointer'}}
          onMouseEnter={e=>e.currentTarget.style.background='#2A1810'}
          onMouseLeave={e=>e.currentTarget.style.background='#231410'}>
          <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:'700',color:'#F5EFE6',flexShrink:0}}>
            {c.nome?.charAt(0)||'?'}
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:'700',fontSize:'14px',color:'#F5EFE6'}}>{c.nome}</div>
            <div style={{fontSize:'11px',color:'#9A8880',marginTop:'2px'}}>📞 {c.telefone||'—'} · CPF: {c.cpf||'—'}</div>
          </div>
          <div style={{fontSize:'11px',color:'#555'}}>Ver histórico →</div>
        </div>
      ))}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function PainelRecepcao({ onBack, dark }) {
  const s = getStyles(dark);
  const [aba, setAba]                 = React.useState('agenda');
  const [encaixeParams, setEncaixe]   = React.useState(null);

  // ── Notificações ──
  const [notifs, setNotifs]           = React.useState([]);
  const [notifVistas, setVistas]      = React.useState(new Set());
  const [sinoAberto, setSino]         = React.useState(false);
  const [popup, setPopup]             = React.useState(null);
  const [piscar, setPiscar]           = React.useState(false);
  const ultimoIdRef                   = React.useRef(new Set());
  const primeiraLeituraRef            = React.useRef(true);

  // ── Dashboard ──
  const [agendamentosGlobais, setAgendamentosGlobais] = React.useState([]); // ✅ Stream global compartilhado
  const [statsHoje, setStats]         = React.useState({ confirmados:0, concluidos:0, receita:0, recebido:0 });
  const [proximo, setProximo]         = React.useState(null);
  const [contReg, setContReg]         = React.useState('');
  const [barbeiros, setBarbeiros]     = React.useState([]);

  const hojeStr = React.useMemo(()=>hoje(),[]);

  // Carrega barbeiros (status em tempo real)
  React.useEffect(()=>{
    const unsub=onSnapshot(
      query(collection(db,'barbeiros'),where('ativo','==',true)),
      snap=>setBarbeiros(snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.papel!=='recepcao')),
      console.error
    );
    return unsub;
  },[]);

  // ✅ Listener GLOBAL — todos os agendamentos de hoje, independente de barbeiro ou aba
  React.useEffect(()=>{
    const unsub=onSnapshot(
      query(collection(db,'agendamentos'),where('data','==',hojeStr)),
      snap=>{
        const ags=snap.docs.map(d=>({firestoreId:d.id,...d.data()}));

        // Stats
        const conf=ags.filter(a=>['confirmado','pendente'].includes(a.status));
        const conc=ags.filter(a=>a.status==='concluido');
        setStats({
          confirmados:conf.length,
          concluidos:conc.length,
          receita:conc.reduce((s,a)=>s+(a.valor||0),0),
          recebido:ags.filter(a=>a.pago).reduce((s,a)=>s+(a.valorRecebido||0),0),
        });

        // Próximo
        const agora=new Date();
        const futuros=conf.filter(a=>new Date(`${a.data}T${a.hora}:00`)>agora).sort((a,b)=>a.hora.localeCompare(b.hora));
        setProximo(futuros[0]||null);

        // ✅ Notificações — só novos após a primeira carga
        if(primeiraLeituraRef.current){
          snap.docs.forEach(d=>ultimoIdRef.current.add(d.id));
          primeiraLeituraRef.current=false;
          return;
        }

        const novos=[];
        snap.docChanges().forEach(change=>{
          if(change.type==='added'){
            const id=change.doc.id;
            if(!ultimoIdRef.current.has(id)){
              ultimoIdRef.current.add(id);
              const ag={firestoreId:id,...change.doc.data()};
              if(['confirmado','pendente'].includes(ag.status)){
                novos.push(ag);
              }
            }
          }
        });

        if(novos.length>0){
          tocarSino();
          if(navigator.vibrate)navigator.vibrate([200,100,200]);
          setNotifs(prev=>[...novos,...prev].slice(0,30));
          setPopup(novos[0]);
          setPiscar(true);
          setTimeout(()=>setPiscar(false),10000);
        }
      },
      console.error
    );
    return unsub;
  },[hojeStr]);

  // Contagem regressiva
  React.useEffect(()=>{
    if(!proximo){setContReg('');return;}
    function atualizar(){
      const[h,m]=proximo.hora.split(':').map(Number);
      const alvo=new Date();alvo.setHours(h,m,0,0);
      const diff=Math.max(0,Math.floor((alvo-new Date())/1000));
      if(diff===0){setContReg('AGORA!');return;}
      const hh=Math.floor(diff/3600),mm=Math.floor((diff%3600)/60),ss=diff%60;
      setContReg(hh>0?`${hh}h ${String(mm).padStart(2,'0')}min`:`${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`);
    }
    atualizar();
    const iv=setInterval(atualizar,1000);
    return()=>clearInterval(iv);
  },[proximo]);

  const naoVistas=notifs.filter(n=>!notifVistas.has(n.firestoreId)).length;

  function abrirSino(){
    setSino(v=>!v);
    if(!sinoAberto){
      const novas=new Set(notifVistas);
      notifs.forEach(n=>novas.add(n.firestoreId));
      setVistas(novas);
      setPiscar(false);
    }
  }

  return (
    <div style={{...s.app,paddingBottom:'30px'}}>

      {/* ✅ POPUP — persiste até fechar manualmente */}
      {popup&&(
        <div style={{position:'fixed',top:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'900px',zIndex:9998,padding:'8px 16px'}}>
          <style>{`@keyframes slideDown{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}} @keyframes pulsar{0%,100%{box-shadow:0 0 0 0 rgba(232,201,106,0.5)}50%{box-shadow:0 0 0 10px rgba(232,201,106,0)}}`}</style>
          <div style={{background:'linear-gradient(135deg,#5C2218,#8B3A2A)',borderRadius:'14px',padding:'14px 16px',border:'2px solid #E8C96A',display:'flex',alignItems:'center',gap:'12px',animation:'slideDown 0.3s ease, pulsar 1.2s infinite',boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
            <div style={{fontSize:'28px',flexShrink:0}}>🔔</div>
            <div style={{flex:1}}>
              <div style={{fontSize:'11px',color:'#E8C96A',fontWeight:'700',marginBottom:'2px'}}>NOVO AGENDAMENTO</div>
              <div style={{fontSize:'14px',color:'#F5EFE6',fontWeight:'700'}}>{popup.clienteNome}</div>
              <div style={{fontSize:'12px',color:'rgba(245,239,230,0.8)'}}>✂️ {popup.barbeiroNome} · {popup.servico} · {popup.hora}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'4px',alignItems:'flex-end',flexShrink:0}}>
              <button onClick={()=>{setPopup(null);setPiscar(false);}}
                style={{background:'rgba(0,0,0,0.3)',border:'none',borderRadius:'50%',width:'28px',height:'28px',color:'#F5EFE6',fontSize:'16px',cursor:'pointer'}}>✕</button>
              <button onClick={()=>{setAba('agenda');setPopup(null);}}
                style={{background:'rgba(232,201,106,0.2)',border:'1px solid #E8C96A',borderRadius:'8px',padding:'4px 8px',color:'#E8C96A',fontSize:'10px',fontWeight:'700',cursor:'pointer',whiteSpace:'nowrap'}}>
                Ver agenda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ HEADER — sino sempre visível com badge piscando */}
      <div style={{background:'linear-gradient(135deg,#5C2218,#8B3A2A)',padding:'14px 20px',display:'flex',alignItems:'center',gap:'12px'}}>
        <button onClick={onBack} style={{background:'rgba(0,0,0,0.2)',border:'none',borderRadius:'8px',padding:'6px 10px',color:'#F5EFE6',cursor:'pointer',fontSize:'14px',flexShrink:0}}>←</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:'16px',fontWeight:'700',color:'#F5EFE6'}}>Painel da Recepção</div>
          <div style={{fontSize:'10px',color:'rgba(245,239,230,0.6)'}}>Flyguer BarberShop</div>
        </div>
        {/* ✅ Sino sempre visível, nunca some */}
        <div style={{position:'relative',flexShrink:0}}>
          <button onClick={abrirSino}
            style={{
              background:piscar?'rgba(232,201,106,0.25)':'rgba(0,0,0,0.25)',
              border:`2px solid ${piscar?'#E8C96A':'rgba(255,255,255,0.2)'}`,
              borderRadius:'12px',padding:'8px 14px',
              color:piscar?'#E8C96A':'#F5EFE6',
              fontSize:'20px',cursor:'pointer',
              animation:piscar?'pulsar 1.2s infinite':'none',
              transition:'all 0.3s',
            }}>
            🔔
            {naoVistas>0&&(
              <div style={{position:'absolute',top:'-8px',right:'-8px',background:'#F44336',borderRadius:'50%',minWidth:'20px',height:'20px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'700',color:'#fff',padding:'0 4px'}}>
                {naoVistas}
              </div>
            )}
          </button>

          {/* Painel de notificações */}
          {sinoAberto&&(
            <>
              <div onClick={()=>setSino(false)} style={{position:'fixed',inset:0,zIndex:997}}/>
              <div style={{position:'absolute',top:'110%',right:0,width:'320px',background:'#1A0F0D',border:'1px solid #3A2018',borderRadius:'14px',zIndex:998,boxShadow:'0 8px 32px rgba(0,0,0,0.8)',overflow:'hidden'}}>
                <div style={{padding:'12px 14px',borderBottom:'1px solid #3A2018',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:'13px',color:'#E8C96A',fontWeight:'700'}}>🔔 Notificações ({notifs.length})</div>
                  <button onClick={()=>setSino(false)} style={{background:'none',border:'none',color:'#9A8880',fontSize:'16px',cursor:'pointer'}}>✕</button>
                </div>
                <div style={{maxHeight:'360px',overflowY:'auto'}}>
                  {notifs.length===0?(
                    <div style={{padding:'24px',textAlign:'center',color:'#9A8880',fontSize:'13px'}}>Nenhuma notificação ainda</div>
                  ):notifs.map(n=>(
                    <div key={n.firestoreId} style={{padding:'10px 14px',borderBottom:'1px solid #2E1A14',background:notifVistas.has(n.firestoreId)?'transparent':'rgba(232,201,106,0.05)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
                        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:notifVistas.has(n.firestoreId)?'#555':'#E8C96A',flexShrink:0}}/>
                        <div style={{fontSize:'12px',fontWeight:'700',color:'#F5EFE6'}}>{n.clienteNome}</div>
                      </div>
                      <div style={{fontSize:'11px',color:'#9A8880',paddingLeft:'14px'}}>✂️ {n.barbeiroNome} · {n.servico} · {n.hora}</div>
                      <div style={{fontSize:'10px',color:'#E8C96A',paddingLeft:'14px',marginTop:'2px'}}>R$ {(n.valor||0).toFixed(2).replace('.',',')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ DASHBOARD DO DIA */}
      <div style={{padding:'12px 16px',borderBottom:'1px solid #3A2018',background:'rgba(26,15,13,0.5)'}}>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'10px'}}>
          {[
            {label:'Confirmados', value:statsHoje.confirmados, cor:'#4CAF50'},
            {label:'Concluídos',  value:statsHoje.concluidos,  cor:'#2E7D7A'},
            {label:'Receita',     value:`R$${statsHoje.receita.toFixed(0)}`, cor:'#E8C96A'},
            {label:'Recebido',    value:`R$${statsHoje.recebido.toFixed(0)}`, cor:'#9A8880'},
          ].map(st=>(
            <div key={st.label} style={{background:'#231410',borderRadius:'10px',padding:'8px',textAlign:'center',border:'1px solid #3A2018'}}>
              <div style={{fontSize:'15px',fontWeight:'700',color:st.cor}}>{st.value}</div>
              <div style={{fontSize:'8px',color:'#9A8880',marginTop:'1px'}}>{st.label}</div>
            </div>
          ))}
        </div>

        {/* Próximo cliente */}
        {proximo&&(
          <div style={{background:'linear-gradient(135deg,#1A0F0D,#2E1A14)',borderRadius:'10px',padding:'10px 14px',border:'1px solid rgba(232,201,106,0.25)',display:'flex',alignItems:'center',gap:'12px',marginBottom:'8px'}}>
            <div style={{textAlign:'center',flexShrink:0}}>
              <div style={{fontSize:'20px',fontWeight:'900',color:'#E8C96A',lineHeight:1}}>{contReg}</div>
              <div style={{fontSize:'8px',color:'#9A8880',marginTop:'1px'}}>próximo</div>
            </div>
            <div style={{width:'1px',height:'32px',background:'#3A2018',flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'13px',fontWeight:'700',color:'#F5EFE6',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{proximo.clienteNome?.split(' ')[0]}</div>
              <div style={{fontSize:'11px',color:'#9A8880',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>✂️ {proximo.barbeiroNome} · {proximo.hora}</div>
            </div>
            {proximo.clienteTel&&(
              <button onClick={()=>window.open(`https://wa.me/55${proximo.clienteTel.replace(/\D/g,'')}`, '_blank')}
                style={{padding:'6px 10px',borderRadius:'8px',border:'none',background:'rgba(37,211,102,0.15)',color:'#25D366',fontSize:'13px',cursor:'pointer',flexShrink:0}}>📲</button>
            )}
          </div>
        )}

        {/* Status barbeiros */}
        <div style={{display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'2px'}}>
          {barbeiros.map(b=>(
            <div key={b.id} style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 10px',borderRadius:'20px',background:'#231410',border:`1px solid ${b.disponivel?'rgba(76,175,80,0.3)':'rgba(255,193,7,0.3)'}`,flexShrink:0}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:b.disponivel?'#4CAF50':'#FFC107'}}/>
              <span style={{fontSize:'11px',color:'#F5EFE6',fontWeight:'600',whiteSpace:'nowrap'}}>{b.nome?.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ABAS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'6px',padding:'10px 16px',borderBottom:'1px solid #3A2018'}}>
        {[
          {id:'agenda',   label:'📅 Agenda'},
          {id:'encaixe',  label:'➕ Encaixe'},
          {id:'clientes', label:'👥 Clientes'},
          {id:'servicos', label:'💈 Serviços'},
          {id:'captar',   label:'📣 Captar'},
        ].map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)}
            style={{padding:'8px 4px',borderRadius:'10px',border:aba===a.id?'1.5px solid #E8C96A':'1px solid #3A2018',background:aba===a.id?'#2E1A14':'#231410',color:aba===a.id?'#E8C96A':'#9A8880',fontSize:'11px',fontWeight:aba===a.id?'700':'400',cursor:'pointer'}}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{padding:'16px'}}>
        {aba==='agenda'   && <AbaAgenda onEncaixe={(b,d)=>{setEncaixe({b,d});setAba('encaixe');}} agendamentosGlobais={agendamentosGlobais}/>}
        {aba==='encaixe'  && <AbaEncaixe barbeiroInicial={encaixeParams?.b} dataInicial={encaixeParams?.d} onConcluir={()=>{setEncaixe(null);setAba('agenda');}}/>}
        {aba==='clientes' && <AbaClientes/>}
        {aba==='servicos' && <AbaServicos/>}
        {aba==='captar'   && <CaptarClientes/>}
      </div>
    </div>
  );
}
