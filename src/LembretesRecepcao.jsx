// LembretesRecepcao.jsx — Flyguer BarberShop
// ✅ Passo 14 — Recepção dispara lembretes em lote via WhatsApp

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

function hoje() { return new Date().toISOString().split('T')[0]; }
function moeda(v) { return `R$ ${(v||0).toFixed(2).replace('.',',')}`; }

function horasRestantes(hora) {
  const [h, m] = hora.split(':').map(Number);
  const agora  = new Date();
  const alvo   = new Date();
  alvo.setHours(h, m, 0, 0);
  return (alvo - agora) / 1000 / 60; // minutos
}

export default function LembretesRecepcao({ onFechar, dark }) {
  const s = getStyles(dark);
  const [toastSemTel, setToastSemTel] = React.useState(false);
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [loading, setLoading]           = React.useState(true);
  const [enviados, setEnviados]         = React.useState({});

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  React.useEffect(() => {
    (async () => {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(query(
        collection(db, 'agendamentos'),
        where('data', '==', hoje()),
        where('status', '==', 'confirmado'),
      ));
      const ags = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(a => {
          const min = horasRestantes(a.hora);
          return min > 0 && min <= 180; // próximas 3h
        })
        .sort((a, b) => a.hora.localeCompare(b.hora));
      setAgendamentos(ags);
      setLoading(false);
    })();
  }, []);

  function enviarLembrete(ag) {
    const tel = ag.clienteTel?.replace(/\D/g, '');
    if (!tel) { setToastSemTel(true); setTimeout(()=>setToastSemTel(false),3500); return; }

    const min  = Math.round(horasRestantes(ag.hora));
    const tempo = min >= 60 ? `${Math.floor(min/60)}h${min%60>0?` e ${min%60}min`:''}` : `${min} minutos`;

    const msg = encodeURIComponent(
      `Olá, ${ag.clienteNome?.split(' ')[0]}! 👋\n\n` +
      `Lembramos que você tem um agendamento na *Flyguer BarberShop* em *${tempo}*:\n\n` +
      `✂️ Barbeiro: ${ag.barbeiroNome}\n` +
      `💈 Serviço: ${ag.servico}\n` +
      `🕐 Horário: ${ag.hora}\n` +
      `💰 Valor: ${moeda(ag.valor)}\n\n` +
      `📍 Shopping Cidade das Artes — Piso 2, Nº 22\n\n` +
      `Nos vemos em breve! 💈\n` +
      `_Flyguer BarberShop_ — https://flyguer-barbershop.vercel.app`
    );

    window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
    setEnviados(e => ({ ...e, [ag.id]: true }));
  }

  function enviarTodos() {
    agendamentos.filter(a => !enviados[a.id]).forEach((ag, i) => {
      setTimeout(() => enviarLembrete(ag), i * 1500);
    });
  }

  const pendentes = agendamentos.filter(a => !enviados[a.id]);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:dark?'#1A0F0D':'#fff', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:'430px', maxHeight:'85vh', overflowY:'auto', padding:'24px 20px 40px', border:`1px solid ${border}`, borderBottom:'none' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A', fontWeight:'700' }}>🔔 Lembretes do dia</div>
            <div style={{ fontSize:'11px', color:textSub, marginTop:'2px' }}>Agendamentos nas próximas 3h</div>
          </div>
          <button onClick={onFechar} style={{ background:dark?'#2E1A14':'#f5efe6', border:'none', borderRadius:'50%', width:'32px', height:'32px', color:textMain, fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {loading && <div style={{ textAlign:'center', padding:'40px', color:textSub }}>⏳ Carregando...</div>}

        {!loading && agendamentos.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>✅</div>
            <div style={{ fontWeight:'600', color:textMain, marginBottom:'4px' }}>Nenhum agendamento nas próximas 3h</div>
            <div style={{ fontSize:'12px' }}>Todos os clientes já foram notificados ou não há agendamentos pendentes.</div>
          </div>
        )}

        {!loading && agendamentos.length > 0 && (
          <>
            {/* Botão enviar todos */}
            {pendentes.length > 0 && (
              <button onClick={enviarTodos}
                style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', fontWeight:'700', fontSize:'13px', cursor:'pointer', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontFamily:"'DM Sans',sans-serif" }}>
                <span style={{ fontSize:'18px' }}>📲</span>
                Enviar lembrete para todos ({pendentes.length})
              </button>
            )}

            {/* Lista */}
            {agendamentos.map(ag => {
              const min     = Math.round(horasRestantes(ag.hora));
              const tempo   = min >= 60 ? `em ${Math.floor(min/60)}h${min%60>0?` e ${min%60}min`:''}` : `em ${min} min`;
              const jaEnvio = enviados[ag.id];
              const semTel  = !ag.clienteTel;

              return (
                <div key={ag.id} style={{ background:cardBg, border:`1px solid ${jaEnvio?'#4CAF5044':border}`, borderRadius:'14px', padding:'14px', marginBottom:'10px', opacity:semTel?0.6:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                    <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:'#F5EFE6', flexShrink:0 }}>
                      {(ag.clienteNome||'?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'700', fontSize:'14px', color:textMain }}>{ag.clienteNome?.split(' ').slice(0,2).join(' ')}</div>
                      <div style={{ fontSize:'11px', color:textSub }}>✂️ {ag.barbeiroNome} · {ag.servico}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'16px', fontWeight:'700', color:'#E8C96A' }}>{ag.hora}</div>
                      <div style={{ fontSize:'10px', color:min<=60?'#F44336':'#FFC107', fontWeight:'600' }}>{tempo}</div>
                    </div>
                  </div>

                  {semTel ? (
                    <div style={{ fontSize:'11px', color:'#F44336', textAlign:'center', padding:'6px', background:'rgba(244,67,54,0.1)', borderRadius:'8px' }}>
                      ⚠️ Sem telefone cadastrado
                    </div>
                  ) : jaEnvio ? (
                    <div style={{ fontSize:'12px', color:'#4CAF50', textAlign:'center', padding:'8px', background:'rgba(76,175,80,0.1)', borderRadius:'8px', fontWeight:'600' }}>
                      ✅ Lembrete enviado!
                    </div>
                  ) : (
                    <button onClick={() => enviarLembrete(ag)}
                      style={{ width:'100%', padding:'10px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', fontWeight:'700', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', fontFamily:"'DM Sans',sans-serif" }}>
                      <span>📲</span> Enviar lembrete para {ag.clienteNome?.split(' ')[0]}
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
      {/* Toast sem telefone */}
      {toastSemTel && (
        <div style={{ position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', background:'#F44336', color:'#fff', padding:'12px 24px', borderRadius:'14px', fontSize:'13px', fontWeight:'700', zIndex:9999, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', whiteSpace:'nowrap' }}>
          ⚠️ Cliente sem telefone cadastrado
        </div>
      )}
    </div>
  );
}