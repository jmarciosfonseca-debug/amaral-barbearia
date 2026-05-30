// AvaliacaoServico.jsx — Flyguer BarberShop
// ✅ Passo 14 — Avaliação pós-atendimento: estrelas + comentário

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

function EstrelasInterativas({ nota, onChange }) {
  const [hover, setHover] = React.useState(0);
  return (
    <div style={{ display:'flex', gap:'8px', justifyContent:'center', margin:'16px 0' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          style={{ fontSize:'40px', cursor:'pointer', color: i <= (hover||nota) ? '#E8C96A' : '#3A2018', transition:'color 0.15s, transform 0.1s', transform: i <= (hover||nota) ? 'scale(1.1)' : 'scale(1)', display:'inline-block' }}>
          ★
        </span>
      ))}
    </div>
  );
}

const LABELS = { 1:'Ruim 😞', 2:'Regular 😐', 3:'Bom 🙂', 4:'Ótimo 😄', 5:'Incrível! 🤩' };

export default function AvaliacaoServico({ agendamento, cliente, onConcluir, onPular, dark }) {
  const s = getStyles(dark);
  const [nota, setNota]           = React.useState(0);
  const [comentario, setComentario] = React.useState('');
  const [salvando, setSalvando]   = React.useState(false);
  const [concluido, setConcluido] = React.useState(false);
  const [erro, setErro]           = React.useState('');

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  async function salvar() {
    if (nota === 0) { setErro('Selecione uma nota antes de enviar.'); return; }
    setSalvando(true); setErro('');
    try {
      const { collection, addDoc, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const chave = cliente.cpf || cliente.uid;

      await addDoc(collection(db, 'avaliacoes'), {
        clienteId:     chave,
        clienteNome:   cliente.nome,
        agendamentoId: agendamento.firestoreId || agendamento.id,
        barbeiroId:    agendamento.barbeiroId,
        barbeiroNome:  agendamento.barbeiroNome,
        servico:       agendamento.servico,
        data:          agendamento.data,
        nota,
        comentario:    comentario.trim(),
        criadoEm:      serverTimestamp(),
      });

      // Marcar agendamento como avaliado
      if (agendamento.firestoreId || agendamento.id) {
        await updateDoc(doc(db, 'agendamentos', agendamento.firestoreId || agendamento.id), {
          avaliado: true, nota, criadoEm: serverTimestamp(),
        });
      }

      setConcluido(true);
      setTimeout(() => onConcluir && onConcluir(), 2500);
    } catch(e) { setErro('Erro ao enviar avaliação. Tente novamente.'); console.error(e); }
    setSalvando(false);
  }

  if (concluido) {
    return (
      <div style={{ ...s.app, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:'40px 20px', textAlign:'center' }}>
        <div>
          <div style={{ fontSize:'80px', marginBottom:'16px' }}>🎉</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'24px', color:'#E8C96A', marginBottom:'8px' }}>Obrigado!</div>
          <div style={{ fontSize:'14px', color:textSub }}>Sua avaliação foi enviada com sucesso.</div>
          <div style={{ marginTop:'12px' }}>{'★'.repeat(nota)}<span style={{ color:'#3A2018' }}>{'★'.repeat(5-nota)}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...s.app, padding:'40px 20px', paddingBottom:'80px' }}>

      {/* Cabeçalho */}
      <div style={{ textAlign:'center', marginBottom:'24px' }}>
        <div style={{ fontSize:'48px', marginBottom:'12px' }}>✂️</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'22px', color:'#E8C96A', marginBottom:'6px' }}>Como foi seu atendimento?</div>
        <div style={{ fontSize:'13px', color:textSub }}>
          {agendamento.barbeiroNome} · {agendamento.servico}
        </div>
      </div>

      {/* Estrelas */}
      <EstrelasInterativas nota={nota} onChange={setNota} />

      {/* Label da nota */}
      {nota > 0 && (
        <div style={{ textAlign:'center', fontSize:'16px', fontWeight:'700', color:'#E8C96A', marginBottom:'20px', height:'24px' }}>
          {LABELS[nota]}
        </div>
      )}

      {/* Comentário */}
      <div style={{ marginBottom:'20px' }}>
        <label style={{ fontSize:'12px', color:textSub, fontWeight:'600', display:'block', marginBottom:'8px' }}>
          Comentário <span style={{ fontWeight:'400' }}>(opcional)</span>
        </label>
        <textarea
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          placeholder="Conte como foi sua experiência..."
          maxLength={300}
          rows={4}
          style={{ width:'100%', background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'12px', padding:'12px', color:textMain, fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif", resize:'none' }}
        />
        <div style={{ fontSize:'10px', color:textSub, textAlign:'right', marginTop:'4px' }}>{comentario.length}/300</div>
      </div>

      {/* Sugestões rápidas */}
      <div style={{ marginBottom:'20px' }}>
        <div style={{ fontSize:'12px', color:textSub, marginBottom:'8px' }}>Sugestões rápidas:</div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {['Ótimo atendimento!','Barbeiro muito habilidoso','Ambiente agradável','Pontual e eficiente','Recomendo!'].map(s => (
            <button key={s} onClick={() => setComentario(prev => prev ? `${prev} ${s}` : s)}
              style={{ background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'20px', padding:'6px 12px', fontSize:'11px', color:textMain, cursor:'pointer' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <div style={{ background:'rgba(244,67,54,0.1)', border:'1px solid #F44336', borderRadius:'10px', padding:'10px', fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center' }}>{erro}</div>
      )}

      {/* Botões */}
      <button onClick={salvar} disabled={salvando||nota===0}
        style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background: nota===0?'#2E1A14':'linear-gradient(135deg,#5C2218,#8B3A2A)', color: nota===0?'#555':'#F5EFE6', fontWeight:'700', fontSize:'14px', cursor:nota===0?'not-allowed':'pointer', marginBottom:'10px', fontFamily:"'DM Sans',sans-serif" }}>
        {salvando ? '⏳ Enviando...' : '⭐ Enviar avaliação'}
      </button>

      <button onClick={onPular}
        style={{ width:'100%', padding:'12px', borderRadius:'14px', border:`1px solid ${border}`, background:'transparent', color:textSub, fontSize:'13px', cursor:'pointer' }}>
        Pular por agora
      </button>
    </div>
  );
}
