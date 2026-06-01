// ComunicadoGerente.jsx — Flyguer BarberShop
// ✅ Fase 3: Gerente envia reunião/comunicado para barbeiros via WhatsApp

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

function hoje() { return new Date().toISOString().split('T')[0]; }

const MODELOS = [
  { id:'reuniao',    emoji:'📢', label:'Reunião',          texto:'Pessoal, teremos uma reunião hoje. Favor comparecer pontualmente.' },
  { id:'aviso',      emoji:'⚠️', label:'Aviso importante', texto:'Aviso importante para a equipe. Por favor, leiam com atenção.' },
  { id:'horario',    emoji:'🕐', label:'Mudança de horário',texto:'Informamos mudança no horário de funcionamento de hoje.' },
  { id:'parabenss',  emoji:'🎉', label:'Parabéns',          texto:'Quero parabenizar a equipe pelo excelente trabalho! Orgulho de todos vocês.' },
  { id:'folga',      emoji:'🏖️', label:'Folga / Feriado',  texto:'Lembrando que amanhã não haverá expediente. Bom descanso a todos!' },
  { id:'custom',     emoji:'✏️', label:'Personalizado',     texto:'' },
];

export default function ComunicadoGerente({ onBack, dark }) {
  const s = getStyles(dark);
  const [barbeiros, setBarbeiros]   = React.useState([]);
  const [selecionados, setSelecionados] = React.useState([]);
  const [modelo, setModelo]         = React.useState(MODELOS[0]);
  const [mensagem, setMensagem]     = React.useState(MODELOS[0].texto);
  const [horario, setHorario]       = React.useState('');
  const [local, setLocal]           = React.useState('Flyguer BarberShop — Piso 2, Nº 22');
  const [enviando, setEnviando]     = React.useState(false);
  const [enviados, setEnviados]     = React.useState([]);
  const [concluido, setConcluido]   = React.useState(false);

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';
  const inp     = { width:'100%', background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'10px', padding:'10px 12px', color:textMain, fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" };

  React.useEffect(() => {
    import('firebase/firestore').then(({ collection, getDocs }) => {
      getDocs(collection(db, 'barbeiros')).then(snap => {
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => b.ativo && b.whatsapp);
        setBarbeiros(lista);
        setSelecionados(lista.map(b => b.id)); // seleciona todos por padrão
      });
    });
  }, []);

  function selecionarModelo(m) {
    setModelo(m);
    if (m.id !== 'custom') setMensagem(m.texto);
    else setMensagem('');
  }

  function toggleBarbeiro(id) {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function disparar() {
    if (!mensagem.trim() || selecionados.length === 0) return;
    setEnviando(true); setConcluido(false); setEnviados([]);

    const alvos = barbeiros.filter(b => selecionados.includes(b.id));

    for (let i = 0; i < alvos.length; i++) {
      const b = alvos[i];
      const tel = b.whatsapp?.replace(/\D/g, '');
      if (!tel) continue;

      const linhas = [
        `📢 *COMUNICADO DA BARBEARIA*`,
        ``,
        `Olá, ${b.nome}! 👋`,
        ``,
        mensagem,
      ];
      if (horario) linhas.push(``, `🕐 *Horário:* ${horario}`);
      if (local) linhas.push(`📍 *Local:* ${local}`);
      linhas.push(``, `_Flyguer BarberShop_`);

      const msg = encodeURIComponent(linhas.join('\n'));
      window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
      setEnviados(prev => [...prev, b.id]);
      await new Promise(r => setTimeout(r, 1500));
    }

    setEnviando(false);
    setConcluido(true);
    setTimeout(() => setConcluido(false), 6000);
  }

  const todosSelected = selecionados.length === barbeiros.length;

  return (
    <div style={{ ...s.app, paddingBottom:'80px' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', padding:'20px 20px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#fff', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#fff', fontWeight:'700' }}>📢 Reunião / Comunicado</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)' }}>Dispara WhatsApp direto para a equipe</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:'10px', padding:'6px 12px', fontSize:'13px', fontWeight:'700', color:'#fff' }}>
          ✂️ {selecionados.length}/{barbeiros.length}
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        {/* Concluído */}
        {concluido && (
          <div style={{ background:'rgba(76,175,80,0.15)', border:'1px solid #4CAF50', borderRadius:'14px', padding:'16px', marginBottom:'16px', textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>✅</div>
            <div style={{ fontWeight:'700', color:'#4CAF50' }}>Comunicado enviado!</div>
            <div style={{ fontSize:'12px', color:textSub, marginTop:'4px' }}>Disparado para {enviados.length} barbeiro{enviados.length!==1?'s':''}</div>
          </div>
        )}

        {/* Modelos */}
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px' }}>Tipo de comunicado</div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'16px' }}>
          {MODELOS.map(m => (
            <button key={m.id} onClick={() => selecionarModelo(m)}
              style={{ padding:'8px 12px', borderRadius:'10px', border:`1px solid ${modelo.id===m.id?'#2E7D7A':border}`, background:modelo.id===m.id?'rgba(46,125,122,0.15)':cardBg, color:modelo.id===m.id?'#2E7D7A':textSub, fontSize:'12px', fontWeight:modelo.id===m.id?'700':'400', cursor:'pointer' }}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        {/* Mensagem */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Mensagem *</div>
        <textarea value={mensagem} onChange={e=>setMensagem(e.target.value)} placeholder="Digite o comunicado para a equipe..." rows={4}
          style={{ ...inp, borderRadius:'12px', padding:'12px', resize:'none', marginBottom:'12px' }} />

        {/* Horário (opcional) */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
          <div>
            <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>Horário <span style={{ color:'#555' }}>(opcional)</span></div>
            <input type="time" value={horario} onChange={e=>setHorario(e.target.value)} style={inp} />
          </div>
          <div>
            <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase' }}>Local <span style={{ color:'#555' }}>(opcional)</span></div>
            <input value={local} onChange={e=>setLocal(e.target.value)} placeholder="Local..." style={inp} />
          </div>
        </div>

        {/* Preview */}
        {mensagem.trim() && (
          <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Preview</div>
            <div style={{ background:'#dcf8c6', borderRadius:'12px 12px 2px 12px', padding:'10px 14px', maxWidth:'90%', marginLeft:'auto' }}>
              <div style={{ fontSize:'12px', color:'#1A0F0D', lineHeight:'1.6', whiteSpace:'pre-line' }}>
                {`📢 *COMUNICADO DA BARBEARIA*\n\nOlá, [Nome]! 👋\n\n${mensagem}${horario?`\n\n🕐 *Horário:* ${horario}`:''}${local?`\n📍 *Local:* ${local}`:''}\n\n_Flyguer BarberShop_`}
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
          const jaEnviou = enviados.includes(b.id);
          return (
            <div key={b.id} onClick={() => !enviando && toggleBarbeiro(b.id)}
              style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:sel?'rgba(46,125,122,0.1)':cardBg, border:`1px solid ${sel?'rgba(46,125,122,0.4)':border}`, borderRadius:'12px', marginBottom:'8px', cursor:'pointer' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>
                {b.nome[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:'700', fontSize:'14px', color:textMain }}>{b.nome}</div>
                <div style={{ fontSize:'11px', color:textSub }}>📞 {b.whatsapp}</div>
              </div>
              {jaEnviou ? (
                <div style={{ fontSize:'12px', color:'#4CAF50', fontWeight:'700' }}>✅ Enviado</div>
              ) : (
                <div style={{ width:'22px', height:'22px', borderRadius:'6px', border:`2px solid ${sel?'#2E7D7A':border}`, background:sel?'#2E7D7A':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', color:'#fff', flexShrink:0 }}>
                  {sel ? '✓' : ''}
                </div>
              )}
            </div>
          );
        })}

        {barbeiros.length === 0 && (
          <div style={{ textAlign:'center', padding:'20px', color:textSub, fontSize:'13px' }}>
            Nenhum barbeiro com WhatsApp cadastrado.
          </div>
        )}

        {/* Botão disparar */}
        <button onClick={disparar} disabled={enviando || !mensagem.trim() || selecionados.length === 0}
          style={{ width:'100%', padding:'16px', borderRadius:'14px', border:'none', background:enviando||!mensagem.trim()||selecionados.length===0?'#2E1A14':'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:enviando||!mensagem.trim()||selecionados.length===0?'#555':'#fff', fontWeight:'800', fontSize:'15px', cursor:enviando||!mensagem.trim()||selecionados.length===0?'not-allowed':'pointer', marginTop:'16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          {enviando ? `⏳ Enviando... (${enviados.length}/${selecionados.length})` : `📲 Disparar para ${selecionados.length} barbeiro${selecionados.length!==1?'s':''}`}
        </button>

        <div style={{ fontSize:'11px', color:textSub, textAlign:'center', marginTop:'10px' }}>
          ⚠️ Cada mensagem abre o WhatsApp individualmente.
        </div>
      </div>
    </div>
  );
}
