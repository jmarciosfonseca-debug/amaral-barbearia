// Promocao.jsx — Flyguer BarberShop
// ✅ Botão vermelho — Gerente dispara comunicados para todos os clientes

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

const MODELOS = [
  { id: 'promo',    emoji: '🔥', label: 'Promoção Relâmpago',  texto: 'Hoje temos promoção especial! Corte + Barba por R$ 35,00 — só até às 18h! Corre! 🔥' },
  { id: 'novidade', emoji: '✨', label: 'Novidade',             texto: 'Temos novidade na Flyguer BarberShop! Venha conferir nossos novos serviços e promoções. Te esperamos!' },
  { id: 'vaga',     emoji: '📅', label: 'Vaga disponível',     texto: 'Surgiu uma vaga hoje! Horário disponível agora — agende pelo app ou nos chame no WhatsApp. 📅' },
  { id: 'feriado',  emoji: '🎉', label: 'Aviso de feriado',    texto: 'Lembrando que no feriado estaremos funcionando em horário especial. Agende com antecedência!' },
  { id: 'custom',   emoji: '✏️', label: 'Mensagem personalizada', texto: '' },
];

export default function Promocao({ onBack, dark }) {
  const s = getStyles(dark);
  const [clientes, setClientes]     = React.useState([]);
  const [loading, setLoading]       = React.useState(true);
  const [modelo, setModelo]         = React.useState(MODELOS[0]);
  const [mensagem, setMensagem]     = React.useState(MODELOS[0].texto);
  const [enviando, setEnviando]     = React.useState(false);
  const [progresso, setProgresso]   = React.useState(0);
  const [concluido, setConcluido]   = React.useState(false);

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  React.useEffect(() => {
    (async () => {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'clientes'));
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.telefone && c.nome);
      setClientes(lista);
      setLoading(false);
    })();
  }, []);

  function selecionarModelo(m) {
    setModelo(m);
    if (m.id !== 'custom') setMensagem(m.texto);
    else setMensagem('');
  }

  async function disparar() {
    if (!mensagem.trim()) return;
    setEnviando(true); setProgresso(0); setConcluido(false);

    const comTelefone = clientes.filter(c => c.telefone);
    
    for (let i = 0; i < comTelefone.length; i++) {
      const c = comTelefone[i];
      const tel = c.telefone.replace(/\D/g, '');
      const msg = encodeURIComponent(
        `Olá, ${c.nome.split(' ')[0]}! 👋\n\n` +
        mensagem + '\n\n' +
        `📍 Shopping Cidade das Artes — Piso 2, Nº 22\n` +
        `📲 Agende pelo app: https://flyguer-barbershop.vercel.app`
      );
      window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
      setProgresso(Math.round(((i + 1) / comTelefone.length) * 100));
      await new Promise(r => setTimeout(r, 1500));
    }

    setEnviando(false);
    setConcluido(true);
    setTimeout(() => setConcluido(false), 5000);
  }

  return (
    <div style={{ ...s.app, paddingBottom: '60px' }}>

      {/* HEADER vermelho */}
      <div style={{ background: 'linear-gradient(135deg,#8B0000,#F44336)', padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: '#fff', fontWeight: '700' }}>🔴 Promoção / Novidade</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Dispara mensagem para todos os clientes</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '10px', padding: '6px 12px', fontSize: '13px', fontWeight: '700', color: '#fff' }}>
          👥 {loading ? '...' : clientes.length}
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Concluído */}
        {concluido && (
          <div style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', borderRadius: '14px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontWeight: '700', color: '#4CAF50' }}>Comunicado enviado!</div>
            <div style={{ fontSize: '12px', color: textSub, marginTop: '4px' }}>Mensagem disparada para {clientes.filter(c=>c.telefone).length} clientes</div>
          </div>
        )}

        {/* Modelos */}
        <div style={{ fontSize: '11px', color: '#E8C96A', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
          Tipo de comunicado
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {MODELOS.map(m => (
            <button key={m.id} onClick={() => selecionarModelo(m)}
              style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${modelo.id === m.id ? '#F44336' : border}`, background: modelo.id === m.id ? 'rgba(244,67,54,0.15)' : cardBg, color: modelo.id === m.id ? '#F44336' : textSub, fontSize: '12px', fontWeight: modelo.id === m.id ? '700' : '400', cursor: 'pointer' }}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        {/* Editor de mensagem */}
        <div style={{ fontSize: '11px', color: textSub, fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
          Mensagem
        </div>
        <textarea
          value={mensagem}
          onChange={e => setMensagem(e.target.value)}
          placeholder="Digite o comunicado para seus clientes..."
          rows={5}
          style={{ width: '100%', background: dark ? '#2E1A14' : '#f5efe6', border: `1px solid ${border}`, borderRadius: '12px', padding: '12px', color: textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif", resize: 'none', marginBottom: '8px' }}
        />
        <div style={{ fontSize: '10px', color: textSub, textAlign: 'right', marginBottom: '16px' }}>
          {mensagem.length} caracteres · {clientes.filter(c=>c.telefone).length} clientes receberão
        </div>

        {/* Preview */}
        {mensagem.trim() && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: textSub, fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Preview da mensagem</div>
            <div style={{ background: '#dcf8c6', borderRadius: '12px 12px 2px 12px', padding: '10px 14px', maxWidth: '85%', marginLeft: 'auto' }}>
              <div style={{ fontSize: '12px', color: '#1A0F0D', lineHeight: '1.6' }}>
                Olá, [Nome]! 👋{'\n\n'}{mensagem}{'\n\n'}
                📍 Shopping Cidade das Artes — Piso 2, Nº 22{'\n'}
                📲 Agende pelo app
              </div>
            </div>
          </div>
        )}

        {/* Progresso */}
        {enviando && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: textMain, fontWeight: '600' }}>📲 Enviando...</span>
              <span style={{ fontSize: '13px', color: '#F44336', fontWeight: '700' }}>{progresso}%</span>
            </div>
            <div style={{ height: '6px', background: dark ? '#2E1A14' : '#f5efe6', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progresso}%`, background: 'linear-gradient(90deg,#8B0000,#F44336)', borderRadius: '3px', transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: '11px', color: textSub, marginTop: '6px' }}>
              Aguarde — cada mensagem abre no WhatsApp automaticamente
            </div>
          </div>
        )}

        {/* Botão disparar */}
        <button
          onClick={disparar}
          disabled={enviando || !mensagem.trim() || clientes.filter(c=>c.telefone).length === 0}
          style={{
            width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
            background: enviando || !mensagem.trim() ? '#2E1A14' : 'linear-gradient(135deg,#8B0000,#F44336)',
            color: enviando || !mensagem.trim() ? '#555' : '#fff',
            fontWeight: '800', fontSize: '15px',
            cursor: enviando || !mensagem.trim() ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans',sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
          {enviando ? `⏳ Enviando... ${progresso}%` : `🔴 Disparar para ${clientes.filter(c=>c.telefone).length} clientes`}
        </button>

        <div style={{ fontSize: '11px', color: textSub, textAlign: 'center', marginTop: '10px' }}>
          ⚠️ Cada mensagem abre o WhatsApp individualmente. Confirme o envio em cada uma.
        </div>
      </div>
    </div>
  );
}
