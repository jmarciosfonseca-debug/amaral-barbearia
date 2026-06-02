// MensagemWhatsAppBusiness.jsx — Flyguer BarberShop
// ✅ Gera mensagem de saudação automática para WhatsApp Business

import React from 'react';
import { getStyles } from './getStyles';

const APP_LINK = 'https://flyguer-barbershop.vercel.app';

const MENSAGENS = [
  {
    id: 'saudacao',
    label: '👋 Saudação padrão',
    texto: `Olá! 👋 Bem-vindo à *Flyguer BarberShop*! ✂️

Para escolher seu barbeiro e garantir seu horário em tempo real — sem esperar na fila — acesse nosso app:

👉 ${APP_LINK}

📍 Shopping Cidade das Artes — Piso 2, Nº 22

Qualquer dúvida, é só chamar! 😊`,
  },
  {
    id: 'fora_horario',
    label: '🌙 Fora do horário',
    texto: `Olá! 👋 No momento estamos fora do horário de atendimento.

Para agendar seu horário a qualquer hora, acesse nosso app:

👉 ${APP_LINK}

Você escolhe o barbeiro, o serviço e o horário — tudo online! ✂️

📍 Shopping Cidade das Artes — Piso 2, Nº 22`,
  },
  {
    id: 'agendamento',
    label: '📅 Direcionar para app',
    texto: `Olá! 👋 Para agendar com a gente, acesse nosso app:

👉 ${APP_LINK}

Você vê os horários disponíveis em tempo real, escolhe seu barbeiro favorito e confirma em segundos! ✂️

📍 Shopping Cidade das Artes — Piso 2, Nº 22`,
  },
];

export default function MensagemWhatsAppBusiness({ onBack, dark }) {
  const s = getStyles(dark);
  const [modelo, setModelo]   = React.useState(MENSAGENS[0]);
  const [copiado, setCopiado] = React.useState(false);

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  function copiar() {
    navigator.clipboard?.writeText(modelo.texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  function abrirWhatsAppBusiness() {
    // Abre WhatsApp Web para o número da barbearia
    const msg = encodeURIComponent(modelo.texto);
    window.open(`https://wa.me/5511977643509?text=${msg}`, '_blank');
  }

  return (
    <div style={{ ...s.app, paddingBottom:'60px' }}>
      <div style={{ background:'linear-gradient(135deg,#25D366,#128C7E)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#fff', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#fff', fontWeight:'700' }}>📲 WhatsApp Business</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.75)' }}>Mensagens automáticas de captação</div>
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        {/* Instrução */}
        <div style={{ background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.25)', borderRadius:'14px', padding:'14px', marginBottom:'20px' }}>
          <div style={{ fontSize:'13px', color:'#25D366', fontWeight:'700', marginBottom:'6px' }}>💡 Como usar</div>
          <div style={{ fontSize:'12px', color:textSub, lineHeight:'1.7' }}>
            1. Escolha o modelo abaixo{'\n'}
            2. Copie o texto{'\n'}
            3. No WhatsApp Business → Ferramentas comerciais → Mensagem de saudação → cole o texto{'\n'}
            4. Ative. Todo cliente que mandar mensagem recebe o link do app automaticamente.
          </div>
        </div>

        {/* Modelos */}
        <div style={{ fontSize:'11px', color:'#E8C96A', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px' }}>Escolha o modelo</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
          {MENSAGENS.map(m => (
            <button key={m.id} onClick={() => setModelo(m)}
              style={{ padding:'12px 14px', borderRadius:'12px', border:`1px solid ${modelo.id===m.id?'#25D366':border}`, background:modelo.id===m.id?'rgba(37,211,102,0.1)':cardBg, color:modelo.id===m.id?'#25D366':textSub, fontSize:'13px', fontWeight:modelo.id===m.id?'700':'400', cursor:'pointer', textAlign:'left' }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Preview da mensagem</div>
        <div style={{ background:'#dcf8c6', borderRadius:'14px', padding:'16px', marginBottom:'16px' }}>
          <div style={{ fontSize:'13px', color:'#1A0F0D', lineHeight:'1.8', whiteSpace:'pre-line' }}>
            {modelo.texto}
          </div>
        </div>

        {/* Link do app */}
        <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'12px', padding:'12px 14px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'20px' }}>🔗</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'11px', color:textSub, marginBottom:'2px' }}>Link do app incluído automaticamente</div>
            <div style={{ fontSize:'13px', color:'#25D366', fontWeight:'700' }}>{APP_LINK}</div>
          </div>
        </div>

        {/* Botões */}
        <button onClick={copiar}
          style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:copiado?'linear-gradient(135deg,#2E7D7A,#3A9E9A)':'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', fontWeight:'800', fontSize:'15px', cursor:'pointer', marginBottom:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          {copiado ? '✅ Copiado!' : '📋 Copiar mensagem'}
        </button>

        <div style={{ fontSize:'11px', color:textSub, textAlign:'center', marginBottom:'20px' }}>
          Cole no WhatsApp Business → Ferramentas comerciais → Mensagem de saudação
        </div>

        {/* Divisor */}
        <div style={{ height:'1px', background:border, marginBottom:'16px' }} />

        <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Ou teste enviando agora</div>
        <button onClick={abrirWhatsAppBusiness}
          style={{ width:'100%', padding:'13px', borderRadius:'14px', border:`1px solid rgba(37,211,102,0.4)`, background:'rgba(37,211,102,0.06)', color:'#25D366', fontWeight:'700', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          📲 Testar no WhatsApp da barbearia
        </button>
      </div>
    </div>
  );
}
