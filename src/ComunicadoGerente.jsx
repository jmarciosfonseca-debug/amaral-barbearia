// ComunicadoGerente.jsx — Flyguer BarberShop
// ✅ Aba Divulgação — números livres sem cadastro
// ✅ Link do app automático na divulgação
// ✅ Fix %0A nas mensagens WhatsApp
// ✅ Histórico de comunicados

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

const MODELOS_EQUIPE = [
  { id:'reuniao',  emoji:'📢', label:'Reunião',           texto:'Pessoal, teremos uma reunião hoje. Favor comparecer pontualmente.' },
  { id:'aviso',    emoji:'⚠️', label:'Aviso importante',  texto:'Aviso importante para a equipe. Por favor, leiam com atenção.' },
  { id:'horario',  emoji:'🕐', label:'Mudança de horário', texto:'Informamos mudança no horário de funcionamento de hoje.' },
  { id:'parabens', emoji:'🎉', label:'Parabéns',           texto:'Quero parabenizar a equipe pelo excelente trabalho! Orgulho de todos vocês.' },
  { id:'folga',    emoji:'🏖️', label:'Folga / Feriado',   texto:'Lembrando que amanhã não haverá expediente. Bom descanso a todos!' },
  { id:'custom',   emoji:'✏️', label:'Personalizado',      texto:'' },
];

const MODELOS_DIVULG = [
  { id:'app',      emoji:'📲', label:'Baixe o app',       texto:'A Flyguer BarberShop agora tem app! Agende seu horário, veja promoções e muito mais. Baixe agora:' },
  { id:'promo',    emoji:'🔥', label:'Promoção',           texto:'Temos uma promoção especial esperando por você! Agende pelo app e aproveite.' },
  { id:'novidade', emoji:'✨', label:'Novidade',           texto:'Novidade na Flyguer BarberShop! Venha conferir e agende pelo nosso app.' },
  { id:'custom',   emoji:'✏️', label:'Personalizado',      texto:'' },
];

const APP_LINK = 'https://flyguer-barbershop.vercel.app';

// ✅ Fix: monta URL WhatsApp sem %0A
function montarLinkWhatsApp(tel, linhas) {
  const texto = linhas.filter(Boolean).join('\n');
  return `https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`;
}

export default function ComunicadoGerente({ onBack, dark }) {
  const s        = getStyles(dark);
  const cardBg   = dark ? '#231410' : '#fff';
  const border   = dark ? '#3A2018' : '#e5d5cc';
  const textMain = dark ? '#F5EFE6' : '#1A0F0D';
  const textSub  = dark ? '#9A8880' : '#7A6860';
  const inp      = { width:'100%', background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'10px', padding:'10px 12px', color:textMain, fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" };

  const [aba, setAba] = React.useState('equipe'); // 'equipe' | 'divulgacao' | 'historico'

  // ── EQUIPE ────────────────────────────────────────
  const [barbeiros, setBarbeiros]       = React.useState([]);
  const [selecionados, setSelecionados] = React.useState([]);
  const [modeloEq, setModeloEq]         = React.useState(MODELOS_EQUIPE[0]);
  const [mensagemEq, setMensagemEq]     = React.useState(MODELOS_EQUIPE[0].texto);
  const [horario, setHorario]           = React.useState('');
  const [local, setLocal]               = React.useState('Flyguer BarberShop — Piso 2, Nº 22');
  const [enviandoEq, setEnviandoEq]     = React.useState(false);
  const [enviadosEq, setEnviadosEq]     = React.useState([]);
  const [concluidoEq, setConcluidoEq]   = React.useState(false);

  // ── DIVULGAÇÃO ────────────────────────────────────
  const [modeloDiv, setModeloDiv]       = React.useState(MODELOS_DIVULG[0]);
  const [mensagemDiv, setMensagemDiv]   = React.useState(MODELOS_DIVULG[0].texto);
  const [numerosRaw, setNumerosRaw]     = React.useState('');
  const [enviandoDiv, setEnviandoDiv]   = React.useState(false);
  const [progressoDiv, setProgressoDiv] = React.useState(0);
  const [concluidoDiv, setConcluidoDiv] = React.useState(false);
  const [erroDiv, setErroDiv]           = React.useState('');

  // ── HISTÓRICO ─────────────────────────────────────
  const [historico, setHistorico]       = React.useState([]);
  const [loadingHist, setLoadingHist]   = React.useState(false);

  React.useEffect(() => {
    import('firebase/firestore').then(({ collection, getDocs }) => {
      getDocs(collection(db, 'barbeiros')).then(snap => {
        const lista = snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(b => b.ativo && b.whatsapp);
        setBarbeiros(lista);
        setSelecionados(lista.map(b => b.id));
      });
    });
  }, []);

  React.useEffect(() => {
    if (aba !== 'historico') return;
    setLoadingHist(true);
    import('firebase/firestore').then(({ collection, getDocs, query, orderBy }) => {
      getDocs(query(collection(db, 'comunicados'), orderBy('enviadoEm', 'desc'))).then(snap => {
        setHistorico(snap.docs.map(d => ({ id:d.id, ...d.data() })));
        setLoadingHist(false);
      }).catch(() => setLoadingHist(false));
    });
  }, [aba]);

  // ── Parsear números livres ────────────────────────
  function parsearNumeros(raw) {
    return raw
      .split(/[\n,;]+/)
      .map(n => n.replace(/\D/g, '').slice(-11))
      .filter(n => n.length >= 10);
  }

  // ── Disparar para EQUIPE ─────────────────────────
  async function dispararEquipe() {
    if (!mensagemEq.trim() || selecionados.length === 0) return;
    setEnviandoEq(true); setConcluidoEq(false); setEnviadosEq([]);
    const alvos = barbeiros.filter(b => selecionados.includes(b.id));
    for (let i = 0; i < alvos.length; i++) {
      const b = alvos[i];
      const tel = b.whatsapp?.replace(/\D/g, '');
      if (!tel) continue;
      const linhas = [
        '📢 *COMUNICADO DA BARBEARIA*',
        '',
        `Olá, ${b.nome}! 👋`,
        '',
        mensagemEq,
        horario ? `🕐 *Horário:* ${horario}` : '',
        local   ? `📍 *Local:* ${local}`     : '',
        '',
        '_Flyguer BarberShop_',
      ];
      window.open(montarLinkWhatsApp(tel, linhas), '_blank');
      setEnviadosEq(prev => [...prev, b.id]);
      await new Promise(r => setTimeout(r, 1500));
    }
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'comunicados'), {
        tipo: 'equipe', modelo: modeloEq.id, modeloLabel: modeloEq.label, modeloEmoji: modeloEq.emoji,
        mensagem: mensagemEq, horario: horario||null, local: local||null,
        destinatarios: alvos.map(b => ({ id:b.id, nome:b.nome, whatsapp:b.whatsapp })),
        totalEnviados: alvos.length, enviadoEm: serverTimestamp(), enviadoPor: 'gerente',
      });
    } catch(e) { console.error(e); }
    setEnviandoEq(false); setConcluidoEq(true);
    setTimeout(() => setConcluidoEq(false), 5000);
  }

  // ── Disparar DIVULGAÇÃO ──────────────────────────
  async function dispararDivulgacao() {
    setErroDiv('');
    const numeros = parsearNumeros(numerosRaw);
    if (numeros.length === 0) { setErroDiv('Adicione pelo menos um número válido.'); return; }
    if (!mensagemDiv.trim())  { setErroDiv('Digite a mensagem.'); return; }
    setEnviandoDiv(true); setConcluidoDiv(false); setProgressoDiv(0);
    for (let i = 0; i < numeros.length; i++) {
      const tel = numeros[i];
      const linhas = [
        '📣 *Flyguer BarberShop*',
        '',
        mensagemDiv,
        '',
        `📲 Acesse nosso app: ${APP_LINK}`,
        '',
        '📍 Shopping Cidade das Artes — Piso 2, Nº 22',
      ];
      window.open(montarLinkWhatsApp(tel, linhas), '_blank');
      setProgressoDiv(Math.round(((i+1)/numeros.length)*100));
      await new Promise(r => setTimeout(r, 1500));
    }
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'comunicados'), {
        tipo: 'divulgacao', modelo: modeloDiv.id, modeloLabel: modeloDiv.label, modeloEmoji: modeloDiv.emoji,
        mensagem: mensagemDiv, totalEnviados: numeros.length,
        enviadoEm: serverTimestamp(), enviadoPor: 'gerente',
      });
    } catch(e) { console.error(e); }
    setEnviandoDiv(false); setConcluidoDiv(true);
    setTimeout(() => setConcluidoDiv(false), 5000);
  }

  function formatarTs(ts) {
    if (!ts?.toDate) return '—';
    return ts.toDate().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  }

  const todosSelected = selecionados.length === barbeiros.length;
  const numerosValidos = parsearNumeros(numerosRaw);

  return (
    <div style={{ ...s.app, paddingBottom:'80px' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#fff', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#fff', fontWeight:'700' }}>📢 Comunicados</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)' }}>Equipe · Divulgação · Histórico</div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018', background:dark?'#1A0F0D':'#fff' }}>
        {[
          { id:'equipe',      label:'✂️ Equipe'      },
          { id:'divulgacao',  label:'📣 Divulgação'  },
          { id:'historico',   label:'📋 Histórico'   },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ flex:1, padding:'12px 6px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #2E7D7A':'2px solid transparent', color:aba===a.id?'#2E7D7A':textSub, fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ═══ ABA EQUIPE ═══ */}
      {aba === 'equipe' && (
        <div style={{ padding:'16px' }}>
          {concluidoEq && (
            <div style={{ background:'rgba(76,175,80,0.15)', border:'1px solid #4CAF50', borderRadius:'14px', padding:'16px', marginBottom:'16px', textAlign:'center' }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>✅</div>
              <div style={{ fontWeight:'700', color:'#4CAF50' }}>Comunicado enviado!</div>
              <div style={{ fontSize:'12px', color:textSub, marginTop:'4px' }}>Disparado para {enviadosEq.length} barbeiro{enviadosEq.length!==1?'s':''}</div>
            </div>
          )}

          <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px' }}>Tipo</div>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'14px' }}>
            {MODELOS_EQUIPE.map(m => (
              <button key={m.id} onClick={() => { setModeloEq(m); if(m.id!=='custom') setMensagemEq(m.texto); else setMensagemEq(''); }}
                style={{ padding:'8px 12px', borderRadius:'10px', border:`1px solid ${modeloEq.id===m.id?'#2E7D7A':border}`, background:modeloEq.id===m.id?'rgba(46,125,122,0.15)':cardBg, color:modeloEq.id===m.id?'#2E7D7A':textSub, fontSize:'12px', fontWeight:modeloEq.id===m.id?'700':'400', cursor:'pointer' }}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>Mensagem *</div>
          <textarea value={mensagemEq} onChange={e=>setMensagemEq(e.target.value)} placeholder="Digite o comunicado..." rows={4}
            style={{ ...inp, borderRadius:'12px', padding:'12px', resize:'none', marginBottom:'12px' }} />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
            <div>
              <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px' }}>Horário (opcional)</div>
              <input type="time" value={horario} onChange={e=>setHorario(e.target.value)} style={inp} />
            </div>
            <div>
              <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px' }}>Local (opcional)</div>
              <input value={local} onChange={e=>setLocal(e.target.value)} style={inp} />
            </div>
          </div>

          {/* Preview equipe */}
          {mensagemEq.trim() && (
            <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'14px' }}>
              <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Preview</div>
              <div style={{ background:'#dcf8c6', borderRadius:'12px 12px 2px 12px', padding:'10px 14px', maxWidth:'90%', marginLeft:'auto' }}>
                <div style={{ fontSize:'12px', color:'#1A0F0D', lineHeight:'1.7', whiteSpace:'pre-line' }}>
                  {[
                    '📢 *COMUNICADO DA BARBEARIA*', '',
                    'Olá, [Nome]! 👋', '', mensagemEq,
                    horario ? `🕐 *Horário:* ${horario}` : '',
                    local   ? `📍 *Local:* ${local}` : '',
                    '', '_Flyguer BarberShop_',
                  ].filter(l => l !== undefined).join('\n')}
                </div>
              </div>
            </div>
          )}

          {/* Selecionar barbeiros */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
            <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase' }}>Enviar para</div>
            <button onClick={() => setSelecionados(todosSelected ? [] : barbeiros.map(b=>b.id))}
              style={{ fontSize:'11px', color:'#2E7D7A', background:'none', border:'none', cursor:'pointer', fontWeight:'600' }}>
              {todosSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          </div>

          {barbeiros.map(b => {
            const sel = selecionados.includes(b.id);
            const jaEnviou = enviadosEq.includes(b.id);
            return (
              <div key={b.id} onClick={() => !enviandoEq && setSelecionados(prev => prev.includes(b.id) ? prev.filter(x=>x!==b.id) : [...prev, b.id])}
                style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:sel?'rgba(46,125,122,0.1)':cardBg, border:`1px solid ${sel?'rgba(46,125,122,0.4)':border}`, borderRadius:'12px', marginBottom:'8px', cursor:'pointer' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>
                  {b.nome[0]}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'700', fontSize:'14px', color:textMain }}>{b.nome}</div>
                  <div style={{ fontSize:'11px', color:textSub }}>📞 {b.whatsapp}</div>
                </div>
                {jaEnviou ? (
                  <div style={{ fontSize:'12px', color:'#4CAF50', fontWeight:'700' }}>✅</div>
                ) : (
                  <div style={{ width:'22px', height:'22px', borderRadius:'6px', border:`2px solid ${sel?'#2E7D7A':border}`, background:sel?'#2E7D7A':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', color:'#fff', flexShrink:0 }}>
                    {sel?'✓':''}
                  </div>
                )}
              </div>
            );
          })}

          {barbeiros.length === 0 && (
            <div style={{ textAlign:'center', padding:'20px', color:textSub, fontSize:'13px' }}>Nenhum barbeiro com WhatsApp cadastrado.</div>
          )}

          <button onClick={dispararEquipe} disabled={enviandoEq||!mensagemEq.trim()||selecionados.length===0}
            style={{ width:'100%', padding:'16px', borderRadius:'14px', border:'none', background:enviandoEq||!mensagemEq.trim()||selecionados.length===0?'#2E1A14':'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:enviandoEq||!mensagemEq.trim()||selecionados.length===0?'#555':'#fff', fontWeight:'800', fontSize:'15px', cursor:enviandoEq||!mensagemEq.trim()||selecionados.length===0?'not-allowed':'pointer', marginTop:'16px' }}>
            {enviandoEq ? `⏳ Enviando... (${enviadosEq.length}/${selecionados.length})` : `📲 Disparar para ${selecionados.length} barbeiro${selecionados.length!==1?'s':''}`}
          </button>
          <div style={{ fontSize:'11px', color:textSub, textAlign:'center', marginTop:'10px' }}>
            ⚠️ Cada mensagem abre o WhatsApp individualmente.
          </div>
        </div>
      )}

      {/* ═══ ABA DIVULGAÇÃO ═══ */}
      {aba === 'divulgacao' && (
        <div style={{ padding:'16px' }}>

          {concluidoDiv && (
            <div style={{ background:'rgba(76,175,80,0.15)', border:'1px solid #4CAF50', borderRadius:'14px', padding:'16px', marginBottom:'16px', textAlign:'center' }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>✅</div>
              <div style={{ fontWeight:'700', color:'#4CAF50' }}>Divulgação enviada!</div>
              <div style={{ fontSize:'12px', color:textSub, marginTop:'4px' }}>Disparado para {numerosValidos.length} contato{numerosValidos.length!==1?'s':''}</div>
            </div>
          )}

          {/* Info */}
          <div style={{ background:'rgba(232,201,106,0.08)', border:'1px solid rgba(232,201,106,0.2)', borderRadius:'12px', padding:'12px 14px', marginBottom:'16px' }}>
            <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', marginBottom:'4px' }}>📣 Como funciona</div>
            <div style={{ fontSize:'12px', color:textSub, lineHeight:'1.6' }}>
              Cole os números abaixo — podem ser clientes, conhecidos, qualquer contato. O link do app vai automaticamente na mensagem.
            </div>
          </div>

          {/* Tipo de mensagem */}
          <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px' }}>Tipo de divulgação</div>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'14px' }}>
            {MODELOS_DIVULG.map(m => (
              <button key={m.id} onClick={() => { setModeloDiv(m); if(m.id!=='custom') setMensagemDiv(m.texto); else setMensagemDiv(''); }}
                style={{ padding:'8px 12px', borderRadius:'10px', border:`1px solid ${modeloDiv.id===m.id?'#F44336':border}`, background:modeloDiv.id===m.id?'rgba(244,67,54,0.15)':cardBg, color:modeloDiv.id===m.id?'#F44336':textSub, fontSize:'12px', fontWeight:modeloDiv.id===m.id?'700':'400', cursor:'pointer' }}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>

          {/* Mensagem */}
          <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>Mensagem *</div>
          <textarea value={mensagemDiv} onChange={e=>setMensagemDiv(e.target.value)} placeholder="Digite a mensagem de divulgação..." rows={4}
            style={{ ...inp, borderRadius:'12px', padding:'12px', resize:'none', marginBottom:'12px' }} />

          {/* Números */}
          <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>
            Números de WhatsApp *
            {numerosValidos.length > 0 && <span style={{ color:'#4CAF50', marginLeft:'8px', fontWeight:'700' }}>{numerosValidos.length} válido{numerosValidos.length!==1?'s':''}</span>}
          </div>
          <textarea value={numerosRaw} onChange={e => { setNumerosRaw(e.target.value); setErroDiv(''); }} rows={5}
            placeholder={'Cole os números aqui, um por linha ou separados por vírgula:\n11999999999\n11988888888\nou: 11999999999, 11988888888'}
            style={{ ...inp, borderRadius:'12px', padding:'12px', resize:'none', marginBottom:'8px', fontSize:'12px', fontFamily:'monospace' }} />
          <div style={{ fontSize:'11px', color:textSub, marginBottom:'14px' }}>
            Aceita qualquer formato: com DDD, com ou sem espaços, com hífen.
          </div>

          {/* Preview divulgação */}
          {mensagemDiv.trim() && (
            <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'14px' }}>
              <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Preview</div>
              <div style={{ background:'#dcf8c6', borderRadius:'12px 12px 2px 12px', padding:'10px 14px', maxWidth:'90%', marginLeft:'auto' }}>
                <div style={{ fontSize:'12px', color:'#1A0F0D', lineHeight:'1.7', whiteSpace:'pre-line' }}>
                  {[
                    '📣 *Flyguer BarberShop*', '',
                    mensagemDiv, '',
                    `📲 Acesse nosso app: ${APP_LINK}`, '',
                    '📍 Shopping Cidade das Artes — Piso 2, Nº 22',
                  ].join('\n')}
                </div>
              </div>
            </div>
          )}

          {/* Progresso */}
          {enviandoDiv && (
            <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'16px', marginBottom:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                <span style={{ fontSize:'13px', color:textMain, fontWeight:'600' }}>📲 Enviando...</span>
                <span style={{ fontSize:'13px', color:'#F44336', fontWeight:'700' }}>{progressoDiv}%</span>
              </div>
              <div style={{ height:'6px', background:dark?'#2E1A14':'#f5efe6', borderRadius:'3px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progressoDiv}%`, background:'linear-gradient(90deg,#8B0000,#F44336)', borderRadius:'3px', transition:'width 0.3s' }} />
              </div>
            </div>
          )}

          {erroDiv && <div style={{ fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center', background:'rgba(244,67,54,0.1)', borderRadius:'8px', padding:'10px' }}>{erroDiv}</div>}

          <button onClick={dispararDivulgacao} disabled={enviandoDiv||!mensagemDiv.trim()||numerosValidos.length===0}
            style={{ width:'100%', padding:'16px', borderRadius:'14px', border:'none', background:enviandoDiv||!mensagemDiv.trim()||numerosValidos.length===0?'#2E1A14':'linear-gradient(135deg,#8B0000,#F44336)', color:enviandoDiv||!mensagemDiv.trim()||numerosValidos.length===0?'#555':'#fff', fontWeight:'800', fontSize:'15px', cursor:enviandoDiv||!mensagemDiv.trim()||numerosValidos.length===0?'not-allowed':'pointer' }}>
            {enviandoDiv ? `⏳ Enviando... ${progressoDiv}%` : numerosValidos.length > 0 ? `📣 Disparar para ${numerosValidos.length} contato${numerosValidos.length!==1?'s':''}` : '📣 Disparar divulgação'}
          </button>
          <div style={{ fontSize:'11px', color:textSub, textAlign:'center', marginTop:'10px' }}>
            ⚠️ Cada mensagem abre o WhatsApp individualmente. Link do app incluído automaticamente.
          </div>
        </div>
      )}

      {/* ═══ ABA HISTÓRICO ═══ */}
      {aba === 'historico' && (
        <div style={{ padding:'16px' }}>
          {loadingHist && <div style={{ textAlign:'center', padding:'40px', color:textSub }}>⏳ Carregando...</div>}
          {!loadingHist && historico.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>📋</div>
              <div>Nenhum comunicado enviado ainda.</div>
            </div>
          )}
          {historico.map(h => (
            <div key={h.id} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', marginBottom:'10px', overflow:'hidden' }}>
              <div style={{ height:'3px', background:h.tipo==='divulgacao'?'linear-gradient(90deg,#8B0000,#F44336)':'linear-gradient(90deg,#2E7D7A,#3A9E9A)' }} />
              <div style={{ padding:'14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'18px' }}>{h.modeloEmoji}</span>
                    <div>
                      <span style={{ fontWeight:'700', fontSize:'13px', color:textMain }}>{h.modeloLabel}</span>
                      <span style={{ fontSize:'10px', color:h.tipo==='divulgacao'?'#F44336':'#2E7D7A', marginLeft:'6px', background:h.tipo==='divulgacao'?'rgba(244,67,54,0.1)':'rgba(46,125,122,0.1)', borderRadius:'4px', padding:'2px 6px' }}>
                        {h.tipo==='divulgacao'?'Divulgação':'Equipe'}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize:'11px', color:textSub }}>{formatarTs(h.enviadoEm)}</span>
                </div>
                <div style={{ fontSize:'12px', color:textMain, lineHeight:'1.5', marginBottom:'10px', background:dark?'#1A0F0D':'#f9f5f0', borderRadius:'8px', padding:'8px 10px' }}>
                  {h.mensagem}
                </div>
                <div style={{ fontSize:'11px', color:'#4CAF50', fontWeight:'600' }}>
                  ✅ {h.totalEnviados} enviado{h.totalEnviados!==1?'s':''}
                  {h.tipo==='equipe' && (h.destinatarios||[]).map(d => (
                    <span key={d.id} style={{ fontSize:'10px', color:textSub, background:dark?'#2E1A14':'#f5efe6', borderRadius:'6px', padding:'2px 6px', marginLeft:'4px' }}>{d.nome}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
