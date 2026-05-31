// Promocao.jsx — Flyguer BarberShop
// 🔧 Fix: dispara para TODOS os clientes cadastrados
// 🔧 Nova: toggle ativo/inativo — banner aparece/some na splash
// 🔧 Nova: salva promoção ativa no Firestore (config/promocao_ativa)

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

export default function Promocao({ onBack, dark }) {
  const s = getStyles(dark);
  const [clientes, setClientes]     = React.useState([]);
  const [loading, setLoading]       = React.useState(true);
  const [modelo, setModelo]         = React.useState(MODELOS[0]);
  const [mensagem, setMensagem]     = React.useState(MODELOS[0].texto);
  const [titulo, setTitulo]         = React.useState('Promoção especial hoje!');
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
      // Carrega todos os clientes
      const snap = await getDocs(collection(db, 'clientes'));
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.telefone && c.nome));
      // Carrega promoção ativa atual
      const snapPromo = await getDoc(doc(db, 'config', 'promocao_ativa'));
      if (snapPromo.exists()) setPromoAtiva(snapPromo.data());
      setLoading(false);
    })();
  }, []);

  function selecionarModelo(m) {
    setModelo(m);
    if (m.id !== 'custom') setMensagem(m.texto);
    else setMensagem('');
  }

  // 🔧 Ativar promoção na splash (salva no Firestore)
  async function ativarPromo() {
    if (!mensagem.trim()) return;
    setSalvando(true);
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const dados = { ativo: true, titulo, mensagem, modelo: modelo.id, atualizadoEm: serverTimestamp() };
      await setDoc(doc(db, 'config', 'promocao_ativa'), dados);
      setPromoAtiva(dados);
      alert('✅ Promoção ativada! O banner aparece na tela inicial do app.');
    } catch(e) { alert('Erro: ' + e.message); }
    setSalvando(false);
  }

  // 🔧 Desativar promoção da splash
  async function desativarPromo() {
    setSalvando(true);
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(db, 'config', 'promocao_ativa'), { ativo: false, atualizadoEm: serverTimestamp() });
      setPromoAtiva({ ativo: false });
    } catch(e) { alert('Erro: ' + e.message); }
    setSalvando(false);
  }

  // 🔧 Dispara para TODOS os clientes com telefone
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

  const promoEstaAtiva = promoAtiva?.ativo;

  return (
    <div style={{ ...s.app, paddingBottom:'60px' }}>
      <div style={{ background:'linear-gradient(135deg,#8B0000,#F44336)', padding:'20px 20px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#fff', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#fff', fontWeight:'700' }}>🔴 Promoção / Comunicado</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)' }}>Dispara para todos · Controla banner na splash</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:'10px', padding:'6px 12px', fontSize:'13px', fontWeight:'700', color:'#fff' }}>
          👥 {loading ? '...' : clientes.length}
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        {/* STATUS BANNER SPLASH */}
        <div style={{ background:promoEstaAtiva?'rgba(244,67,54,0.15)':'rgba(46,125,122,0.08)', border:`1px solid ${promoEstaAtiva?'rgba(244,67,54,0.4)':'rgba(46,125,122,0.2)'}`, borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: promoEstaAtiva?'10px':'0' }}>
            <div>
              <div style={{ fontSize:'13px', fontWeight:'700', color:promoEstaAtiva?'#F44336':'#2E7D7A' }}>
                {promoEstaAtiva ? '🔴 Banner ATIVO na splash' : '⚫ Banner desativado'}
              </div>
              <div style={{ fontSize:'11px', color:textSub, marginTop:'2px' }}>
                {promoEstaAtiva ? 'Clientes veem o banner antes de fazer login' : 'Nenhum comunicado na tela inicial'}
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
        </div>

        {/* Concluído */}
        {concluido && (
          <div style={{ background:'rgba(76,175,80,0.15)', border:'1px solid #4CAF50', borderRadius:'14px', padding:'16px', marginBottom:'16px', textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>✅</div>
            <div style={{ fontWeight:'700', color:'#4CAF50' }}>Comunicado enviado!</div>
            <div style={{ fontSize:'12px', color:textSub, marginTop:'4px' }}>Disparado para {clientes.filter(c=>c.telefone).length} clientes</div>
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

        {/* Título (para o banner da splash) */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>Título do banner</div>
        <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Título curto..."
          style={{ width:'100%', background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'10px', padding:'10px 12px', color:textMain, fontSize:'13px', outline:'none', boxSizing:'border-box', marginBottom:'12px' }} />

        {/* Mensagem */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Mensagem</div>
        <textarea value={mensagem} onChange={e=>setMensagem(e.target.value)} placeholder="Digite o comunicado para seus clientes..." rows={5}
          style={{ width:'100%', background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'12px', padding:'12px', color:textMain, fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif", resize:'none', marginBottom:'8px' }} />
        <div style={{ fontSize:'10px', color:textSub, textAlign:'right', marginBottom:'16px' }}>
          {mensagem.length} caracteres · {clientes.filter(c=>c.telefone).length} clientes receberão
        </div>

        {/* Preview */}
        {mensagem.trim() && (
          <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Preview da mensagem</div>
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

        {/* Botão disparar WhatsApp */}
        <button onClick={disparar} disabled={enviando||!mensagem.trim()||clientes.filter(c=>c.telefone).length===0}
          style={{ width:'100%', padding:'16px', borderRadius:'14px', border:'none', background:enviando||!mensagem.trim()?'#2E1A14':'linear-gradient(135deg,#8B0000,#F44336)', color:enviando||!mensagem.trim()?'#555':'#fff', fontWeight:'800', fontSize:'15px', cursor:enviando||!mensagem.trim()?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          {enviando ? `⏳ Enviando... ${progresso}%` : `🔴 Disparar WhatsApp para ${clientes.filter(c=>c.telefone).length} clientes`}
        </button>

        <div style={{ fontSize:'11px', color:textSub, textAlign:'center', marginTop:'10px' }}>
          ⚠️ Cada mensagem abre o WhatsApp individualmente. Confirme o envio em cada uma.
        </div>
      </div>
    </div>
  );
}
