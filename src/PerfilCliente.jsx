// PerfilCliente.jsx — Flyguer BarberShop
// ✅ Fix: query avaliações usa clienteCpf (não clienteId)
// ✅ Fix: promo resgatada aparece na ficha
// ✅ Fix: histórico com excluir cancelamentos

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

function formatarData(dataStr) {
  if (!dataStr) return '';
  const [a,m,d] = dataStr.split('-');
  return `${d}/${m}/${a}`;
}

function comprimirFoto(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 300; let w = img.width, h = img.height;
      if (w > h) { if (w > max) { h = h * max / w; w = max; } }
      else        { if (h > max) { w = w * max / h; h = max; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function Estrelas({ nota, size = 16 }) {
  return (
    <div style={{ display:'flex', gap:'2px' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize:size, color:i<=nota?'#E8C96A':'#3A2018' }}>★</span>
      ))}
    </div>
  );
}

// ─── AGENDAMENTO DIRETO DA PROMO ─────────────────────────────
function AgendarPromo({ cliente, promo, onConcluir, onBack, dark }) {
  const s = getStyles(dark);
  const [barbeiros, setBarbeiros] = React.useState([]);
  const [barbeiro, setBarbeiro]   = React.useState(null);
  const [horarios, setHorarios]   = React.useState([]);
  const [horaSel, setHoraSel]     = React.useState(null);
  const [dataSel, setDataSel]     = React.useState(null);
  const [config, setConfig]       = React.useState(null);
  const [carregando, setCarr]     = React.useState(false);
  const [salvando, setSalv]       = React.useState(false);
  const [erro, setErro]           = React.useState('');

  const DIAS_KEYS   = ['dom','seg','ter','qua','qui','sex','sab'];
  const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const diasDisponiveis = React.useMemo(() => {
    const dias = [];
    const exp = promo.expiracao ? new Date(promo.expiracao) : null;
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      if (promo.validade === 'hoje' && i > 0) break;
      if (exp && d > exp) break;
      dias.push(dStr);
    }
    return dias;
  }, [promo]);

  React.useEffect(() => {
    import('firebase/firestore').then(({ getDocs, query, collection, where, getDoc, doc }) => {
      getDocs(query(collection(db,'barbeiros'), where('ativo','==',true)))
        .then(snap => setBarbeiros(snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.papel!=='recepcao')));
      getDoc(doc(db,'config','barbearia')).then(snap => { if(snap.exists()) setConfig(snap.data()); });
    });
  }, []);

  React.useEffect(() => {
    if (!barbeiro || !dataSel || !config) return;
    setCarr(true); setHoraSel(null);
    import('firebase/firestore').then(({ getDocs, query, collection, where }) => {
      getDocs(query(collection(db,'agendamentos'), where('data','==',dataSel))).then(snap => {
        const ocupadas = snap.docs.map(d=>d.data())
          .filter(a=>a.barbeiroId===barbeiro.id&&['confirmado','pendente'].includes(a.status))
          .map(a=>a.hora);
        const diaSem = DIAS_KEYS[new Date(dataSel+'T12:00:00').getDay()];
        const hc = config.horarios?.[diaSem];
        if (!hc?.aberto) { setHorarios([]); setCarr(false); return; }
        const slots = [];
        const [hA,mA] = hc.abertura.split(':').map(Number);
        const [hF,mF] = hc.fechamento.split(':').map(Number);
        let atual = hA*60+mA, fim = hF*60+mF;
        while (atual+30 <= fim) {
          const hora = `${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`;
          slots.push({ hora, disponivel: !ocupadas.includes(hora) });
          atual += 30;
        }
        setHorarios(slots); setCarr(false);
      });
    });
  }, [barbeiro, dataSel, config]);

  async function confirmar() {
    if (!barbeiro || !dataSel || !horaSel) { setErro('Selecione barbeiro, data e horário'); return; }
    setSalv(true);
    try {
      const { addDoc, collection, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const ag = {
        clienteCpf:cliente.cpf, clienteNome:cliente.nome, clienteTel:cliente.telefone||'',
        barbeiroId:barbeiro.id, barbeiroNome:barbeiro.nome,
        servico:promo.descricao||promo.titulo,
        valor:0, duracao:30,
        data:dataSel, hora:horaSel,
        pagamento:'local', sinal:0,
        status:'confirmado', agendadoPor:'cliente',
        promoResgatada:promo.titulo, promoDescricao:promo.descricao||'',
        criadoEm:serverTimestamp(),
      };
      await addDoc(collection(db,'agendamentos'), ag);
      await updateDoc(doc(db,'resgates_promo',`${cliente.cpf}_ativa`), { utilizado:true, utilizadoEm:serverTimestamp() });
      const msg = encodeURIComponent(
        `✂️ AGENDAMENTO VIA PROMOÇÃO\n\n👤 ${cliente.nome}\n📞 ${cliente.telefone||'—'}\n🔥 Promo: ${promo.titulo}\n✂️ Barbeiro: ${barbeiro.nome}\n📅 ${dataSel} às ${horaSel}\n🎁 ${promo.descricao||''}`
      );
      setTimeout(() => window.open(`https://wa.me/5511977643509?text=${msg}`,'_blank'), 500);
      onConcluir();
    } catch(e) { setErro('Erro ao agendar: '+e.message); }
    setSalv(false);
  }

  return (
    <div style={{ ...s.app, padding:'20px', paddingBottom:'100px' }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'14px', cursor:'pointer', marginBottom:'16px' }}>← Voltar</button>
      <div style={{ background:'linear-gradient(135deg,#8B0000,#F44336)', borderRadius:'14px', padding:'14px', marginBottom:'20px' }}>
        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', fontWeight:'700', marginBottom:'4px' }}>🔥 AGENDAMENTO VIA PROMOÇÃO</div>
        <div style={{ fontWeight:'700', fontSize:'16px', color:'#fff', marginBottom:'2px' }}>{promo.titulo}</div>
        {promo.descricao && <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)' }}>🎁 {promo.descricao}</div>}
      </div>
      <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'600', marginBottom:'10px', textTransform:'uppercase' }}>1. Escolha o barbeiro</div>
      {barbeiros.map(b => (
        <div key={b.id} onClick={() => { setBarbeiro(b); setDataSel(null); setHoraSel(null); }}
          style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px', background:barbeiro?.id===b.id?'#2E1A14':'#231410', borderRadius:'14px', border:barbeiro?.id===b.id?'1.5px solid #8B3A2A':'1px solid #3A2018', marginBottom:'8px', cursor:'pointer' }}>
          <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'700', color:'#F5EFE6', border:b.disponivel?'2px solid #4CAF50':'2px solid #FFC107', overflow:'hidden', flexShrink:0 }}>
            {b.foto?<img src={b.foto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:b.nome[0]}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:'700', fontSize:'15px', color:'#F5EFE6' }}>{b.nome}</div>
            <div style={{ fontSize:'11px', color:'#9A8880' }}>{b.cargo}</div>
          </div>
          <div style={{ fontSize:'11px', padding:'4px 8px', borderRadius:'16px', background:b.disponivel?'rgba(76,175,80,0.15)':'rgba(255,193,7,0.15)', color:b.disponivel?'#4CAF50':'#FFC107' }}>
            {b.disponivel?'● Disponível':'● Ocupado'}
          </div>
        </div>
      ))}
      {barbeiro && (
        <>
          <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'600', marginBottom:'10px', marginTop:'16px', textTransform:'uppercase' }}>2. Escolha a data</div>
          <div style={{ overflowX:'auto', display:'flex', gap:'8px', paddingBottom:'8px', marginBottom:'16px' }}>
            {diasDisponiveis.map(data => {
              const sel = dataSel===data, d = new Date(data+'T12:00:00');
              return (
                <div key={data} onClick={() => setDataSel(data)}
                  style={{ minWidth:'56px', padding:'10px 8px', borderRadius:'12px', textAlign:'center', cursor:'pointer', background:sel?'#8B3A2A':'#231410', border:sel?'1.5px solid #E8C96A':'1px solid #3A2018' }}>
                  <div style={{ fontSize:'10px', color:sel?'#E8C96A':'#9A8880', fontWeight:'600' }}>{DIAS_SEMANA[d.getDay()]}</div>
                  <div style={{ fontSize:'18px', fontWeight:'700', color:'#F5EFE6', marginTop:'2px' }}>{d.getDate()}</div>
                  <div style={{ fontSize:'10px', color:sel?'#E8C96A':'#9A8880' }}>{String(d.getMonth()+1).padStart(2,'0')}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {dataSel && (
        <>
          <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'600', marginBottom:'10px', textTransform:'uppercase' }}>3. Escolha o horário</div>
          {carregando ? <div style={{ textAlign:'center', color:'#9A8880', padding:'20px' }}>Carregando...</div> :
            horarios.length===0 ? <div style={{ textAlign:'center', color:'#9A8880', padding:'12px', background:'#231410', borderRadius:'10px', marginBottom:'16px' }}>Fechado neste dia</div> :
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'16px' }}>
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
      {barbeiro && dataSel && horaSel && (
        <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'430px', background:'#1A0F0D', borderTop:'1px solid #3A2018', padding:'12px 16px 28px', zIndex:100 }}>
          <div style={{ fontSize:'12px', color:'#9A8880', textAlign:'center', marginBottom:'8px' }}>{barbeiro.nome} · {formatarData(dataSel)} às {horaSel}</div>
          <button onClick={confirmar} disabled={salvando}
            style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#8B0000,#F44336)', color:'#fff', fontSize:'15px', fontWeight:'700', cursor:salvando?'wait':'pointer' }}>
            {salvando?'⏳ Confirmando...':'🔥 Confirmar Agendamento com Promo!'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function PerfilCliente({ cliente, onBack, dark, onNavegar }) {
  const s = getStyles(dark);
  const [aba, setAba]                       = React.useState('perfil');
  const [agendamentos, setAgendamentos]     = React.useState([]);
  const [avaliacoes, setAvaliacoes]         = React.useState([]);
  const [assinatura, setAssinatura]         = React.useState(null);
  const [promoResgatada, setPromoResgatada] = React.useState(null);
  const [loading, setLoading]               = React.useState(true);
  const [editando, setEditando]             = React.useState(false);
  const [salvando, setSalvando]             = React.useState(false);
  const [foto, setFoto]                     = React.useState(cliente.foto||null);
  const [nome, setNome]                     = React.useState(cliente.nome||'');
  const [telefone, setTelefone]             = React.useState(cliente.telefone||'');
  const [agendandoPromo, setAgendandoPromo] = React.useState(null);
  const [promoConcluida, setPromoConcluida] = React.useState(false);

  const cardBg  = dark?'#231410':'#fff';
  const border  = dark?'#3A2018':'#e5d5cc';
  const textMain= dark?'#F5EFE6':'#1A0F0D';
  const textSub = dark?'#9A8880':'#7A6860';
  const chave   = cliente.cpf||cliente.uid;

  React.useEffect(() => {
    if (!chave) return;
    let unsubA, unsubAv, unsubAs;
    (async () => {
      const {
        collection, query, where, orderBy, onSnapshot, doc, getDoc,
      } = await import('firebase/firestore');

      // Agendamentos
      const qA = query(
        collection(db,'agendamentos'),
        where('clienteCpf','==',chave),
        orderBy('data','desc'),
        orderBy('hora','desc')
      );
      unsubA = onSnapshot(qA, snap => {
        setAgendamentos(snap.docs.map(d=>({id:d.id,...d.data()})).filter(a=>!a.ocultadoPorCliente));
        setLoading(false);
      }, () => setLoading(false));

      // ✅ CORREÇÃO: clienteId → clienteCpf (campo real salvo em AvaliacaoServico.jsx)
      const qAv = query(
        collection(db,'avaliacoes'),
        where('clienteCpf','==',chave),
        orderBy('criadoEm','desc')
      );
      unsubAv = onSnapshot(qAv,
        snap => setAvaliacoes(snap.docs.map(d=>({id:d.id,...d.data()}))),
        () => {}
      );

      // Assinatura
      const qAs = query(collection(db,'assinaturas'), where('clienteId','==',chave));
      unsubAs = onSnapshot(qAs, snap => {
        const todas = snap.docs.map(d=>({id:d.id,...d.data()}));
        setAssinatura(
          todas.find(a=>a.status==='ativa') ||
          todas.find(a=>a.status==='pendente_pagamento') ||
          null
        );
      }, () => {});

      // Promo resgatada ativa
      try {
        const snapPromo = await getDoc(doc(db,'config','promocao_ativa'));
        if (snapPromo.exists() && snapPromo.data().ativo) {
          const promoAtiva = snapPromo.data();
          const snapR = await getDoc(doc(db,'resgates_promo',`${chave}_ativa`));
          if (snapR.exists() && !snapR.data().utilizado) {
            setPromoResgatada({ ...snapR.data(), promoObj:promoAtiva });
          }
        }
      } catch(e) {}
    })();
    return () => { unsubA?.(); unsubAv?.(); unsubAs?.(); };
  }, [chave]);

  const concluidos  = agendamentos.filter(a=>a.status==='concluido');
  const cancelados  = agendamentos.filter(a=>a.status?.includes('cancelado'));
  const totalGasto  = concluidos.reduce((acc,a)=>acc+(a.valorFinal||a.valor||0),0);
  const mediaNota   = avaliacoes.length>0
    ? (avaliacoes.reduce((a,av)=>a+av.nota,0)/avaliacoes.length).toFixed(1)
    : null;
  const barbeirosMap = {};
  concluidos.forEach(a => { barbeirosMap[a.barbeiroNome]=(barbeirosMap[a.barbeiroNome]||0)+1; });
  const barbeiroFav = Object.entries(barbeirosMap).sort((a,b)=>b[1]-a[1])[0]?.[0];

  function calcularSaldo() {
    if (!assinatura||assinatura.status!=='ativa') return [];
    return (assinatura.servicosInclusos||[]).map(sv => ({
      nome:sv,
      usado:assinatura.usoServicos?.[sv]||0,
      limite:assinatura.limiteServicos?.[sv]||4,
    }));
  }

  async function ocultarCancelamento(ag) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db,'agendamentos',ag.id), { ocultadoPorCliente:true, ocultadoEm:new Date().toISOString() });
    } catch(e) { console.error(e); }
  }

  async function salvarPerfil() {
    setSalvando(true);
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(db,'clientes',chave), { nome, telefone, foto, atualizadoEm:serverTimestamp() }, { merge:true });
      setEditando(false);
    } catch(e) { console.error(e); }
    setSalvando(false);
  }

  if (agendandoPromo) {
    return <AgendarPromo cliente={cliente} promo={agendandoPromo} dark={dark}
      onConcluir={() => { setAgendandoPromo(null); setPromoResgatada(null); setPromoConcluida(true); }}
      onBack={() => setAgendandoPromo(null)} />;
  }

  const saldo = calcularSaldo();

  return (
    <div style={{ ...s.app, paddingBottom:'80px' }}>

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,#1A0F0D,#2E1A14)', position:'relative' }}>
        <div style={{ height:'80px', background:'linear-gradient(135deg,#5C2218,#8B3A2A,#C9A84C)' }} />
        <button onClick={onBack} style={{ position:'absolute', top:'12px', left:'12px', background:'rgba(0,0,0,0.3)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ position:'relative', display:'inline-block', marginLeft:'20px', marginTop:'-36px' }}>
          <label style={{ cursor:editando?'pointer':'default' }}>
            <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', border:`3px solid ${dark?'#1A0F0D':'#fff'}`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', fontWeight:'700', color:'#F5EFE6' }}>
              {foto
                ? <img src={foto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : (nome[0]||'?').toUpperCase()
              }
            </div>
            {editando && (
              <input type="file" accept="image/*"
                onChange={e=>{ const f=e.target.files[0]; if(f) comprimirFoto(f,b=>setFoto(b)); }}
                style={{ display:'none' }}/>
            )}
            {editando && (
              <div style={{ position:'absolute', bottom:0, right:0, background:'#C9A84C', borderRadius:'50%', width:'22px', height:'22px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>📷</div>
            )}
          </label>
        </div>
        <div style={{ padding:'10px 20px 16px' }}>
          {editando ? (
            <div>
              <input value={nome} onChange={e=>setNome(e.target.value)} style={{ ...s.input, marginBottom:'8px', width:'100%', boxSizing:'border-box' }}/>
              <input value={telefone} onChange={e=>setTelefone(e.target.value)} style={{ ...s.input, width:'100%', boxSizing:'border-box' }} type="tel"/>
              <div style={{ display:'flex', gap:'8px', marginTop:'10px' }}>
                <button onClick={salvarPerfil} disabled={salvando}
                  style={{ flex:1, background:'linear-gradient(135deg,#5C2218,#8B3A2A)', border:'none', borderRadius:'10px', padding:'10px', color:'#F5EFE6', fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>
                  {salvando?'Salvando...':'✅ Salvar'}
                </button>
                <button onClick={()=>setEditando(false)}
                  style={{ flex:1, background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'10px', padding:'10px', color:textSub, fontSize:'13px', cursor:'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', fontWeight:'700', color:'#F5EFE6' }}>{nome}</div>
                <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>📞 {telefone||'—'}</div>
                {mediaNota && (
                  <div style={{ marginTop:'4px', display:'flex', alignItems:'center', gap:'4px' }}>
                    <Estrelas nota={Math.round(mediaNota)} size={12}/>
                    <span style={{ fontSize:'11px', color:'#9A8880' }}>{mediaNota}</span>
                  </div>
                )}
              </div>
              <button onClick={()=>setEditando(true)}
                style={{ background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', padding:'6px 12px', color:'#E8C96A', fontSize:'12px', cursor:'pointer', fontWeight:'600' }}>
                ✏️ Editar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', padding:'12px 16px', borderBottom:`1px solid ${border}` }}>
        {[
          { label:'Cortes',      value:concluidos.length,                   color:'#E8C96A' },
          { label:'Total gasto', value:`R$${totalGasto.toFixed(0)}`,        color:'#4CAF50' },
          { label:'Barbeiro fav.',value:barbeiroFav||'—',                   color:'#2E7D7A', small:true },
        ].map(item => (
          <div key={item.label} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'12px', padding:'10px', textAlign:'center' }}>
            <div style={{ fontSize:item.small?'12px':'18px', fontWeight:'700', color:item.color, lineHeight:'1.2' }}>{item.value}</div>
            <div style={{ fontSize:'10px', color:textSub, marginTop:'2px' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* ABAS */}
      <div style={{ display:'flex', borderBottom:`1px solid ${border}` }}>
        {[
          { id:'perfil',    label:'👤 Perfil'    },
          { id:'historico', label:'📋 Histórico' },
          { id:'avaliacoes',label:'⭐ Avaliações'},
        ].map(a => (
          <button key={a.id} onClick={()=>setAba(a.id)}
            style={{ flex:1, padding:'12px 8px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #8B3A2A':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer', whiteSpace:'nowrap' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>

        {/* ─── ABA PERFIL ─── */}
        {aba==='perfil' && (
          <div>
            {promoConcluida && (
              <div style={{ background:'rgba(76,175,80,0.15)', border:'1px solid #4CAF50', borderRadius:'12px', padding:'12px 14px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'24px' }}>🎉</span>
                <div>
                  <div style={{ fontWeight:'700', fontSize:'13px', color:'#4CAF50' }}>Agendamento confirmado!</div>
                  <div style={{ fontSize:'12px', color:textSub }}>Sua promoção foi aplicada com sucesso</div>
                </div>
              </div>
            )}

            {promoResgatada && !promoConcluida && (
              <div style={{ background:'linear-gradient(135deg,rgba(139,0,0,0.2),rgba(244,67,54,0.15))', border:'1.5px solid rgba(244,67,54,0.5)', borderRadius:'16px', padding:'16px', marginBottom:'16px' }}>
                <div style={{ fontSize:'10px', color:'rgba(244,67,54,0.8)', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'6px' }}>🔥 PROMOÇÃO RESGATADA</div>
                <div style={{ fontWeight:'700', fontSize:'15px', color:'#F5EFE6', marginBottom:'4px' }}>{promoResgatada.promoTitulo}</div>
                {promoResgatada.promoDescricao && (
                  <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)', marginBottom:'8px' }}>🎁 {promoResgatada.promoDescricao}</div>
                )}
                {promoResgatada.expiracao && (
                  <div style={{ fontSize:'11px', color:'#FFC107', marginBottom:'10px' }}>⏰ Válido até: {new Date(promoResgatada.expiracao).toLocaleDateString('pt-BR')}</div>
                )}
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)', marginBottom:'12px' }}>
                  📋 Apresente na recepção ao chegar. Agende agora pelo app!
                </div>
                <button onClick={() => setAgendandoPromo(promoResgatada.promoObj)}
                  style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#8B0000,#F44336)', color:'#fff', fontWeight:'700', fontSize:'14px', cursor:'pointer' }}>
                  📅 Agendar agora com esta promoção →
                </button>
              </div>
            )}

            {/* Plano */}
            {assinatura ? (
              <div style={{ background:cardBg, border:`2px solid ${assinatura.planoCor||'#C9A84C'}`, borderRadius:'16px', marginBottom:'12px', overflow:'hidden' }}>
                <div style={{ height:'3px', background:assinatura.planoCor||'#C9A84C' }}/>
                <div style={{ padding:'14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                    <span style={{ fontSize:'24px' }}>{assinatura.planoIcone}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'700', fontSize:'14px', color:textMain }}>Plano {assinatura.planoNome}</div>
                      <div style={{ fontSize:'11px', color:assinatura.status==='ativa'?'#4CAF50':'#FFC107' }}>
                        {assinatura.status==='ativa'?'✅ Ativo':'⏳ Aguardando'} · R$ {Number(assinatura.preco).toFixed(2)}/mês
                      </div>
                    </div>
                    <button onClick={()=>onNavegar&&onNavegar('assinatura_plano')}
                      style={{ background:'transparent', border:`1px solid ${border}`, borderRadius:'8px', padding:'4px 10px', fontSize:'11px', color:textSub, cursor:'pointer' }}>
                      Ver
                    </button>
                  </div>
                  {saldo.length>0 && assinatura.status==='ativa' && (
                    <div style={{ background:dark?'#1A0F0D':'#f9f5f0', borderRadius:'10px', padding:'10px' }}>
                      <div style={{ fontSize:'10px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Saldo do mês</div>
                      {saldo.map(sv => {
                        const restante = Math.max(0,sv.limite-sv.usado);
                        return (
                          <div key={sv.nome} style={{ marginBottom:'6px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                              <span style={{ fontSize:'12px', color:textMain }}>{sv.nome}</span>
                              <span style={{ fontSize:'11px', color:restante===0?'#F44336':assinatura.planoCor||'#C9A84C', fontWeight:'700' }}>
                                {restante===0?'Esgotado':restante+' restante'+(restante!==1?'s':'')}
                              </span>
                            </div>
                            <div style={{ height:'4px', background:dark?'#2E1A14':'#e5d5cc', borderRadius:'2px', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:Math.min(100,(sv.usado/sv.limite)*100)+'%', background:restante===0?'#F44336':(assinatura.planoCor||'#C9A84C'), borderRadius:'2px' }}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontSize:'28px' }}>💳</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'600', fontSize:'13px', color:textMain }}>Sem plano ativo</div>
                  <div style={{ fontSize:'11px', color:textSub }}>Assine um plano e economize nos cortes</div>
                </div>
                <button onClick={()=>onNavegar&&onNavegar('assinatura_plano')}
                  style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', border:'none', borderRadius:'8px', padding:'8px 12px', color:'#F5EFE6', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                  Ver planos
                </button>
              </div>
            )}

            {/* Info */}
            <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'10px', textTransform:'uppercase' }}>Informações</div>
              {[
                { label:'Nome',        value:nome },
                { label:'Telefone',    value:telefone||'—' },
                { label:'CPF',         value:cliente.cpf?`***.${cliente.cpf.slice(3,6)}.${cliente.cpf.slice(6,9)}-**`:'—' },
                { label:'Membro desde',value:cliente.dataCadastro?new Date(cliente.dataCadastro.seconds*1000).toLocaleDateString('pt-BR'):'—' },
                { label:'Preferência', value:cliente.preferencia||'—' },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px', paddingBottom:'8px', borderBottom:`1px solid ${border}` }}>
                  <span style={{ fontSize:'13px', color:textSub }}>{item.label}</span>
                  <span style={{ fontSize:'13px', color:textMain, fontWeight:'600' }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              <button onClick={()=>onNavegar&&onNavegar('agendamento')}
                style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', border:'none', borderRadius:'12px', padding:'14px', color:'#F5EFE6', fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>
                📅 Agendar
              </button>
              <button onClick={()=>onNavegar&&onNavegar('minhas_reservas')}
                style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'12px', padding:'14px', color:textMain, fontWeight:'600', fontSize:'13px', cursor:'pointer' }}>
                📋 Reservas
              </button>
            </div>
          </div>
        )}

        {/* ─── ABA HISTÓRICO ─── */}
        {aba==='historico' && (
          <div>
            {loading && <div style={{ textAlign:'center', padding:'40px', color:textSub }}>Carregando...</div>}
            {!loading && agendamentos.length===0 && (
              <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>📋</div>
                <div>Nenhum agendamento encontrado.</div>
              </div>
            )}
            {cancelados.length>0 && (
              <div style={{ background:'rgba(255,193,7,0.08)', border:'1px solid rgba(255,193,7,0.2)', borderRadius:'10px', padding:'10px 12px', marginBottom:'12px', fontSize:'11px', color:'#FFC107' }}>
                💡 Você pode excluir cancelamentos do histórico.
              </div>
            )}
            {agendamentos.map(ag => {
              const cancelado = ag.status?.includes('cancelado');
              return (
                <div key={ag.id} style={{ background:cardBg, border:`1px solid ${cancelado?'#3A101044':ag.status==='concluido'?'#2E7D7A44':border}`, borderRadius:'14px', padding:'14px', marginBottom:'10px', opacity:cancelado?0.8:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'700', fontSize:'14px', color:textMain }}>{ag.servico}</div>
                      <div style={{ fontSize:'11px', color:textSub }}>✂️ {ag.barbeiroNome} · {formatarData(ag.data)} às {ag.hora}</div>
                      {ag.promoResgatada && <div style={{ fontSize:'11px', color:'#F44336', marginTop:'2px' }}>🔥 {ag.promoResgatada}</div>}
                    </div>
                    <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
                      <div style={{ fontSize:'14px', fontWeight:'700', color:'#E8C96A' }}>R$ {(ag.valorFinal||ag.valor||0).toFixed(2)}</div>
                      <div style={{ fontSize:'10px', color:ag.status==='concluido'?'#4CAF50':cancelado?'#F44336':'#FFC107', fontWeight:'600' }}>
                        {ag.status==='concluido'?'✓ Concluído':cancelado?'✗ Cancelado':'⏳ Pendente'}
                      </div>
                      {cancelado && (
                        <button onClick={()=>ocultarCancelamento(ag)}
                          style={{ background:'rgba(244,67,54,0.1)', border:'none', borderRadius:'6px', padding:'3px 8px', fontSize:'10px', color:'#F44336', cursor:'pointer', fontWeight:'600' }}>
                          🗑️ Excluir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── ABA AVALIAÇÕES ─── */}
        {aba==='avaliacoes' && (
          <div>
            {avaliacoes.length===0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>⭐</div>
                <div style={{ marginBottom:'4px', fontWeight:'600', color:textMain }}>Nenhuma avaliação ainda</div>
              </div>
            ) : (
              <>
                <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'16px', marginBottom:'12px', textAlign:'center' }}>
                  <div style={{ fontSize:'40px', fontWeight:'900', color:'#E8C96A' }}>{mediaNota}</div>
                  <Estrelas nota={Math.round(mediaNota)} size={20}/>
                  <div style={{ fontSize:'12px', color:textSub, marginTop:'4px' }}>{avaliacoes.length} avaliação{avaliacoes.length!==1?'ões':''}</div>
                </div>
                {avaliacoes.map(av => (
                  <div key={av.id} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                      <Estrelas nota={av.nota} size={14}/>
                      <span style={{ fontSize:'11px', color:textSub }}>
                        {av.criadoEm?.toDate?av.criadoEm.toDate().toLocaleDateString('pt-BR'):'—'}
                      </span>
                    </div>
                    <div style={{ fontSize:'12px', color:textSub, marginBottom:'4px' }}>✂️ {av.barbeiroNome} · {av.servico}</div>
                    {av.comentario && (
                      <div style={{ fontSize:'13px', color:textMain, fontStyle:'italic' }}>"{av.comentario}"</div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
