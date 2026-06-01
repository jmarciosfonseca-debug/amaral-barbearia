// Promocao.jsx — Flyguer BarberShop
// ✅ Fase 3: botão disparo sem mostrar quantidade
// ✅ Fase 3: promoção relâmpago bloqueia automaticamente ao esgotar vagas
// ✅ Fase 3: calendário do prazo exato (hoje=1 dia, 48h=2 dias, etc)
// ✅ Fase 3: promoção não usada some automaticamente no prazo

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

const MODELOS = [
  { id:'promo',    emoji:'🔥', label:'Promoção Relâmpago',    texto:'Hoje temos promoção especial! Corte + Barba por R$ 35,00 — só até às 18h! Corre! 🔥' },
  { id:'novidade', emoji:'✨', label:'Novidade',               texto:'Temos novidade na Flyguer BarberShop! Venha conferir nossos novos serviços e promoções. Te esperamos!' },
  { id:'vaga',     emoji:'📅', label:'Vaga disponível',       texto:'Surgiu uma vaga hoje! Horário disponível agora — agende pelo app ou nos chame no WhatsApp. 📅' },
  { id:'feriado',  emoji:'🎉', label:'Aviso de feriado',      texto:'Lembrando que no feriado estaremos funcionando em horário especial. Agende com antecedência!' },
  { id:'custom',   emoji:'✏️', label:'Mensagem personalizada', texto:'' },
];

// ✅ Fase 3: prazo em dias a partir de hoje
const PRAZOS = [
  { id:'hoje',  label:'Só hoje',    dias:0 },
  { id:'48h',   label:'48 horas',   dias:2 },
  { id:'72h',   label:'3 dias',     dias:3 },
  { id:'7d',    label:'7 dias',     dias:7 },
  { id:'30d',   label:'30 dias',    dias:30 },
];

function calcularExpiracao(prazoId) {
  const p = PRAZOS.find(x => x.id === prazoId);
  if (!p) return null;
  const d = new Date();
  if (p.dias === 0) {
    // hoje: expira à meia-noite
    d.setHours(23, 59, 59, 999);
  } else {
    d.setDate(d.getDate() + p.dias);
    d.setHours(23, 59, 59, 999);
  }
  return d.toISOString();
}

export default function Promocao({ onBack, dark }) {
  const s = getStyles(dark);
  const [toastMsg, setToastMsg]     = React.useState('');
  const [toastTipo, setToastTipo]   = React.useState('ok');
  function showToast(msg, tipo='ok') { setToastMsg(msg); setToastTipo(tipo); setTimeout(()=>setToastMsg(''),4000); }

  const [clientes, setClientes]     = React.useState([]);
  const [loading, setLoading]       = React.useState(true);
  const [modelo, setModelo]         = React.useState(MODELOS[0]);
  const [mensagem, setMensagem]     = React.useState(MODELOS[0].texto);
  const [titulo, setTitulo]         = React.useState('Promoção especial hoje!');
  const [prazo, setPrazo]           = React.useState('hoje'); // ✅ Fase 3
  const [vagas, setVagas]           = React.useState('');     // ✅ Fase 3: vazio = sem limite
  const [ehRelampago, setEhRelampago] = React.useState(false); // ✅ Fase 3
  const [enviando, setEnviando]     = React.useState(false);
  const [progresso, setProgresso]   = React.useState(0);
  const [concluido, setConcluido]   = React.useState(false);
  const [promoAtiva, setPromoAtiva] = React.useState(null);
  const [salvandoPromo, setSalvando]= React.useState(false);

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  React.useEffect(() => {
    (async () => {
      const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'clientes'));
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.telefone && c.nome));
      const snapPromo = await getDoc(doc(db, 'config', 'promocao_ativa'));
      if (snapPromo.exists()) setPromoAtiva(snapPromo.data());
      setLoading(false);
    })();
  }, []);

  // ✅ Fase 3: verifica automaticamente se a promoção expirou ao abrir
  React.useEffect(() => {
    if (!promoAtiva?.ativo || !promoAtiva?.expiracao) return;
    if (new Date(promoAtiva.expiracao) < new Date()) {
      // Expirou — desativa automaticamente
      import('firebase/firestore').then(({ doc, setDoc, serverTimestamp }) => {
        setDoc(doc(db, 'config', 'promocao_ativa'), { ativo: false, atualizadoEm: serverTimestamp() });
        setPromoAtiva(p => ({ ...p, ativo: false }));
      });
    }
  }, [promoAtiva]);

  function selecionarModelo(m) {
    setModelo(m);
    if (m.id !== 'custom') setMensagem(m.texto);
    else setMensagem('');
  }

  async function ativarPromo() {
    if (!mensagem.trim()) return;
    setSalvando(true);
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const expiracao = calcularExpiracao(prazo);
      const dados = {
        ativo:       true,
        titulo,
        mensagem,
        modelo:      modelo.id,
        prazo,
        expiracao,
        ehRelampago,
        vagas:       ehRelampago && vagas ? parseInt(vagas) : null,
        resgatados:  0,
        atualizadoEm: serverTimestamp(),
      };
      await setDoc(doc(db, 'config', 'promocao_ativa'), dados);
      setPromoAtiva(dados);
      showToast('✅ Banner ativado! Aparece na tela inicial do app.', 'ok');
    } catch(e) { showToast('❌ Erro ao ativar: ' + e.message, 'erro'); }
    setSalvando(false);
  }

  async function desativarPromo() {
    setSalvando(true);
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(db, 'config', 'promocao_ativa'), { ativo: false, atualizadoEm: serverTimestamp() });
      setPromoAtiva({ ativo: false });
      showToast('⏹ Banner desativado.', 'ok');
    } catch(e) { showToast('❌ Erro: ' + e.message, 'erro'); }
    setSalvando(false);
  }

  // ✅ Fase 3: dispara sem mostrar quantidade no botão
  async function disparar() {
    if (!mensagem.trim()) return;
    setEnviando(true); setProgresso(0); setConcluido(false);
    const comTel = clientes.filter(c => c.telefone);
    for (let i = 0; i < comTel.length; i++) {
      const c = comTel[i];
      const tel = c.telefone.replace(/\D/g, '');
      const msg = encodeURIComponent(
        `Olá, ${c.nome.split(' ')[0]}! 👋\n\n` +
        mensagem + '\n\n' +
        `📍 Shopping Cidade das Artes — Piso 2, Nº 22\n` +
        `📲 Agende pelo app: https://flyguer-barbershop.vercel.app`
      );
      window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
      setProgresso(Math.round(((i + 1) / comTel.length) * 100));
      await new Promise(r => setTimeout(r, 1500));
    }
    setEnviando(false); setConcluido(true);
    setTimeout(() => setConcluido(false), 5000);
  }

  // ✅ Fase 3: limpar resgates expirados (promoção não usada no prazo some)
  async function limparResgatesExpirados() {
    try {
      const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'resgates_promo'));
      const agora = new Date();
      let count = 0;
      for (const d of snap.docs) {
        const r = d.data();
        if (!r.utilizado && r.expiracao && new Date(r.expiracao) < agora) {
          await updateDoc(doc(db, 'resgates_promo', d.id), { expirado: true, arquivado: true });
          count++;
        }
      }
      if (count > 0) showToast(`🗑 ${count} resgate${count!==1?'s':''} expirado${count!==1?'s':''} removido${count!==1?'s':''}.`, 'ok');
    } catch(e) { console.error(e); }
  }

  React.useEffect(() => {
    limparResgatesExpirados();
  }, []);

  const promoEstaAtiva = promoAtiva?.ativo;
  const expiracao = promoAtiva?.expiracao ? new Date(promoAtiva.expiracao) : null;
  const expirou = expiracao && expiracao < new Date();

  return (
    <div style={{ ...s.app, paddingBottom:'60px' }}>
      <div style={{ background:'linear-gradient(135deg,#8B0000,#F44336)', padding:'20px 20px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#fff', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#fff', fontWeight:'700' }}>🔴 Promoção / Comunicado</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)' }}>Dispara para clientes · Controla banner na splash</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:'10px', padding:'6px 12px', fontSize:'13px', fontWeight:'700', color:'#fff' }}>
          👥 {loading ? '...' : clientes.length}
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        {/* STATUS BANNER */}
        <div style={{ background:promoEstaAtiva?'rgba(244,67,54,0.15)':'rgba(46,125,122,0.08)', border:`1px solid ${promoEstaAtiva?'rgba(244,67,54,0.4)':'rgba(46,125,122,0.2)'}`, borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:promoEstaAtiva?'10px':'0' }}>
            <div>
              <div style={{ fontSize:'13px', fontWeight:'700', color:promoEstaAtiva?'#F44336':'#2E7D7A' }}>
                {promoEstaAtiva ? '🔴 Banner ATIVO na splash' : expirou ? '⏱ Banner expirado' : '⚫ Banner desativado'}
              </div>
              <div style={{ fontSize:'11px', color:textSub, marginTop:'2px' }}>
                {promoEstaAtiva && expiracao ? `Expira: ${expiracao.toLocaleDateString('pt-BR')} às ${expiracao.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}` : promoEstaAtiva ? 'Clientes veem o banner antes de fazer login' : 'Nenhum comunicado na tela inicial'}
              </div>
            </div>
            {promoEstaAtiva && (
              <button onClick={desativarPromo} disabled={salvandoPromo}
                style={{ background:'rgba(244,67,54,0.2)', border:'1px solid #F44336', borderRadius:'10px', padding:'8px 12px', color:'#F44336', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                {salvandoPromo ? '...' : '⏹ Desativar'}
              </button>
            )}
          </div>
          {promoEstaAtiva && promoAtiva.mensagem && (
            <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:'8px', padding:'8px 10px', fontSize:'11px', color:'#F5EFE6', fontStyle:'italic' }}>
              "{promoAtiva.mensagem.substring(0,80)}{promoAtiva.mensagem.length>80?'...':''}"
            </div>
          )}
          {promoEstaAtiva && promoAtiva.ehRelampago && (
            <div style={{ marginTop:'8px', fontSize:'12px', color:'#FFC107', fontWeight:'700' }}>
              ⚡ {(promoAtiva.vagas||0) - (promoAtiva.resgatados||0)} vagas restantes de {promoAtiva.vagas}
            </div>
          )}
        </div>

        {/* Concluído */}
        {concluido && (
          <div style={{ background:'rgba(76,175,80,0.15)', border:'1px solid #4CAF50', borderRadius:'14px', padding:'16px', marginBottom:'16px', textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>✅</div>
            <div style={{ fontWeight:'700', color:'#4CAF50' }}>Comunicado enviado!</div>
            <div style={{ fontSize:'12px', color:textSub, marginTop:'4px' }}>Disparado para os clientes cadastrados</div>
          </div>
        )}

        {/* Modelos */}
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px' }}>Tipo de comunicado</div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'16px' }}>
          {MODELOS.map(m => (
            <button key={m.id} onClick={() => selecionarModelo(m)}
              style={{ padding:'8px 12px', borderRadius:'10px', border:`1px solid ${modelo.id===m.id?'#F44336':border}`, background:modelo.id===m.id?'rgba(244,67,54,0.15)':cardBg, color:modelo.id===m.id?'#F44336':textSub, fontSize:'12px', fontWeight:modelo.id===m.id?'700':'400', cursor:'pointer' }}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        {/* Título */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>Título do banner</div>
        <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Título curto..."
          style={{ width:'100%', background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'10px', padding:'10px 12px', color:textMain, fontSize:'13px', outline:'none', boxSizing:'border-box', marginBottom:'12px' }} />

        {/* Mensagem */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Mensagem</div>
        <textarea value={mensagem} onChange={e=>setMensagem(e.target.value)} placeholder="Digite o comunicado..." rows={4}
          style={{ width:'100%', background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'12px', padding:'12px', color:textMain, fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif", resize:'none', marginBottom:'12px' }} />

        {/* ✅ Fase 3: Prazo exato */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Prazo de validade</div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'16px' }}>
          {PRAZOS.map(p => (
            <button key={p.id} onClick={() => setPrazo(p.id)}
              style={{ padding:'8px 12px', borderRadius:'10px', border:`1px solid ${prazo===p.id?'#E8C96A':border}`, background:prazo===p.id?'rgba(232,201,106,0.15)':cardBg, color:prazo===p.id?'#E8C96A':textSub, fontSize:'12px', fontWeight:prazo===p.id?'700':'400', cursor:'pointer' }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* ✅ Fase 3: Promoção relâmpago com vagas */}
        <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'12px', padding:'14px', marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: ehRelampago?'12px':'0' }}>
            <div>
              <div style={{ fontSize:'13px', fontWeight:'700', color:textMain }}>⚡ Promoção Relâmpago</div>
              <div style={{ fontSize:'11px', color:textSub, marginTop:'2px' }}>Limita vagas — bloqueia automaticamente ao esgotar</div>
            </div>
            <div onClick={() => setEhRelampago(e => !e)}
              style={{ width:'44px', height:'24px', borderRadius:'12px', background:ehRelampago?'#F44336':'#3A2018', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:'3px', left:ehRelampago?'23px':'3px', width:'18px', height:'18px', borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
            </div>
          </div>
          {ehRelampago && (
            <div>
              <div style={{ fontSize:'11px', color:textSub, marginBottom:'6px' }}>Número de vagas</div>
              <input type="number" min="1" value={vagas} onChange={e=>setVagas(e.target.value)} placeholder="Ex: 10"
                style={{ width:'100%', background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'10px', padding:'10px 12px', color:textMain, fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
              <div style={{ fontSize:'11px', color:'#FFC107', marginTop:'6px' }}>⚡ Quando todas as vagas forem resgatadas, o banner some automaticamente.</div>
            </div>
          )}
        </div>

        {/* Preview */}
        {mensagem.trim() && (
          <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Preview</div>
            <div style={{ background:'#dcf8c6', borderRadius:'12px 12px 2px 12px', padding:'10px 14px', maxWidth:'85%', marginLeft:'auto' }}>
              <div style={{ fontSize:'12px', color:'#1A0F0D', lineHeight:'1.6', whiteSpace:'pre-line' }}>
                {`Olá, [Nome]! 👋\n\n${mensagem}\n\n📍 Shopping Cidade das Artes — Piso 2, Nº 22\n📲 Agende pelo app`}
              </div>
            </div>
          </div>
        )}

        {/* Progresso */}
        {enviando && (
          <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'16px', marginBottom:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
              <span style={{ fontSize:'13px', color:textMain, fontWeight:'600' }}>📲 Enviando...</span>
              <span style={{ fontSize:'13px', color:'#F44336', fontWeight:'700' }}>{progresso}%</span>
            </div>
            <div style={{ height:'6px', background:dark?'#2E1A14':'#f5efe6', borderRadius:'3px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${progresso}%`, background:'linear-gradient(90deg,#8B0000,#F44336)', borderRadius:'3px', transition:'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Botão ativar banner */}
        <button onClick={ativarPromo} disabled={salvandoPromo||!mensagem.trim()}
          style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:!mensagem.trim()?'#2E1A14':'linear-gradient(135deg,#A07830,#C9A84C)', color:!mensagem.trim()?'#555':'#1A0F0D', fontWeight:'800', fontSize:'14px', cursor:!mensagem.trim()?'not-allowed':'pointer', marginBottom:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          {salvandoPromo ? '⏳...' : promoEstaAtiva ? '🔄 Atualizar banner na splash' : '📌 Ativar banner na tela inicial'}
        </button>

        {/* ✅ Fase 3: botão dispara sem quantidade */}
        <button onClick={disparar} disabled={enviando||!mensagem.trim()||clientes.filter(c=>c.telefone).length===0}
          style={{ width:'100%', padding:'16px', borderRadius:'14px', border:'none', background:enviando||!mensagem.trim()?'#2E1A14':'linear-gradient(135deg,#8B0000,#F44336)', color:enviando||!mensagem.trim()?'#555':'#fff', fontWeight:'800', fontSize:'15px', cursor:enviando||!mensagem.trim()?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          {enviando ? `⏳ Enviando... ${progresso}%` : `🔴 Disparar WhatsApp para clientes`}
        </button>

        <div style={{ fontSize:'11px', color:textSub, textAlign:'center', marginTop:'10px' }}>
          ⚠️ Cada mensagem abre o WhatsApp individualmente. Confirme o envio em cada uma.
        </div>
      </div>

      {toastMsg && (
        <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', background:toastTipo==='ok'?'linear-gradient(135deg,#2E7D7A,#3A9E9A)':'linear-gradient(135deg,#8B0000,#F44336)', color:'#fff', padding:'12px 24px', borderRadius:'14px', fontSize:'13px', fontWeight:'700', zIndex:9999, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', whiteSpace:'nowrap' }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
