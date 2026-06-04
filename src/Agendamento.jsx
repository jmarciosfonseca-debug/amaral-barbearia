// Agendamento.jsx — Flyguer BarberShop
// ✅ SEM pré-agendamento — todo agendamento vai direto como CONFIRMADO
// ✅ Fluxo: Barbeiro → Serviço → Data/Hora → Pagamento → Sucesso (WhatsApp + Google Calendar)
// ✅ Deep Link params suportados (barbeiroId + data + hora pré-selecionados)

import React from 'react';
import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { getStyles, DIAS_SEMANA } from './getStyles';
import { notificarBarbeariaNovoAgendamento } from './notificacoes';
import { resgatarPromocao } from './promocaoEngine';

// ─── HELPERS ─────────────────────────────────────────────────
function gerarPixPayload({ chave, nome, cidade, valor, descricao }) {
  function campo(id, v) { return `${id}${String(v.length).padStart(2,'0')}${v}`; }
  function crc16(str) {
    let crc = 0xFFFF;
    for (let i=0;i<str.length;i++) {
      crc ^= str.charCodeAt(i)<<8;
      for(let j=0;j<8;j++) crc=(crc&0x8000)?(crc<<1)^0x1021:crc<<1, crc&=0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4,'0');
  }
  const mai=campo('00','BR.GOV.BCB.PIX')+campo('01',chave);
  const vStr=valor>0?Number(valor).toFixed(2):'';
  const nomeFmt=(nome||'FLYGUER').substring(0,25).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const cidFmt=(cidade||'SAO PAULO').substring(0,15).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const descFmt=(descricao||'').substring(0,25).replace(/[^a-zA-Z0-9 ]/g,'');
  let p=campo('00','01')+campo('26',mai)+campo('52','0000')+campo('53','986')+
    (vStr?campo('54',vStr):'')+campo('58','BR')+campo('59',nomeFmt)+campo('60',cidFmt)+
    (descFmt?campo('62',campo('05',descFmt)):'')+  '6304';
  return p+crc16(p);
}

function hoje() { return new Date().toISOString().split('T')[0]; }
function formatarData(s) { if(!s)return''; const[a,m,d]=s.split('-'); return`${d}/${m}/${a}`; }
function diaSemana(s) { return DIAS_SEMANA[new Date(s+'T12:00:00').getDay()]; }

function gerarHorarios(abertura, fechamento, almoco, duracaoMin, agendamentos) {
  const [hA,mA]=abertura.split(':').map(Number);
  const [hF,mF]=fechamento.split(':').map(Number);
  let atual=hA*60+mA, fim=hF*60+mF;
  const bloq=new Set();
  agendamentos.forEach(ag=>{
    if(!ag.hora)return;
    const[h,m]=ag.hora.split(':').map(Number);
    const ini=h*60+m, dur=ag.duracao||30;
    for(let t=ini;t<ini+dur;t+=30) bloq.add(t);
  });
  const result=[];
  while(atual+duracaoMin<=fim){
    const hora=`${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`;
    let bloqAlmoco=false;
    if(almoco?.ativo){
      const[hAl,mAl]=almoco.inicio.split(':').map(Number);
      const[hFl,mFl]=almoco.fim.split(':').map(Number);
      if(atual>=hAl*60+mAl&&atual<hFl*60+mFl) bloqAlmoco=true;
    }
    let ocupado=false;
    for(let t=atual;t<atual+duracaoMin;t+=30) if(bloq.has(t)){ocupado=true;break;}
    result.push({hora,disponivel:!bloqAlmoco&&!ocupado,bloqueado:bloqAlmoco});
    atual+=30;
  }
  return result;
}

function StepIndicator({step,total}) {
  return (
    <div style={{display:'flex',gap:'6px',justifyContent:'center',padding:'12px 0'}}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{height:'4px',flex:1,borderRadius:'2px',background:i<step?'#8B3A2A':i===step?'#E8C96A':'#3A2018',transition:'background 0.3s'}}/>
      ))}
    </div>
  );
}
function Card({children,style,onClick}){
  return <div onClick={onClick} style={{background:'#231410',borderRadius:'16px',padding:'16px',border:'1px solid #3A2018',marginBottom:'10px',cursor:onClick?'pointer':'default',...style}}>{children}</div>;
}
function BotaoVoltar({onClick}){
  return <button onClick={onClick} style={{background:'none',border:'none',color:'#E8C96A',fontSize:'14px',cursor:'pointer',padding:'0'}}>← Voltar</button>;
}

// ─── AGENDAMENTO VIA PROMOÇÃO ────────────────────────────────
// ✅ Transação atômica no confirmar — sem pré-agendamento
function AgendarViaPromo({ cliente, promo, onConcluir, onBack, dark }) {
  const s = getStyles(dark);
  const [barbeiros, setBarbeiros] = React.useState([]);
  const [barbeiro, setBarbeiro]   = React.useState(null);
  const [config, setConfig]       = React.useState(null);
  const [horarios, setHorarios]   = React.useState([]);
  const [dataSel, setDataSel]     = React.useState(null);
  const [horaSel, setHoraSel]     = React.useState(null);
  const [carregando, setCarr]     = React.useState(false);
  const [salvando, setSalv]       = React.useState(false);
  const [erro, setErro]           = React.useState('');
  const DIAS_KEYS=['dom','seg','ter','qua','qui','sex','sab'];

  const diasDisponiveis = React.useMemo(()=>{
    const dias=[];
    const exp=promo.expiracaoTimestamp
      ?(promo.expiracaoTimestamp.toDate?promo.expiracaoTimestamp.toDate():new Date(promo.expiracaoTimestamp))
      :(promo.expiracao?new Date(promo.expiracao):null);
    for(let i=0;i<14;i++){
      const d=new Date(); d.setDate(d.getDate()+i);
      if(promo.validade==='hoje'&&i>0) break;
      if(exp&&d>exp) break;
      dias.push(d.toISOString().split('T')[0]);
    }
    return dias;
  },[promo]);

  React.useEffect(()=>{
    getDocs(query(collection(db,'barbeiros'),where('ativo','==',true)))
      .then(snap=>setBarbeiros(snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.papel!=='recepcao')));
    getDoc(doc(db,'config','barbearia')).then(snap=>{if(snap.exists())setConfig(snap.data());});
  },[]);

  React.useEffect(()=>{
    if(!barbeiro||!dataSel||!config)return;
    setCarr(true); setHoraSel(null);
    getDocs(query(collection(db,'agendamentos'),where('data','==',dataSel))).then(snap=>{
      const ocup=snap.docs.map(d=>d.data()).filter(a=>a.barbeiroId===barbeiro.id&&['confirmado','pendente'].includes(a.status)).map(a=>a.hora);
      const diaSem=DIAS_KEYS[new Date(dataSel+'T12:00:00').getDay()];
      const hc=config.horarios?.[diaSem];
      if(!hc?.aberto){setHorarios([]);setCarr(false);return;}
      const slots=[];
      const[hA,mA]=hc.abertura.split(':').map(Number);
      const[hF,mF]=hc.fechamento.split(':').map(Number);
      let atual=hA*60+mA,fim=hF*60+mF;
      while(atual+30<=fim){
        const hora=`${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`;
        slots.push({hora,disponivel:!ocup.includes(hora)});
        atual+=30;
      }
      setHorarios(slots);setCarr(false);
    });
  },[barbeiro,dataSel,config]);

  async function confirmar() {
    if(!barbeiro||!dataSel||!horaSel){setErro('Selecione barbeiro, data e horário');return;}
    setSalv(true);setErro('');
    try {
      // Verifica se já tem resgate
      const snapResgate=await getDoc(doc(db,'resgates_promo',`${cliente.cpf}_ativa`));
      const jaTemResgate=snapResgate.exists();
      if(!jaTemResgate){
        const resultado=await resgatarPromocao(cliente);
        if(!resultado.ok){
          if(resultado.motivo==='encerrada'||resultado.motivo==='concorrencia'){
            setErro('⚠️ As vagas acabaram! Tente a próxima promoção.');
          } else if(resultado.motivo!=='ja_resgatou'){
            setErro('Erro ao garantir a vaga. Tente novamente.');
            setSalv(false);return;
          }
        }
      }
      // ✅ Salva como CONFIRMADO direto
      const ag={
        clienteCpf:cliente.cpf,clienteNome:cliente.nome,clienteTel:cliente.telefone||'',
        barbeiroId:barbeiro.id,barbeiroNome:barbeiro.nome,
        servico:promo.descricao||promo.titulo,valor:0,duracao:30,
        data:dataSel,hora:horaSel,pagamento:'local',sinal:0,
        status:'confirmado',  // ✅ sempre confirmado
        agendadoPor:'cliente',
        promoResgatada:promo.titulo,promoDescricao:promo.descricao||'',
        lembrete24hEnviado:false,lembrete2hEnviado:false,criadoEm:serverTimestamp(),
      };
      await addDoc(collection(db,'agendamentos'),ag);
      await updateDoc(doc(db,'resgates_promo',`${cliente.cpf}_ativa`),{utilizado:true,utilizadoEm:serverTimestamp()});
      const msg=encodeURIComponent(`✂️ AGENDAMENTO VIA PROMOÇÃO\n\n👤 ${cliente.nome}\n📞 ${cliente.telefone||'—'}\n🔥 Promo: ${promo.titulo}\n✂️ Barbeiro: ${barbeiro.nome}\n📅 ${formatarData(dataSel)} às ${horaSel}\n${promo.descricao?'🎁 '+promo.descricao:''}`);
      setTimeout(()=>window.open(`https://wa.me/5511977643509?text=${msg}`,'_blank'),500);
      onConcluir(ag);
    } catch(e){setErro('Erro ao agendar: '+e.message);console.error(e);}
    setSalv(false);
  }

  return (
    <div style={{...getStyles(dark).app,padding:'20px',paddingBottom:'110px'}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:'#E8C96A',fontSize:'14px',cursor:'pointer',marginBottom:'16px'}}>← Voltar</button>
      <div style={{background:'linear-gradient(135deg,#8B0000,#F44336)',borderRadius:'14px',padding:'14px',marginBottom:'20px'}}>
        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.7)',fontWeight:'700',marginBottom:'4px'}}>🔥 AGENDANDO COM PROMOÇÃO</div>
        <div style={{fontWeight:'700',fontSize:'16px',color:'#fff'}}>{promo.titulo}</div>
        {promo.descricao&&<div style={{fontSize:'13px',color:'rgba(255,255,255,0.85)'}}>🎁 {promo.descricao}</div>}
      </div>
      <div style={{fontSize:'12px',color:'#E8C96A',fontWeight:'700',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'1px'}}>1. Escolha o barbeiro</div>
      {barbeiros.map(b=>(
        <div key={b.id} onClick={()=>{setBarbeiro(b);setDataSel(null);setHoraSel(null);}}
          style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px',background:barbeiro?.id===b.id?'#2E1A14':'#231410',borderRadius:'14px',border:barbeiro?.id===b.id?'1.5px solid #8B3A2A':'1px solid #3A2018',marginBottom:'8px',cursor:'pointer'}}>
          <div style={{width:'48px',height:'48px',borderRadius:'50%',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700',color:'#F5EFE6',border:b.disponivel?'2px solid #4CAF50':'2px solid #FFC107',overflow:'hidden',flexShrink:0}}>
            {b.foto?<img src={b.foto} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:b.nome[0]}
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:'700',fontSize:'15px',color:'#F5EFE6'}}>{b.nome}</div>
            <div style={{fontSize:'11px',color:'#9A8880'}}>{b.cargo}</div>
          </div>
          <div style={{fontSize:'11px',padding:'4px 8px',borderRadius:'16px',background:b.disponivel?'rgba(76,175,80,0.15)':'rgba(255,193,7,0.15)',color:b.disponivel?'#4CAF50':'#FFC107'}}>
            {b.disponivel?'● Disponível':'● Ocupado'}
          </div>
        </div>
      ))}
      {barbeiro&&(
        <>
          <div style={{fontSize:'12px',color:'#E8C96A',fontWeight:'700',marginBottom:'10px',marginTop:'16px',textTransform:'uppercase',letterSpacing:'1px'}}>2. Escolha a data</div>
          <div style={{overflowX:'auto',display:'flex',gap:'8px',paddingBottom:'8px',marginBottom:'16px'}}>
            {diasDisponiveis.map(data=>{
              const sel=dataSel===data,d=new Date(data+'T12:00:00');
              return(
                <div key={data} onClick={()=>setDataSel(data)}
                  style={{minWidth:'56px',padding:'10px 8px',borderRadius:'12px',textAlign:'center',cursor:'pointer',background:sel?'#8B3A2A':'#231410',border:sel?'1.5px solid #E8C96A':'1px solid #3A2018'}}>
                  <div style={{fontSize:'10px',color:sel?'#E8C96A':'#9A8880',fontWeight:'600'}}>{DIAS_SEMANA[d.getDay()]}</div>
                  <div style={{fontSize:'18px',fontWeight:'700',color:'#F5EFE6',marginTop:'2px'}}>{d.getDate()}</div>
                  <div style={{fontSize:'10px',color:sel?'#E8C96A':'#9A8880'}}>{String(d.getMonth()+1).padStart(2,'0')}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {dataSel&&(
        <>
          <div style={{fontSize:'12px',color:'#E8C96A',fontWeight:'700',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'1px'}}>3. Escolha o horário</div>
          {carregando?<div style={{textAlign:'center',color:'#9A8880',padding:'20px'}}>Carregando...</div>:
            horarios.length===0?<div style={{textAlign:'center',color:'#9A8880',padding:'12px',background:'#231410',borderRadius:'10px',marginBottom:'16px'}}>Fechado neste dia</div>:
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'16px'}}>
              {horarios.map(h=>{
                const sel=horaSel===h.hora;
                return(
                  <div key={h.hora} onClick={()=>h.disponivel&&setHoraSel(h.hora)}
                    style={{padding:'10px 4px',borderRadius:'10px',textAlign:'center',cursor:h.disponivel?'pointer':'not-allowed',background:sel?'#8B3A2A':h.disponivel?'#231410':'#1A0F0D',border:sel?'1.5px solid #E8C96A':'1px solid #3A2018',opacity:h.disponivel?1:0.4,fontSize:'13px',fontWeight:'600',color:sel?'#F5EFE6':h.disponivel?'#F5EFE6':'#555'}}>
                    {h.hora}
                    {!h.disponivel&&<div style={{fontSize:'8px',color:'#F44336',marginTop:'2px'}}>Ocupado</div>}
                  </div>
                );
              })}
            </div>
          }
        </>
      )}
      {erro&&<div style={{fontSize:'12px',color:'#F44336',marginBottom:'12px',textAlign:'center',background:'rgba(244,67,54,0.1)',borderRadius:'8px',padding:'10px'}}>⚠️ {erro}</div>}
      {barbeiro&&dataSel&&horaSel&&(
        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'900px',background:'#1A0F0D',borderTop:'1px solid #3A2018',padding:'12px 16px 28px',zIndex:100}}>
          <button onClick={confirmar} disabled={salvando}
            style={{width:'100%',padding:'14px',borderRadius:'14px',border:'none',background:salvando?'#2E1A14':'linear-gradient(135deg,#8B0000,#F44336)',color:salvando?'#555':'#fff',fontSize:'15px',fontWeight:'700',cursor:salvando?'wait':'pointer'}}>
            {salvando?'⏳ Confirmando...':'🔥 Confirmar com Promoção!'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ESCOLHER BARBEIRO ────────────────────────────────────────
async function buscarPrimeiroHorario(barbeiroId, config) {
  const DIAS_KEYS=['dom','seg','ter','qua','qui','sex','sab'];
  for(let i=0;i<14;i++){
    const d=new Date(); d.setDate(d.getDate()+i);
    const dataStr=d.toISOString().split('T')[0];
    const diaSem=DIAS_KEYS[d.getDay()];
    const hc=config.horarios?.[diaSem];
    if(!hc?.aberto) continue;
    const snap=await getDocs(query(collection(db,'agendamentos'),where('data','==',dataStr)));
    const ocup=snap.docs.map(x=>x.data()).filter(a=>a.barbeiroId===barbeiroId&&['confirmado','pendente'].includes(a.status)).map(a=>a.hora);
    const[hA,mA]=hc.abertura.split(':').map(Number);
    const[hF,mF]=hc.fechamento.split(':').map(Number);
    let atual=hA*60+mA,fim=hF*60+mF;
    if(i===0){
      const agora=new Date(),agoraMin=agora.getHours()*60+agora.getMinutes();
      if(atual<agoraMin+30) atual=Math.ceil((agoraMin+30)/30)*30;
    }
    while(atual+30<=fim){
      const hora=`${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`;
      if(!ocup.includes(hora)) return{data:dataStr,hora};
      atual+=30;
    }
  }
  return null;
}

function EscolherBarbeiro({onEscolher,onBack,dark,promoAtiva,deepLinkBarbeiro}) {
  const s=getStyles(dark);
  const [barbeiros,setBarbeiros]=React.useState([]);
  const [carregando,setCarregando]=React.useState(true);
  const [config,setConfig]=React.useState(null);
  const [buscando,setBuscando]=React.useState(false);
  const [erroPrimeiro,setErroPrimeiro]=React.useState('');
  const [perfilAberto,setPerfilAberto]=React.useState(null);

  React.useEffect(()=>{
    getDocs(query(collection(db,'barbeiros'),where('ativo','==',true)))
      .then(snap=>setBarbeiros(snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.papel!=='recepcao')))
      .catch(console.error).finally(()=>setCarregando(false));
    getDoc(doc(db,'config','barbearia')).then(snap=>{if(snap.exists())setConfig(snap.data());});
  },[]);

  // ✅ Se vier de deep link com barbeiro pré-selecionado, pula esta tela
  React.useEffect(()=>{
    if(!deepLinkBarbeiro||barbeiros.length===0) return;
    const b=barbeiros.find(x=>x.id===deepLinkBarbeiro.id)||deepLinkBarbeiro;
    onEscolher(b,null);
  },[deepLinkBarbeiro,barbeiros]);

  async function handlePrimeiroDisponivel(){
    if(!config) return;
    setBuscando(true); setErroPrimeiro('');
    try{
      for(const b of barbeiros){
        const r=await buscarPrimeiroHorario(b.id,config);
        if(r){onEscolher(b,r);return;}
      }
      setErroPrimeiro('Nenhum horário disponível nos próximos 14 dias.');
    }catch(e){setErroPrimeiro('Erro ao buscar horário.');}
    setBuscando(false);
  }

  if(perfilAberto){
    return(
      <div style={{...s.app}}>
        <div style={{background:'linear-gradient(135deg,#5C2218,#8B3A2A)',padding:'20px'}}>
          <button onClick={()=>setPerfilAberto(null)} style={{background:'rgba(0,0,0,0.2)',border:'none',borderRadius:'8px',padding:'6px 10px',color:'#F5EFE6',cursor:'pointer',fontSize:'14px',marginBottom:'16px'}}>← Voltar</button>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
            <div style={{width:'72px',height:'72px',borderRadius:'50%',background:'linear-gradient(135deg,#3A1208,#5C2218)',border:'3px solid #E8C96A',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',fontWeight:'700',color:'#F5EFE6'}}>
              {perfilAberto.foto?<img src={perfilAberto.foto} alt={perfilAberto.nome} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:perfilAberto.nome.charAt(0)}
            </div>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:'22px',color:'#F5EFE6',fontWeight:'700'}}>{perfilAberto.nome}</div>
              <div style={{fontSize:'13px',color:'rgba(245,239,230,0.7)'}}>{perfilAberto.cargo||'Barbeiro'}</div>
              {perfilAberto.experiencia&&<div style={{fontSize:'12px',color:'#E8C96A',marginTop:'4px'}}>✂️ {perfilAberto.experiencia}</div>}
            </div>
          </div>
        </div>
        <div style={{padding:'20px',paddingBottom:'100px'}}>
          {perfilAberto.bio&&(
            <div style={{background:'#231410',borderRadius:'14px',padding:'16px',border:'1px solid #3A2018',marginBottom:'16px'}}>
              <div style={{fontSize:'12px',color:'#E8C96A',fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Sobre</div>
              <div style={{fontSize:'14px',color:'#F5EFE6',lineHeight:'1.7'}}>{perfilAberto.bio}</div>
            </div>
          )}
          <div style={{background:'#231410',borderRadius:'14px',padding:'14px',border:'1px solid #3A2018',display:'flex',alignItems:'center',gap:'12px'}}>
            <div style={{width:'12px',height:'12px',borderRadius:'50%',background:perfilAberto.disponivel?'#4CAF50':'#FFC107',flexShrink:0}}/>
            <div style={{fontSize:'13px',color:'#F5EFE6'}}>{perfilAberto.disponivel?'Disponível agora':'Ocupado no momento'}</div>
          </div>
        </div>
        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'900px',background:'#1A0F0D',borderTop:'1px solid #3A2018',padding:'12px 16px 28px',zIndex:100}}>
          <button onClick={()=>{setPerfilAberto(null);onEscolher(perfilAberto);}}
            style={{width:'100%',padding:'14px',borderRadius:'14px',border:'none',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',color:'#F5EFE6',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}>
            ✂️ Agendar com {perfilAberto.nome.split(' ')[0]}
          </button>
        </div>
      </div>
    );
  }

  return(
    <div style={{...s.app,padding:'20px',paddingBottom:'40px'}}>
      <BotaoVoltar onClick={onBack}/>
      <StepIndicator step={0} total={4}/>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:'20px',color:'#F5EFE6',marginBottom:'6px',marginTop:'8px'}}>Escolha o barbeiro</div>
      <div style={{fontSize:'12px',color:'#9A8880',marginBottom:'16px'}}>Toque no nome para agendar · foto para ver o perfil</div>
      <button onClick={handlePrimeiroDisponivel} disabled={buscando||!config}
        style={{width:'100%',padding:'14px',borderRadius:'14px',border:'none',background:buscando?'#2E1A14':'linear-gradient(135deg,#2E7D7A,#3A9E9A)',color:buscando?'#555':'#fff',fontWeight:'700',fontSize:'14px',cursor:buscando?'wait':'pointer',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
        {buscando?'⏳ Buscando...':'⚡ Quero o primeiro horário disponível'}
      </button>
      {erroPrimeiro&&<div style={{fontSize:'12px',color:'#F44336',textAlign:'center',marginBottom:'12px'}}>⚠️ {erroPrimeiro}</div>}
      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px'}}>
        <div style={{flex:1,height:'1px',background:'#3A2018'}}/><span style={{fontSize:'11px',color:'#555'}}>ou escolha abaixo</span><div style={{flex:1,height:'1px',background:'#3A2018'}}/>
      </div>
      {promoAtiva&&(
        <div style={{background:'linear-gradient(135deg,#8B0000,#F44336)',borderRadius:'12px',padding:'12px 14px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'10px'}}>
          <span style={{fontSize:'22px'}}>🔥</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:'700',fontSize:'13px',color:'#fff'}}>{promoAtiva.titulo}</div>
            {promoAtiva.descricao&&<div style={{fontSize:'11px',color:'rgba(255,255,255,0.8)'}}>🎁 {promoAtiva.descricao}</div>}
          </div>
        </div>
      )}
      {carregando?<div style={{textAlign:'center',color:'#9A8880',padding:'40px'}}>Carregando...</div>:(
        barbeiros.map(b=>(
          <div key={b.id} style={{background:'#231410',borderRadius:'16px',padding:'14px',border:'1px solid #3A2018',marginBottom:'10px',display:'flex',alignItems:'center',gap:'14px'}}>
            <div onClick={()=>setPerfilAberto(b)} style={{width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',fontWeight:'700',color:'#F5EFE6',border:b.disponivel?'2px solid #4CAF50':'2px solid #FFC107',overflow:'hidden',flexShrink:0,cursor:'pointer'}}>
              {b.foto?<img src={b.foto} alt={b.nome} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:b.nome.charAt(0)}
            </div>
            <div style={{flex:1}} onClick={()=>onEscolher(b)}>
              <div style={{fontWeight:'700',fontSize:'16px',color:'#F5EFE6',cursor:'pointer'}}>{b.nome}</div>
              <div style={{fontSize:'12px',color:'#9A8880'}}>{b.cargo}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'6px',alignItems:'flex-end'}}>
              <div style={{fontSize:'11px',padding:'4px 10px',borderRadius:'20px',fontWeight:'600',background:b.disponivel?'rgba(76,175,80,0.15)':'rgba(255,193,7,0.15)',color:b.disponivel?'#4CAF50':'#FFC107'}}>
                {b.disponivel?'● Disponível':'● Ocupado'}
              </div>
              <button onClick={()=>setPerfilAberto(b)} style={{fontSize:'10px',color:'#9A8880',background:'none',border:'1px solid #3A2018',borderRadius:'8px',padding:'3px 8px',cursor:'pointer'}}>Ver perfil</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function EscolherServico({barbeiro,onEscolher,onBack,dark}) {
  const s=getStyles(dark);
  const [servicos,setServicos]=React.useState({avulsos:[],combos:[]});
  const [selecionados,setSel]=React.useState([]);
  const [carregando,setCarr]=React.useState(true);
  React.useEffect(()=>{getDoc(doc(db,'config','servicos')).then(snap=>{if(snap.exists())setServicos(snap.data());}).catch(console.error).finally(()=>setCarr(false));},[]);
  const todos=[...(servicos.avulsos?.filter(s=>s.ativo)||[]),...(servicos.combos?.filter(s=>s.ativo)||[])];
  function toggle(sv){setSel(prev=>prev.find(s=>s.id===sv.id)?prev.filter(s=>s.id!==sv.id):[...prev,sv]);}
  const totalValor=selecionados.reduce((a,s)=>a+s.valor,0);
  const totalDur=selecionados.reduce((a,s)=>a+s.duracao,0);
  return(
    <div style={{...s.app,padding:'20px',paddingBottom:'100px'}}>
      <BotaoVoltar onClick={onBack}/>
      <StepIndicator step={1} total={4}/>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:'20px',color:'#F5EFE6',marginBottom:'6px',marginTop:'8px'}}>Escolha o serviço</div>
      <div style={{fontSize:'12px',color:'#9A8880',marginBottom:'20px'}}>Barbeiro: <strong style={{color:'#E8C96A'}}>{barbeiro.nome}</strong></div>
      {carregando?<div style={{textAlign:'center',color:'#9A8880',padding:'40px'}}>Carregando...</div>:(
        todos.map(sv=>{
          const sel=!!selecionados.find(s=>s.id===sv.id);
          return(
            <Card key={sv.id} onClick={()=>toggle(sv)} style={{border:sel?'1.5px solid #8B3A2A':'1px solid #3A2018',background:sel?'#2E1A14':'#231410'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontWeight:'600',fontSize:'15px',color:'#F5EFE6'}}>{sv.nome}</div>
                  <div style={{fontSize:'12px',color:'#9A8880',marginTop:'2px'}}>⏱ {sv.duracao} min</div>
                </div>
                <div style={{textAlign:'right',display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{fontSize:'16px',fontWeight:'700',color:sel?'#E8C96A':'#F5EFE6'}}>R$ {sv.valor.toFixed(2).replace('.',',')}</div>
                  <div style={{width:'22px',height:'22px',borderRadius:'6px',border:`2px solid ${sel?'#8B3A2A':'#3A2018'}`,background:sel?'#8B3A2A':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',color:'#F5EFE6',flexShrink:0}}>{sel?'✓':''}</div>
                </div>
              </div>
            </Card>
          );
        })
      )}
      {selecionados.length>0&&(
        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'900px',background:'#1A0F0D',borderTop:'1px solid #3A2018',padding:'12px 16px 28px',zIndex:100}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
            <span style={{fontSize:'12px',color:'#9A8880'}}>{selecionados.length} serviço(s) · {totalDur} min</span>
            <span style={{fontSize:'14px',fontWeight:'700',color:'#E8C96A'}}>R$ {totalValor.toFixed(2).replace('.',',')}</span>
          </div>
          <button onClick={()=>onEscolher({servicos:selecionados,valor:totalValor,duracao:totalDur,nome:selecionados.map(s=>s.nome).join(' + ')})}
            style={{width:'100%',padding:'14px',borderRadius:'14px',border:'none',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',color:'#F5EFE6',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}>
            Continuar ({selecionados.length}) →
          </button>
        </div>
      )}
    </div>
  );
}

function CalendarioCliente({isDiaAberto,dataSel,onDiaSel}) {
  const agora=new Date(),anoHoje=agora.getFullYear(),mesHoje=agora.getMonth();
  const hojeStr=`${anoHoje}-${String(mesHoje+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}`;
  const [mes,setMes]=React.useState(mesHoje),[ano,setAno]=React.useState(anoHoje);
  const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const primeiroDia=new Date(ano,mes,1).getDay(),diasNoMes=new Date(ano,mes+1,0).getDate();
  function navMes(dir){let nm=mes+dir,na=ano;if(nm<0){nm=11;na--;}if(nm>11){nm=0;na++;}if(na<anoHoje||(na===anoHoje&&nm<mesHoje))return;setMes(nm);setAno(na);}
  function mkData(a,m,d){return`${a}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
  const cells=[];for(let i=0;i<primeiroDia;i++)cells.push(null);for(let d=1;d<=diasNoMes;d++)cells.push(d);
  return(
    <div style={{background:'#1A0F0D',borderRadius:'16px',padding:'14px',marginBottom:'16px',border:'1px solid #3A2018'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
        <button onClick={()=>navMes(-1)} style={{background:'#2E1A14',border:'1px solid #3A2018',borderRadius:'8px',padding:'4px 12px',color:'#F5EFE6',cursor:'pointer',fontSize:'18px'}}>{'<'}</button>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'15px',color:'#E8C96A',fontWeight:'700'}}>{MESES[mes]} {ano}</div>
        <button onClick={()=>navMes(1)} style={{background:'#2E1A14',border:'1px solid #3A2018',borderRadius:'8px',padding:'4px 12px',color:'#F5EFE6',cursor:'pointer',fontSize:'18px'}}>{'>'}</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',marginBottom:'6px'}}>
        {['D','S','T','Q','Q','S','S'].map((l,i)=><div key={i} style={{textAlign:'center',fontSize:'10px',color:'#9A8880',fontWeight:'600',padding:'3px 0'}}>{l}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px'}}>
        {cells.map((dia,idx)=>{
          if(!dia)return<div key={idx}/>;
          const ds=mkData(ano,mes,dia),ehHoje=ds===hojeStr,ehSel=ds===dataSel,passado=ds<hojeStr,aberto=!passado&&isDiaAberto(ds);
          return(
            <div key={idx} onClick={()=>aberto&&onDiaSel(ds)}
              style={{borderRadius:'8px',padding:'6px 2px',textAlign:'center',cursor:aberto?'pointer':'default',background:ehSel?'#8B3A2A':ehHoje?'rgba(232,201,106,0.15)':'transparent',border:ehSel?'1.5px solid #E8C96A':ehHoje?'1px solid rgba(232,201,106,0.4)':'1px solid transparent',opacity:passado||!aberto?0.3:1}}>
              <div style={{fontSize:'13px',fontWeight:'700',color:ehSel?'#F5EFE6':ehHoje?'#E8C96A':aberto?'#F5EFE6':'#555'}}>{dia}</div>
            </div>
          );
        })}
      </div>
      {dataSel&&<div style={{marginTop:'10px',padding:'8px 10px',background:'rgba(139,58,42,0.2)',borderRadius:'8px',textAlign:'center',fontSize:'12px',color:'#E8C96A',fontWeight:'600'}}>{dataSel.split('-').reverse().join('/')}</div>}
    </div>
  );
}

function EscolherDataHora({barbeiro,servico,onEscolher,onBack,dark,dataHoraPreSelecionada}) {
  const s=getStyles(dark);
  const DIAS_KEYS=['dom','seg','ter','qua','qui','sex','sab'];
  const [dataSel,setDataSel]=React.useState(dataHoraPreSelecionada?.data||null);
  const [horaSel,setHoraSel]=React.useState(dataHoraPreSelecionada?.hora||null);
  const [horarios,setHorarios]=React.useState([]);
  const [config,setConfig]=React.useState(null);
  const [carregando,setCarr]=React.useState(false);
  React.useEffect(()=>{getDoc(doc(db,'config','barbearia')).then(snap=>{if(snap.exists())setConfig(snap.data());}).catch(console.error);},[]);
  React.useEffect(()=>{
    if(!dataSel||!config)return;
    setCarr(true);
    if(!dataHoraPreSelecionada)setHoraSel(null);
    Promise.all([
      getDocs(query(collection(db,'agendamentos'),where('data','==',dataSel))),
      getDocs(query(collection(db,'slots_bloqueados'),where('barbeiroId','==',barbeiro.id),where('data','==',dataSel))),
    ]).then(([snapAg,snapSlots])=>{
      const ocup=snapAg.docs.map(d=>d.data()).filter(a=>a.barbeiroId===barbeiro.id&&['confirmado','pendente'].includes(a.status));
      const bloq=snapSlots.docs.map(d=>({hora:d.data().hora,duracao:30}));
      const diaSem=DIAS_KEYS[new Date(dataSel+'T12:00:00').getDay()];
      const hc=config.horarios?.[diaSem];
      setHorarios(!hc?.aberto?[]:gerarHorarios(hc.abertura,hc.fechamento,config.almoco,servico.duracao,[...ocup,...bloq]));
    }).catch(console.error).finally(()=>setCarr(false));
  },[dataSel,config,barbeiro.id,servico.duracao]);
  function isDiaAberto(ds){if(!config)return true;const diaSem=DIAS_KEYS[new Date(ds+'T12:00:00').getDay()];return config.horarios?.[diaSem]?.aberto??true;}
  return(
    <div style={{...s.app,padding:'20px',paddingBottom:'100px'}}>
      <BotaoVoltar onClick={onBack}/>
      <StepIndicator step={2} total={4}/>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:'20px',color:'#F5EFE6',marginBottom:'4px',marginTop:'8px'}}>Escolha data e horário</div>
      <div style={{fontSize:'12px',color:'#9A8880',marginBottom:'20px'}}>{barbeiro.nome} · {servico.nome} · {servico.duracao} min</div>
      {dataHoraPreSelecionada&&<div style={{background:'rgba(46,125,122,0.1)',border:'1px solid rgba(46,125,122,0.3)',borderRadius:'12px',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:'#2E7D7A'}}>⚡ Horário pré-selecionado — confirme ou troque abaixo.</div>}
      <CalendarioCliente isDiaAberto={isDiaAberto} dataSel={dataSel} onDiaSel={setDataSel}/>
      {dataSel&&(
        <>
          <div style={{fontSize:'13px',color:'#E8C96A',fontWeight:'600',marginBottom:'12px'}}>Horários disponíveis — {formatarData(dataSel)}</div>
          {carregando?<div style={{textAlign:'center',color:'#9A8880',padding:'20px'}}>Carregando...</div>
            :horarios.length===0?<Card><div style={{textAlign:'center',color:'#9A8880',padding:'12px'}}>Fechado neste dia</div></Card>
            :<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px'}}>
              {horarios.map(h=>{
                const sel=horaSel===h.hora;
                return<div key={h.hora} onClick={()=>h.disponivel&&setHoraSel(h.hora)} style={{padding:'10px 4px',borderRadius:'10px',textAlign:'center',cursor:h.disponivel?'pointer':'not-allowed',background:sel?'#8B3A2A':h.disponivel?'#231410':'#1A0F0D',border:sel?'1.5px solid #E8C96A':'1px solid #3A2018',opacity:h.disponivel?1:0.4,fontSize:'13px',fontWeight:'600',color:sel?'#F5EFE6':h.disponivel?'#F5EFE6':'#555'}}>
                  {h.hora}
                  {!h.disponivel&&!h.bloqueado&&<div style={{fontSize:'8px',color:'#F44336',marginTop:'2px'}}>Ocupado</div>}
                  {h.bloqueado&&<div style={{fontSize:'8px',color:'#9A8880',marginTop:'2px'}}>Almoço</div>}
                </div>;
              })}
            </div>
          }
        </>
      )}
      {dataSel&&horaSel&&(
        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'900px',background:'#1A0F0D',borderTop:'1px solid #3A2018',padding:'12px 16px 28px',zIndex:100}}>
          <div style={{fontSize:'12px',color:'#9A8880',textAlign:'center',marginBottom:'8px'}}>{formatarData(dataSel)} às {horaSel} com {barbeiro.nome}</div>
          <button onClick={()=>onEscolher({data:dataSel,hora:horaSel})} style={{width:'100%',padding:'14px',borderRadius:'14px',border:'none',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',color:'#F5EFE6',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}>
            Confirmar horário →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── PAGAMENTO ────────────────────────────────────────────────
// ✅ SEM pré-agendamento — status vai direto para CONFIRMADO
function Pagamento({cliente,barbeiro,servico,dataHora,onConfirmar,onBack,dark}) {
  const s=getStyles(dark);
  const [pagPref,setPag]=React.useState('local');
  const [salvando,setSalv]=React.useState(false);
  const [erro,setErro]=React.useState('');
  const [pixConfig,setPix]=React.useState({chave:'',nome:'Alisson Ferreira da Silva',banco:'Nubank',cidade:'Sao Paulo'});
  const [pixCopiado,setCop]=React.useState(false);
  const [travado,setTrav]=React.useState(false);
  const [verificando,setVerif]=React.useState(true);

  React.useEffect(()=>{
    async function verificar(){
      try{
        const snapConfig=await getDoc(doc(db,'config','barbearia'));
        if(snapConfig.exists()){
          const d=snapConfig.data();
          setPix({chave:d.pix||'',nome:d.pixNome||'Alisson Ferreira da Silva',banco:d.pixBanco||'Nubank',cidade:d.pixCidade||'Sao Paulo'});
        }
        if(dataHora.data===hoje()){
          const snap=await getDocs(query(collection(db,'agendamentos'),where('clienteCpf','==',cliente.cpf),where('data','==',hoje()),where('status','==','cancelado_cliente')));
          if(!snap.empty)setTrav(true);
        }
      }catch(e){console.error(e);}
      finally{setVerif(false);}
    }
    verificar();
  },[cliente.cpf,dataHora.data]);

  const valorTotal=servico.valor||0;
  const valorSinal=(valorTotal*0.5).toFixed(2).replace('.',',');
  const valorPix=travado?valorTotal*0.5:valorTotal;
  const pixPayload=pixConfig.chave?gerarPixPayload({chave:pixConfig.chave,nome:pixConfig.nome,cidade:pixConfig.cidade,valor:valorPix,descricao:`Flyguer ${barbeiro.nome}`}):'';

  function abrirWhatsAppPix(){
    const msg=encodeURIComponent(`Olá! Sou ${cliente.nome}, agendamento ${formatarData(dataHora.data)} às ${dataHora.hora} com ${barbeiro.nome}.\nServiço: ${servico.nome}\nValor: R$ ${valorTotal.toFixed(2).replace('.',',')}\n\nSegue comprovante do Pix 👇`);
    window.open(`https://wa.me/5511939089988?text=${msg}`,'_blank');
  }

  // ✅ handleConfirmar — SEM verificação de mês, SEM pré-agendamento
  async function handleConfirmar(){
    if(travado&&pagPref==='local'){setErro('Você deve pagar o sinal via Pix para confirmar.');return;}
    setSalv(true);setErro('');
    try{
      // ✅ Sempre CONFIRMADO — sem qualquer lógica de pré-agendamento
      const agendamento={
        clienteCpf:cliente.cpf,clienteNome:cliente.nome,clienteTel:cliente.telefone,
        barbeiroId:barbeiro.id,barbeiroNome:barbeiro.nome,
        servico:servico.nome,servicoIds:(servico.servicos||[]).map(s=>s.id).filter(Boolean),
        valor:valorTotal,duracao:servico.duracao,
        data:dataHora.data,hora:dataHora.hora,
        pagamento:travado?'pix_sinal':pagPref,
        sinal:travado?valorTotal*0.5:0,
        status:'confirmado',   // ✅ SEMPRE confirmado, sem exceção
        agendadoPor:'cliente',
        travaCancelamento:travado,
        lembrete24hEnviado:false,lembrete2hEnviado:false,
        criadoEm:serverTimestamp(),
      };
      await addDoc(collection(db,'agendamentos'),agendamento);
      notificarBarbeariaNovoAgendamento(agendamento);
      onConfirmar(agendamento);
    }catch(e){setErro('Erro ao confirmar. Tente novamente.');console.error(e);}
    finally{setSalv(false);}
  }

  if(verificando)return<div style={{...s.app,display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}><div style={{textAlign:'center',color:'#9A8880'}}>Verificando...</div></div>;

  const mostPix=pagPref==='pix'||travado;

  return(
    <div style={{...s.app,padding:'20px',paddingBottom:'120px'}}>
      <BotaoVoltar onClick={onBack}/>
      <StepIndicator step={3} total={4}/>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:'20px',color:'#F5EFE6',marginBottom:'4px',marginTop:'8px'}}>Confirmar agendamento</div>
      <div style={{fontSize:'12px',color:'#9A8880',marginBottom:'20px'}}>Revise e escolha como pagar</div>

      {/* Resumo */}
      <Card style={{borderColor:'#8B3A2A'}}>
        <div style={{fontSize:'12px',color:'#9A8880',marginBottom:'12px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'1px'}}>Resumo</div>
        {[
          {label:'Barbeiro',value:barbeiro.nome},
          {label:'Serviço', value:servico.nome},
          {label:'Data',    value:`${diaSemana(dataHora.data)}, ${formatarData(dataHora.data)}`},
          {label:'Horário', value:dataHora.hora},
          {label:'Duração', value:`${servico.duracao} min`},
          {label:'Valor',   value:`R$ ${valorTotal.toFixed(2).replace('.',',')}`},
        ].map(item=>(
          <div key={item.label} style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
            <span style={{fontSize:'13px',color:'#9A8880'}}>{item.label}</span>
            <span style={{fontSize:'13px',color:'#F5EFE6',fontWeight:'600'}}>{item.value}</span>
          </div>
        ))}
      </Card>

      {/* Trava de cancelamento */}
      {travado&&(
        <div style={{background:'rgba(244,67,54,0.1)',border:'1.5px solid rgba(244,67,54,0.4)',borderRadius:'14px',padding:'14px',marginBottom:'16px'}}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#F44336',marginBottom:'8px'}}>🔒 Cancelamento detectado hoje</div>
          <div style={{fontSize:'12px',color:'#F5EFE6',lineHeight:'1.6'}}>É necessário um sinal de <strong>50% via Pix</strong> para confirmar.</div>
          <div style={{marginTop:'10px',padding:'10px',background:'rgba(0,0,0,0.3)',borderRadius:'10px'}}>
            <div style={{fontSize:'12px',color:'#9A8880'}}>Sinal:</div>
            <div style={{fontSize:'22px',fontWeight:'700',color:'#F44336'}}>R$ {valorSinal}</div>
          </div>
        </div>
      )}

      {/* Opções de pagamento */}
      <div style={{fontSize:'12px',color:'#E8C96A',fontWeight:'600',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>Forma de pagamento</div>
      <Card onClick={()=>!travado&&setPag('local')} style={{border:pagPref==='local'&&!travado?'1.5px solid #8B3A2A':'1px solid #3A2018',opacity:travado?0.4:1,cursor:travado?'not-allowed':'pointer'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{fontSize:'24px'}}>💵</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:'600',fontSize:'14px',color:travado?'#555':'#F5EFE6'}}>Pagar no Local {travado&&'🔒'}</div>
            <div style={{fontSize:'11px',color:'#9A8880'}}>{travado?'Bloqueado — cancelamento hoje':'No dia do atendimento'}</div>
          </div>
          {!travado&&<div style={{width:'20px',height:'20px',borderRadius:'50%',border:`2px solid ${pagPref==='local'?'#8B3A2A':'#3A2018'}`,background:pagPref==='local'?'#8B3A2A':'transparent'}}/>}
        </div>
      </Card>

      <Card onClick={()=>setPag('pix')} style={{border:mostPix?'1.5px solid #2E7D7A':'1px solid #3A2018'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{fontSize:'24px'}}>💜</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:'600',fontSize:'14px',color:'#F5EFE6'}}>{travado?`Pix Sinal — R$ ${valorSinal}`:'Pagar via Pix'}</div>
            <div style={{fontSize:'11px',color:'#9A8880'}}>{pixConfig.banco} · {travado?'Obrigatório':'Antecipado · garante sua vaga'}</div>
          </div>
          <div style={{width:'20px',height:'20px',borderRadius:'50%',border:`2px solid ${mostPix?'#2E7D7A':'#3A2018'}`,background:mostPix?'#2E7D7A':'transparent'}}/>
        </div>
        {mostPix&&pixConfig.chave&&(
          <div style={{marginTop:'14px'}}>
            <div style={{background:'rgba(46,125,122,0.1)',borderRadius:'12px',padding:'12px',textAlign:'center',marginBottom:'12px',border:'1px solid rgba(46,125,122,0.3)'}}>
              <div style={{fontSize:'11px',color:'#9A8880',marginBottom:'4px'}}>Valor a transferir</div>
              <div style={{fontSize:'28px',fontWeight:'900',color:'#2E7D7A'}}>R$ {valorPix.toFixed(2).replace('.',',')}</div>
              <div style={{fontSize:'11px',color:'#9A8880',marginTop:'2px'}}>{pixConfig.nome} · {pixConfig.banco}</div>
            </div>
            <div style={{background:'#1A0F0D',borderRadius:'10px',padding:'12px',marginBottom:'12px'}}>
              <div style={{fontSize:'10px',color:'#9A8880',marginBottom:'4px'}}>Chave Pix</div>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#2E7D7A',letterSpacing:'1px',marginBottom:'8px',wordBreak:'break-all'}}>{pixConfig.chave}</div>
              <button onClick={()=>{navigator.clipboard?.writeText(pixPayload||pixConfig.chave);setCop(true);setTimeout(()=>setCop(false),3000);}}
                style={{padding:'10px 14px',borderRadius:'8px',border:'1px solid #2E7D7A',background:pixCopiado?'#2E7D7A':'transparent',color:pixCopiado?'#fff':'#2E7D7A',fontSize:'13px',cursor:'pointer',fontWeight:'700',width:'100%'}}>
                {pixCopiado?'✅ Copiado!':'📋 Copiar código Pix'}
              </button>
            </div>
            <button onClick={abrirWhatsAppPix} style={{width:'100%',padding:'12px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#25D366,#128C7E)',color:'#fff',fontSize:'13px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
              <span style={{fontSize:'18px'}}>📲</span>Enviar comprovante pelo WhatsApp
            </button>
          </div>
        )}
      </Card>

      {!travado&&<div style={{background:'rgba(46,125,122,0.08)',border:'1px solid rgba(46,125,122,0.2)',borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',fontSize:'11px',color:'#2E7D7A'}}>ℹ️ O Pix antecipado é sempre opcional.</div>}
      {erro&&<div style={{fontSize:'12px',color:'#F44336',marginBottom:'12px',textAlign:'center'}}>⚠️ {erro}</div>}

      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'900px',background:'#1A0F0D',borderTop:'1px solid #3A2018',padding:'12px 16px 28px',zIndex:100}}>
        <button onClick={handleConfirmar} disabled={salvando}
          style={{width:'100%',padding:'14px',borderRadius:'14px',border:'none',background:travado?'linear-gradient(135deg,#2E7D7A,#3A9E9A)':'linear-gradient(135deg,#5C2218,#8B3A2A)',color:'#F5EFE6',fontSize:'15px',fontWeight:'700',cursor:salvando?'wait':'pointer'}}>
          {salvando?'⏳ Confirmando...':travado?`✅ Confirmar e Pagar Sinal R$ ${valorSinal}`:'✅ Confirmar Agendamento'}
        </button>
      </div>
    </div>
  );
}

// ─── CONFIRMADO ───────────────────────────────────────────────
// ✅ Tela de sucesso com WhatsApp + Google Calendar — SEM pré-agendamento
function Confirmado({agendamento,onVoltar,dark}) {
  const s=getStyles(dark);

  // ✅ WhatsApp da barbearia com dados completos
  function abrirWhatsApp(){
    const msg=encodeURIComponent(
      `✅ AGENDAMENTO CONFIRMADO!\n\n`+
      `👤 ${agendamento.clienteNome}\n`+
      `📞 ${agendamento.clienteTel||'—'}\n`+
      `✂️ Barbeiro: ${agendamento.barbeiroNome}\n`+
      `💈 Serviço: ${agendamento.servico}\n`+
      `📅 ${formatarData(agendamento.data)} às ${agendamento.hora}\n`+
      `⏱ Duração: ${agendamento.duracao||30} min\n`+
      `💰 Valor: R$ ${(agendamento.valor||0).toFixed(2).replace('.',',')}\n`+
      `💳 Pagamento: ${agendamento.pagamento==='pix'||agendamento.pagamento==='pix_sinal'?'Pix':'No local'}\n\n`+
      `_Agendado pelo app Flyguer BarberShop_`
    );
    window.open(`https://wa.me/5511977643509?text=${msg}`,'_blank');
  }

  // ✅ Google Calendar com dados completos
  function abrirCalendario(){
    const[hh,mm]=agendamento.hora.split(':');
    const dataInicio=`${agendamento.data.replace(/-/g,'')}T${String(hh).padStart(2,'0')}${String(mm).padStart(2,'0')}00`;
    const durMin=agendamento.duracao||30;
    const fim=new Date(`${agendamento.data}T${agendamento.hora}:00`);
    fim.setMinutes(fim.getMinutes()+durMin);
    const dataFim=`${fim.getFullYear()}${String(fim.getMonth()+1).padStart(2,'0')}${String(fim.getDate()).padStart(2,'0')}T${String(fim.getHours()).padStart(2,'0')}${String(fim.getMinutes()).padStart(2,'0')}00`;
    const texto=encodeURIComponent(`Flyguer BarberShop — ${agendamento.servico} com ${agendamento.barbeiroNome}`);
    const local=encodeURIComponent('Flyguer BarberShop — Shopping Cidade das Artes, Piso 2, Nº 22, São Paulo - SP');
    const detalhes=encodeURIComponent(`Barbeiro: ${agendamento.barbeiroNome}\nServiço: ${agendamento.servico}\nDuração: ${durMin} min\nValor: R$ ${(agendamento.valor||0).toFixed(2).replace('.',',')}\n\nShopping Cidade das Artes — Piso 2, Nº 22\nApp: https://flyguer-barbershop.vercel.app\nWhatsApp: (11) 97764-3509`);
    window.open(`https://calendar.google.com/calendar/r/eventedit?text=${texto}&dates=${dataInicio}/${dataFim}&location=${local}&details=${detalhes}`,'_blank');
  }

  return(
    <div style={{...s.app,padding:'32px 20px 60px',textAlign:'center'}}>
      {/* ✅ Ícone de sucesso */}
      <div style={{fontSize:'72px',marginBottom:'8px'}}>🎉</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:'26px',color:'#E8C96A',marginBottom:'6px',fontWeight:'700'}}>
        Agendado!
      </div>
      <div style={{fontSize:'14px',color:'#9A8880',marginBottom:'28px'}}>Seu horário está confirmado</div>

      {/* Resumo do agendamento */}
      <div style={{background:'#231410',borderRadius:'16px',padding:'20px',border:'1.5px solid #8B3A2A',marginBottom:'20px',textAlign:'left'}}>
        {[
          {icon:'✂️',label:'Barbeiro',value:agendamento.barbeiroNome},
          {icon:'💈',label:'Serviço', value:agendamento.servico},
          {icon:'📅',label:'Data',    value:`${diaSemana(agendamento.data)}, ${formatarData(agendamento.data)}`},
          {icon:'🕐',label:'Horário', value:agendamento.hora},
          {icon:'⏱', label:'Duração', value:`${agendamento.duracao||30} min`},
          {icon:'💰',label:'Valor',   value:`R$ ${(agendamento.valor||0).toFixed(2).replace('.',',')}`},
        ].map(item=>(
          <div key={item.label} style={{display:'flex',gap:'10px',marginBottom:'10px',alignItems:'center'}}>
            <span style={{fontSize:'16px',width:'22px',flexShrink:0}}>{item.icon}</span>
            <span style={{fontSize:'13px',color:'#9A8880',width:'68px',flexShrink:0}}>{item.label}</span>
            <span style={{fontSize:'13px',color:'#F5EFE6',fontWeight:'600'}}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Lembrete WhatsApp */}
      <div style={{background:'rgba(46,125,122,0.1)',border:'1px solid rgba(46,125,122,0.3)',borderRadius:'14px',padding:'14px',marginBottom:'16px',textAlign:'left'}}>
        <div style={{fontSize:'12px',fontWeight:'700',color:'#2E7D7A',marginBottom:'6px'}}>📲 Lembretes automáticos</div>
        <div style={{fontSize:'12px',color:'#9A8880',lineHeight:'1.6'}}>
          Você receberá um lembrete pelo <strong style={{color:'#F5EFE6'}}>WhatsApp 2 horas antes</strong> do atendimento.
        </div>
      </div>

      {/* ✅ Botão 1: WhatsApp (verde, destaque) */}
      <button onClick={abrirWhatsApp}
        style={{width:'100%',padding:'15px',borderRadius:'14px',border:'none',background:'linear-gradient(135deg,#25D366,#128C7E)',color:'#fff',fontSize:'15px',fontWeight:'700',cursor:'pointer',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
        <span style={{fontSize:'20px'}}>📲</span> Enviar para WhatsApp da Barbearia
      </button>

      {/* ✅ Botão 2: Google Calendar */}
      <button onClick={abrirCalendario}
        style={{width:'100%',padding:'14px',borderRadius:'14px',border:'1px solid rgba(66,133,244,0.4)',background:'rgba(66,133,244,0.08)',color:'#4285F4',fontSize:'14px',fontWeight:'700',cursor:'pointer',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
        <span style={{fontSize:'20px'}}>📅</span> Adicionar ao Google Calendar
      </button>

      {/* Botão voltar */}
      <button onClick={onVoltar}
        style={{width:'100%',padding:'14px',borderRadius:'14px',border:'none',background:'linear-gradient(135deg,#5C2218,#8B3A2A)',color:'#F5EFE6',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}>
        Voltar ao início
      </button>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function Agendamento({cliente,onBack,dark,promoParaResgatar,deepLinkParams}) {
  // ✅ Sem pré-agendamento: etapa inicial depende apenas de promo ou deep link
  const [etapa,setEtapa]=React.useState(()=>{
    if(promoParaResgatar) return 'agendar_promo';
    if(deepLinkParams?.hora) return 'servico'; // barbeiro já vem pré-selecionado
    return 'barbeiro';
  });
  const [barbeiro,setBarbeiro]=React.useState(deepLinkParams?.barbeiroPreSelecionado||null);
  const [servico,setServico]=React.useState(null);
  const [dataHora,setDataHora]=React.useState(null);
  const [agendamento,setAgendamento]=React.useState(null);
  const [promoAtiva,setPromoAtiva]=React.useState(promoParaResgatar||null);
  const [dataHoraPre,setDataHoraPre]=React.useState(deepLinkParams?.hora?{data:deepLinkParams.data,hora:deepLinkParams.hora}:null);

  // Carrega barbeiro do deep link (quando vem por URL)
  React.useEffect(()=>{
    if(!deepLinkParams?.barbeiroId) return;
    getDoc(doc(db,'barbeiros',deepLinkParams.barbeiroId)).then(snap=>{
      if(snap.exists()){
        setBarbeiro({id:snap.id,...snap.data()});
        setDataHoraPre({data:deepLinkParams.data,hora:deepLinkParams.hora});
      }
    }).catch(console.error);
  },[deepLinkParams?.barbeiroId]);

  React.useEffect(()=>{
    if(promoParaResgatar||promoAtiva) return;
    getDoc(doc(db,'config','promocao_ativa')).then(snap=>{
      if(snap.exists()){const p=snap.data();if(p.ativo)setPromoAtiva(p);}
    }).catch(()=>{});
  },[]);

  if(etapa==='agendar_promo'&&promoAtiva){
    return<AgendarViaPromo cliente={cliente} promo={promoAtiva} dark={dark}
      onConcluir={ag=>{setAgendamento(ag);setEtapa('confirmado');}}
      onBack={onBack}/>;
  }
  if(etapa==='confirmado'&&agendamento) return<Confirmado agendamento={agendamento} onVoltar={onBack} dark={dark}/>;
  if(etapa==='pagamento') return<Pagamento cliente={cliente} barbeiro={barbeiro} servico={servico} dataHora={dataHora} onConfirmar={ag=>{setAgendamento(ag);setEtapa('confirmado');}} onBack={()=>setEtapa('dataHora')} dark={dark}/>;
  if(etapa==='dataHora') return<EscolherDataHora barbeiro={barbeiro} servico={servico} onEscolher={dh=>{setDataHora(dh);setEtapa('pagamento');}} onBack={()=>setEtapa('servico')} dark={dark} dataHoraPreSelecionada={dataHoraPre}/>;
  if(etapa==='servico') return<EscolherServico barbeiro={barbeiro} onEscolher={sv=>{setServico(sv);setEtapa('dataHora');}} onBack={()=>setEtapa('barbeiro')} dark={dark}/>;

  return<EscolherBarbeiro
    onEscolher={(b,pre)=>{setBarbeiro(b);setDataHoraPre(pre||null);setEtapa('servico');}}
    onBack={onBack} dark={dark} promoAtiva={promoAtiva}
    deepLinkBarbeiro={deepLinkParams?.barbeiroPreSelecionado}/>;
}
