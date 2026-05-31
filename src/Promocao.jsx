// Promocao.jsx — Flyguer BarberShop
// 🔧 Fix: disparo WhatsApp sem destinatário (lista de transmissão)
// 🔧 Nova: Promoção Relâmpago com vagas limitadas + contador
// 🔧 Nova: Comunicado normal sem vagas
// 🔧 Nova: validade configurável
// 🔧 Nova: cliente resgata → registra na ficha

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

const MODELOS = [
  { id:'relampago', emoji:'🔥', label:'Promoção Relâmpago', texto:'Promoção especial! Corte + Barba por R$ 35,00 — só hoje! 🔥' },
  { id:'novidade',  emoji:'✨', label:'Novidade',            texto:'Temos novidade na Flyguer BarberShop! Venha conferir. Te esperamos!' },
  { id:'vaga',      emoji:'📅', label:'Vaga disponível',    texto:'Surgiu uma vaga hoje! Horário disponível agora — agende pelo app. 📅' },
  { id:'feriado',   emoji:'🎉', label:'Aviso de feriado',   texto:'No feriado funcionaremos em horário especial. Agende com antecedência!' },
  { id:'plano',     emoji:'💳', label:'Oferta de plano',    texto:'Oferta especial nos planos mensais! Assine agora e economize. 💳' },
  { id:'custom',    emoji:'✏️', label:'Personalizada',      texto:'' },
];

const VALIDADES = [
  { id:'hoje',   label:'Só hoje',    horas:24  },
  { id:'48h',    label:'48 horas',   horas:48  },
  { id:'semana', label:'7 dias',     horas:168 },
  { id:'livre',  label:'Sem prazo',  horas:0   },
];

export default function Promocao({ onBack, dark }) {
  const s = getStyles(dark);
  const [clientes, setClientes]       = React.useState([]);
  const [loading, setLoading]         = React.useState(true);
  const [modelo, setModelo]           = React.useState(MODELOS[0]);
  const [mensagem, setMensagem]       = React.useState(MODELOS[0].texto);
  const [titulo, setTitulo]           = React.useState('Promoção especial hoje!');
  const [descricao, setDescricao]     = React.useState(''); // o que o cliente ganha
  const [vagas, setVagas]             = React.useState(''); // vazio = comunicado normal
  const [validade, setValidade]       = React.useState(VALIDADES[0]);
  const [promoAtiva, setPromoAtiva]   = React.useState(null);
  const [salvando, setSalvando]       = React.useState(false);
  const [msgCopiada, setMsgCopiada]   = React.useState(false);
  const [quemResgatou, setQuemResgatou] = React.useState([]);

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  const ehRelampago = !!vagas && !isNaN(parseInt(vagas)) && parseInt(vagas) > 0;
  const promoEstaAtiva = promoAtiva?.ativo;
  const vagasNum = parseInt(vagas) || 0;
  const resgatados = promoAtiva?.resgatados || 0;
  const vagasRestantes = ehRelampago ? vagasNum - resgatados : null;

  React.useEffect(() => {
    (async () => {
      const { collection, getDocs, doc, getDoc, query, where, orderBy } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'clientes'));
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.telefone && c.nome));
      const snapPromo = await getDoc(doc(db, 'config', 'promocao_ativa'));
      if (snapPromo.exists()) {
        const p = snapPromo.data();
        setPromoAtiva(p);
        if (p.ativo && p.titulo) setTitulo(p.titulo);
        if (p.ativo && p.mensagem) setMensagem(p.mensagem);
        if (p.ativo && p.descricao) setDescricao(p.descricao);
        if (p.ativo && p.vagas) setVagas(String(p.vagas));
      }
      // Buscar quem resgatou
      try {
        const snapR = await getDocs(query(collection(db,'resgates_promo'), orderBy('resgatadoEm','desc')));
        setQuemResgatou(snapR.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e) {}
      setLoading(false);
    })();
  }, []);

  function selecionarModelo(m) {
    setModelo(m);
    if (m.id !== 'custom') setMensagem(m.texto);
    else setMensagem('');
  }

  // Calcula data de expiração
  function calcularExpiracao() {
    if (validade.horas === 0) return null;
    const exp = new Date();
    exp.setHours(exp.getHours() + validade.horas);
    return exp.toISOString();
  }

  // Ativar promoção
  async function ativarPromo() {
    if (!mensagem.trim()) return;
    setSalvando(true);
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const expiracao = calcularExpiracao();
      const dados = {
        ativo: true,
        titulo,
        mensagem,
        descricao,
        modelo: modelo.id,
        vagas: ehRelampago ? vagasNum : 0,
        ehRelampago,
        validade: validade.id,
        expiracao,
        resgatados: promoAtiva?.resgatados || 0,
        atualizadoEm: serverTimestamp(),
      };
      await setDoc(doc(db, 'config', 'promocao_ativa'), dados);
      setPromoAtiva(dados);
    } catch(e) { alert('Erro: ' + e.message); }
    setSalvando(false);
  }

  // Desativar
  async function desativarPromo() {
    setSalvando(true);
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(db, 'config', 'promocao_ativa'), { ativo: false, atualizadoEm: serverTimestamp() });
      setPromoAtiva({ ativo: false });
    } catch(e) { alert('Erro: ' + e.message); }
    setSalvando(false);
  }

  // 🔧 Fix disparo: abre WhatsApp SEM destinatário
  // Gerente copia mensagem e manda na lista/grupo que quiser
  function copiarMensagem() {
    const msg =
      `${titulo}\n\n` +
      mensagem + '\n\n' +
      (descricao ? `🎁 O que você ganha: ${descricao}\n\n` : '') +
      (ehRelampago ? `⚡ Apenas ${vagasNum} vagas disponíveis!\n\n` : '') +
      `📍 Shopping Cidade das Artes — Piso 2, Nº 22\n` +
      `📲 Acesse agora: https://flyguer-barbershop.vercel.app`;
    navigator.clipboard?.writeText(msg);
    setMsgCopiada(true);
    setTimeout(() => setMsgCopiada(false), 3000);
  }

  // Abre WhatsApp Web sem destinatário para o gerente escolher
  function abrirWhatsAppSemDestinatario() {
    const msg = encodeURIComponent(
      `${titulo}\n\n` +
      mensagem + '\n\n' +
      (descricao ? `🎁 O que você ganha: ${descricao}\n\n` : '') +
      (ehRelampago ? `⚡ Apenas ${vagasNum} vagas disponíveis!\n\n` : '') +
      `📍 Shopping Cidade das Artes — Piso 2, Nº 22\n` +
      `📲 Acesse agora: https://flyguer-barbershop.vercel.app`
    );
    // Sem número = abre WhatsApp para o gerente escolher destinatário / lista / grupo
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  return (
    <div style={{ ...s.app, paddingBottom:'60px' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#8B0000,#F44336)', padding:'20px 20px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#fff', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#fff', fontWeight:'700' }}>🔴 Promoção / Comunicado</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)' }}>Banner na splash · Disparo WhatsApp</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:'10px', padding:'6px 12px', fontSize:'13px', fontWeight:'700', color:'#fff' }}>
          👥 {loading ? '...' : clientes.length}
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        {/* STATUS ATUAL */}
        {promoEstaAtiva && (
          <div style={{ background:'rgba(244,67,54,0.12)', border:'1.5px solid rgba(244,67,54,0.4)', borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:'700', color:'#F44336' }}>🔴 Banner ATIVO na tela inicial</div>
                <div style={{ fontSize:'11px', color:textSub, marginTop:'2px' }}>Todos os visitantes estão vendo</div>
              </div>
              <button onClick={desativarPromo} disabled={salvando}
                style={{ background:'rgba(244,67,54,0.2)', border:'1px solid #F44336', borderRadius:'10px', padding:'8px 12px', color:'#F44336', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                {salvando ? '...' : '⏹ Desativar'}
              </button>
            </div>
            {/* Contador de vagas */}
            {promoAtiva.ehRelampago && (
              <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'10px', padding:'10px 12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                  <span style={{ fontSize:'12px', color:'#F5EFE6', fontWeight:'600' }}>⚡ Vagas relâmpago</span>
                  <span style={{ fontSize:'16px', fontWeight:'900', color: vagasRestantes<=0?'#F44336':'#E8C96A' }}>
                    {vagasRestantes<=0 ? '🔒 ENCERRADA' : `${vagasRestantes} de ${promoAtiva.vagas} restantes`}
                  </span>
                </div>
                <div style={{ height:'6px', background:'#2E1A14', borderRadius:'3px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100,(resgatados/promoAtiva.vagas)*100)}%`, background:'linear-gradient(90deg,#E8C96A,#F44336)', borderRadius:'3px', transition:'width 0.5s' }} />
                </div>
                <div style={{ fontSize:'11px', color:textSub, marginTop:'4px' }}>{resgatados} cliente(s) resgataram</div>
              </div>
            )}
            {promoAtiva.expiracao && (
              <div style={{ fontSize:'11px', color:'#FFC107', marginTop:'8px' }}>
                ⏰ Válido até: {new Date(promoAtiva.expiracao).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
              </div>
            )}
          </div>
        )}

        {/* QUEM RESGATOU */}
        {quemResgatou.length > 0 && (
          <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
            <div style={{ fontSize:'12px', fontWeight:'700', color:'#E8C96A', marginBottom:'10px' }}>🔥 Resgates — {quemResgatou.length} cliente(s)</div>
            {quemResgatou.slice(0,5).map((r,i) => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', background:dark?'#1A0F0D':'#f5efe6', borderRadius:'8px', marginBottom:'4px' }}>
                <div>
                  <div style={{ fontSize:'12px', color:textMain, fontWeight:'600' }}>{r.clienteNome}</div>
                  <div style={{ fontSize:'10px', color:textSub }}>{r.promoTitulo}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'10px', color:r.utilizado?'#4CAF50':'#FFC107', fontWeight:'700' }}>{r.utilizado?'✅ Usado':'⏳ Pendente'}</div>
                  <div style={{ fontSize:'10px', color:textSub }}>
                    {r.resgatadoEm?.toDate ? new Date(r.resgatadoEm.toDate()).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TIPO */}
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px' }}>Tipo de comunicado</div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'16px' }}>
          {MODELOS.map(m => (
            <button key={m.id} onClick={() => selecionarModelo(m)}
              style={{ padding:'8px 12px', borderRadius:'10px', border:`1px solid ${modelo.id===m.id?'#F44336':border}`, background:modelo.id===m.id?'rgba(244,67,54,0.15)':cardBg, color:modelo.id===m.id?'#F44336':textSub, fontSize:'12px', fontWeight:modelo.id===m.id?'700':'400', cursor:'pointer' }}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        {/* TÍTULO */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>Título do banner</div>
        <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ex: Promoção especial hoje!"
          style={{ width:'100%', background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'10px', padding:'10px 12px', color:textMain, fontSize:'13px', outline:'none', boxSizing:'border-box', marginBottom:'12px' }} />

        {/* MENSAGEM */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>Mensagem</div>
        <textarea value={mensagem} onChange={e=>setMensagem(e.target.value)} placeholder="Descreva a promoção..." rows={4}
          style={{ width:'100%', background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'12px', padding:'12px', color:textMain, fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif", resize:'none', marginBottom:'12px' }} />

        {/* O QUE O CLIENTE GANHA */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>O que o cliente ganha (aparece na ficha)</div>
        <input value={descricao} onChange={e=>setDescricao(e.target.value)} placeholder="Ex: Corte + Barba por R$35,00"
          style={{ width:'100%', background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'10px', padding:'10px 12px', color:textMain, fontSize:'13px', outline:'none', boxSizing:'border-box', marginBottom:'12px' }} />

        {/* VAGAS — campo chave */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>
          Vagas limitadas <span style={{ color:'#555', textTransform:'none', fontWeight:'400' }}>(deixe vazio para comunicado normal)</span>
        </div>
        <div style={{ display:'flex', gap:'8px', marginBottom:'12px', alignItems:'center' }}>
          <input
            type="number"
            min="1"
            max="100"
            value={vagas}
            onChange={e=>setVagas(e.target.value)}
            placeholder="Ex: 3"
            style={{ width:'100px', background:dark?'#2E1A14':'#f5efe6', border:`1.5px solid ${ehRelampago?'#F44336':border}`, borderRadius:'10px', padding:'10px 12px', color:ehRelampago?'#F44336':textMain, fontSize:'18px', fontWeight:'700', outline:'none', textAlign:'center' }}
          />
          {ehRelampago ? (
            <div style={{ background:'rgba(244,67,54,0.15)', border:'1px solid rgba(244,67,54,0.4)', borderRadius:'10px', padding:'8px 12px', fontSize:'12px', color:'#F44336', fontWeight:'700' }}>
              ⚡ Relâmpago — {vagasNum} vaga{vagasNum!==1?'s':''} · zera automaticamente
            </div>
          ) : (
            <div style={{ background:'rgba(46,125,122,0.08)', border:'1px solid rgba(46,125,122,0.2)', borderRadius:'10px', padding:'8px 12px', fontSize:'12px', color:'#2E7D7A' }}>
              📢 Comunicado normal · fica até desativar
            </div>
          )}
        </div>

        {/* VALIDADE */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Validade</div>
        <div style={{ display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap' }}>
          {VALIDADES.map(v => (
            <button key={v.id} onClick={()=>setValidade(v)}
              style={{ padding:'8px 14px', borderRadius:'10px', border:`1px solid ${validade.id===v.id?'#E8C96A':border}`, background:validade.id===v.id?'rgba(232,201,106,0.15)':cardBg, color:validade.id===v.id?'#E8C96A':textSub, fontSize:'12px', fontWeight:validade.id===v.id?'700':'400', cursor:'pointer' }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* BOTÃO ATIVAR BANNER */}
        <button onClick={ativarPromo} disabled={salvando||!mensagem.trim()}
          style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:!mensagem.trim()?'#2E1A14':'linear-gradient(135deg,#A07830,#C9A84C)', color:!mensagem.trim()?'#555':'#1A0F0D', fontWeight:'800', fontSize:'14px', cursor:!mensagem.trim()?'not-allowed':'pointer', marginBottom:'10px' }}>
          {salvando ? '⏳...' : promoEstaAtiva ? '🔄 Atualizar banner na tela inicial' : '📌 Ativar banner na tela inicial'}
        </button>

        {/* DISPARO WHATSAPP — sem destinatário */}
        <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
          <div style={{ fontSize:'12px', fontWeight:'700', color:textMain, marginBottom:'4px' }}>📲 Disparo WhatsApp</div>
          <div style={{ fontSize:'11px', color:textSub, marginBottom:'12px', lineHeight:'1.5' }}>
            Copie a mensagem e cole na sua lista de transmissão, grupo ou selecione os contatos que quiser no WhatsApp.
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={copiarMensagem} disabled={!mensagem.trim()}
              style={{ flex:1, padding:'12px', borderRadius:'10px', border:`1px solid ${border}`, background:msgCopiada?'rgba(76,175,80,0.2)':dark?'#1A0F0D':'#f5efe6', color:msgCopiada?'#4CAF50':textMain, fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
              {msgCopiada ? '✅ Copiado!' : '📋 Copiar mensagem'}
            </button>
            <button onClick={abrirWhatsAppSemDestinatario} disabled={!mensagem.trim()}
              style={{ flex:1, padding:'12px', borderRadius:'10px', border:'none', background:!mensagem.trim()?'#2E1A14':'linear-gradient(135deg,#25D366,#128C7E)', color:!mensagem.trim()?'#555':'#fff', fontSize:'13px', fontWeight:'700', cursor:!mensagem.trim()?'not-allowed':'pointer' }}>
              📲 Abrir WhatsApp
            </button>
          </div>
        </div>

        <div style={{ fontSize:'11px', color:textSub, textAlign:'center' }}>
          💡 No WhatsApp, selecione seus contatos, lista de transmissão ou grupo
        </div>
      </div>
    </div>
  );
}
