// Agendamento.jsx — Flyguer BarberShop
// 🔧 Fix: sem alert() nativo — telas bonitas dentro do app
// 🔧 Fix: após resgatar → vai direto barbeiro → horário (sem serviço/valor)
// 🔧 Fix: marca utilizado=true ao agendar via promo
// ✅ Fase 2: lembrete24hEnviado + lembrete2hEnviado no Firestore
// ✅ Fase 2: "Primeiro horário disponível" no agendamento

import React from 'react';
import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { getStyles, DIAS_SEMANA } from './getStyles';
import { notificarBarbeariaNovoAgendamento } from './notificacoes';

function gerarPixPayload({ chave, nome, cidade, valor, descricao }) {
  function campo(id, v) { return `${id}${String(v.length).padStart(2,'0')}${v}`; }
  function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1, crc &= 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4,'0');
  }
  const mai  = campo('00','BR.GOV.BCB.PIX') + campo('01', chave);
  const vStr = valor > 0 ? Number(valor).toFixed(2) : '';
  const nomeFmt = (nome||'FLYGUER').substring(0,25).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const cidFmt  = (cidade||'SAO PAULO').substring(0,15).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const descFmt = (descricao||'').substring(0,25).replace(/[^a-zA-Z0-9 ]/g,'');
  let p = campo('00','01') + campo('26',mai) + campo('52','0000') + campo('53','986') +
    (vStr ? campo('54',vStr) : '') + campo('58','BR') + campo('59',nomeFmt) + campo('60',cidFmt) +
    (descFmt ? campo('62',campo('05',descFmt)) : '') + '6304';
  return p + crc16(p);
}

function hoje() { return new Date().toISOString().split('T')[0]; }
function formatarData(dataStr) { const [a,m,d] = dataStr.split('-'); return `${d}/${m}/${a}`; }
function diaSemana(dataStr) { return DIAS_SEMANA[new Date(dataStr+'T12:00:00').getDay()]; }

function gerarHorarios(abertura, fechamento, almoco, duracaoMin, agendados) {
  const horarios = [];
  const [hA,mA] = abertura.split(':').map(Number);
  const [hF,mF] = fechamento.split(':').map(Number);
  let atual = hA*60+mA, fim = hF*60+mF;
  while (atual+duracaoMin <= fim) {
    const hora = `${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`;
    let bloqueado = false;
    if (almoco?.ativo) {
      const [hAl,mAl] = almoco.inicio.split(':').map(Number);
      const [hFl,mFl] = almoco.fim.split(':').map(Number);
      if (atual >= hAl*60+mAl && atual < hFl*60+mFl) bloqueado = true;
    }
    horarios.push({ hora, disponivel: !bloqueado && !agendados.includes(hora), bloqueado });
    atual += 30;
  }
  return horarios;
}

function StepIndicator({ step, total }) {
  return (
    <div style={{ display:'flex', gap:'6px', justifyContent:'center', padding:'12px 0' }}>
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{ height:'4px', flex:1, borderRadius:'2px', background: i<step?'#8B3A2A':i===step?'#E8C96A':'#3A2018', transition:'background 0.3s' }} />
      ))}
    </div>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background:'#231410', borderRadius:'16px', padding:'16px', border:'1px solid #3A2018', marginBottom:'10px', cursor:onClick?'pointer':'default', ...style }}>
      {children}
    </div>
  );
}

function BotaoVoltar({ onClick }) {
  return <button onClick={onClick} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'14px', cursor:'pointer', padding:'0' }}>← Voltar</button>;
}

// ─────────────────────────────────────────────────────────────
// 🔧 TELA RESGATAR PROMO
// ─────────────────────────────────────────────────────────────
function TelaResgatarPromo({ cliente, promo, onResgatado, onPular, dark }) {
  const s = getStyles(dark);
  const [resgatando, setResgatando] = React.useState(false);
  const [erro, setErro]             = React.useState('');
  const [jaResgatou, setJaResgatou] = React.useState(false);
  const vagasRestantes = (promo.vagas || 0) - (promo.resgatados || 0);
  const encerrada = promo.ehRelampago && vagasRestantes <= 0;

  React.useEffect(() => {
    import('firebase/firestore').then(({ doc: fDoc, getDoc: gDoc }) => {
      gDoc(fDoc(db, 'resgates_promo', `${cliente.cpf}_ativa`)).then(snap => {
        if (snap.exists()) setJaResgatou(true);
      }).catch(() => {});
    });
  }, [cliente.cpf]);

  async function resgatar() {
    setResgatando(true); setErro('');
    try {
      const { doc: fDoc, setDoc, updateDoc: upDoc, getDoc: gDoc } = await import('firebase/firestore');
      const snapR = await gDoc(fDoc(db, 'resgates_promo', `${cliente.cpf}_ativa`));
      if (snapR.exists()) { setJaResgatou(true); setResgatando(false); return; }
      const snapPromo = await gDoc(fDoc(db, 'config', 'promocao_ativa'));
      const dadosPromo = snapPromo.data();
      if (dadosPromo.ehRelampago && (dadosPromo.resgatados || 0) >= dadosPromo.vagas) {
        setErro('encerrada'); setResgatando(false); return;
      }
      await setDoc(fDoc(db, 'resgates_promo', `${cliente.cpf}_ativa`), {
        clienteCpf:     cliente.cpf,
        clienteNome:    cliente.nome,
        clienteTel:     cliente.telefone || '',
        promoTitulo:    promo.titulo,
        promoDescricao: promo.descricao || '',
        resgatadoEm:    serverTimestamp(),
        expiracao:      promo.expiracao || null,
        utilizado:      false,
        utilizadoEm:    null,
      });
      const novosResgatados = (dadosPromo.resgatados || 0) + 1;
      await upDoc(fDoc(db, 'config', 'promocao_ativa'), { resgatados: novosResgatados });
      if (dadosPromo.ehRelampago && novosResgatados >= dadosPromo.vagas) {
        await upDoc(fDoc(db, 'config', 'promocao_ativa'), { ativo: false });
      }
      const msg = encodeURIComponent(
        `🔥 PROMOÇÃO RESGATADA!\n\n👤 ${cliente.nome}\n📞 ${cliente.telefone||'—'}\n🎁 ${promo.titulo}${promo.descricao?'\n✅ '+promo.descricao:''}\n\n_Resgatado pelo app_`
      );
      setTimeout(() => window.open(`https://wa.me/5511977643509?text=${msg}`, '_blank'), 800);
      onResgatado({ ...promo, _resgatado: true });
    } catch(e) {
      setErro('Erro ao resgatar. Tente novamente.');
      console.error(e);
    }
    setResgatando(false);
  }

  if (jaResgatou) {
    return (
      <div style={{ ...s.app, padding:'32px 20px', textAlign:'center' }}>
        <button onClick={onPular} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'14px', cursor:'pointer', marginBottom:'24px', display:'block' }}>← Voltar</button>
        <div style={{ fontSize:'56px', marginBottom:'16px' }}>✅</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'22px', color:'#E8C96A', marginBottom:'8px' }}>Você já resgatou!</div>
        <div style={{ fontSize:'14px', color:'#9A8880', marginBottom:'24px' }}>Esta promoção está na sua ficha</div>
        <div style={{ background:'linear-gradient(135deg,#8B0000,#F44336)', borderRadius:'16px', padding:'18px', marginBottom:'24px', textAlign:'left' }}>
          <div style={{ fontWeight:'700', fontSize:'16px', color:'#fff', marginBottom:'4px' }}>{promo.titulo}</div>
          {promo.descricao && <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)' }}>🎁 {promo.descricao}</div>}
        </div>
        <div style={{ background:'rgba(232,201,106,0.1)', border:'1px solid rgba(232,201,106,0.3)', borderRadius:'12px', padding:'12px 14px', marginBottom:'24px', fontSize:'13px', color:'#E8C96A' }}>
          📋 Vá até <b>Meu Perfil</b> e clique em "Agendar com esta promoção" para escolher barbeiro e horário!
        </div>
        <button onClick={() => onResgatado({ ...promo, _jaResgatou: true })}
          style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:'pointer', marginBottom:'10px' }}>
          📅 Agendar agora →
        </button>
        <button onClick={onPular} style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid #3A2018', background:'transparent', color:'#9A8880', fontSize:'13px', cursor:'pointer' }}>
          Ir para home
        </button>
      </div>
    );
  }

  if (encerrada || erro === 'encerrada') {
    return (
      <div style={{ ...s.app, padding:'32px 20px', textAlign:'center' }}>
        <div style={{ fontSize:'56px', marginBottom:'16px' }}>🔒</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'22px', color:'#9A8880', marginBottom:'8px' }}>Promoção encerrada</div>
        <div style={{ fontSize:'14px', color:'#555', marginBottom:'24px' }}>Todas as vagas foram preenchidas.<br/>Parabéns a quem pegou! 🎉</div>
        <button onClick={onPular} style={{ padding:'12px 32px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
          Fazer agendamento normal
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...s.app, padding:'24px 20px' }}>
      <button onClick={onPular} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'14px', cursor:'pointer', marginBottom:'24px' }}>← Voltar</button>
      <div style={{ background:'linear-gradient(135deg,#8B0000,#F44336)', borderRadius:'20px', padding:'24px', marginBottom:'24px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-20px', right:'-20px', fontSize:'80px', opacity:0.15 }}>🔥</div>
        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'8px' }}>📣 PROMOÇÃO ESPECIAL</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'22px', color:'#fff', fontWeight:'900', marginBottom:'6px' }}>{promo.titulo}</div>
        <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.85)', lineHeight:'1.5', marginBottom:'16px' }}>{promo.mensagem}</div>
        {promo.descricao && (
          <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:'10px', padding:'10px 14px', marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', marginBottom:'4px' }}>Você vai ganhar:</div>
            <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff' }}>🎁 {promo.descricao}</div>
          </div>
        )}
        {promo.ehRelampago && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:'8px', padding:'6px 12px', fontSize:'13px', fontWeight:'700', color:'#fff' }}>
              ⚡ {vagasRestantes} vaga{vagasRestantes!==1?'s':''} restante{vagasRestantes!==1?'s':''}
            </div>
            {promo.expiracao && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)' }}>até {new Date(promo.expiracao).toLocaleDateString('pt-BR')}</div>}
          </div>
        )}
      </div>
      <div style={{ background:'#231410', borderRadius:'14px', padding:'14px', border:'1px solid #3A2018', marginBottom:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'700', color:'#F5EFE6' }}>
            {cliente.nome[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:'700', fontSize:'15px', color:'#F5EFE6' }}>{cliente.nome}</div>
            <div style={{ fontSize:'12px', color:'#9A8880' }}>Resgatando com esta conta</div>
          </div>
        </div>
      </div>
      <div style={{ background:'rgba(232,201,106,0.08)', border:'1px solid rgba(232,201,106,0.2)', borderRadius:'12px', padding:'12px 14px', marginBottom:'20px', fontSize:'12px', color:'#E8C96A', lineHeight:'1.6' }}>
        📋 Ao confirmar, a promoção fica na sua ficha. Depois escolha barbeiro e horário!
      </div>
      {erro && erro !== 'encerrada' && (
        <div style={{ background:'rgba(244,67,54,0.1)', border:'1px solid #F44336', borderRadius:'10px', padding:'10px 12px', marginBottom:'16px', fontSize:'13px', color:'#F44336', textAlign:'center' }}>
          ⚠️ {erro}
        </div>
      )}
      <button onClick={resgatar} disabled={resgatando}
        style={{ width:'100%', padding:'16px', borderRadius:'14px', border:'none', background:resgatando?'#2E1A14':'linear-gradient(135deg,#8B0000,#F44336)', color:resgatando?'#555':'#fff', fontSize:'16px', fontWeight:'800', cursor:resgatando?'wait':'pointer', marginBottom:'12px' }}>
        {resgatando ? '⏳ Registrando...' : '🔥 Confirmar e Pegar Promoção!'}
      </button>
      <button onClick={onPular} style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid #3A2018', background:'transparent', color:'#9A8880', fontSize:'13px', cursor:'pointer' }}>
        Pular e agendar normalmente
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 🔧 AGENDAMENTO VIA PROMO
// ─────────────────────────────────────────────────────────────
function AgendarViaPromo({ cliente, promo, onConcluir, onBack, dark }) {
  const s = getStyles(dark);
  const [barbeiros, setBarbeiros] = React.useState([]);
  const [barbeiro, setBarbeiro]   = React.useState(null);
  const [config, setConfig]       = React.useState(null);
  const [horarios, setHorarios]   = React.useState([]);
  const [dataSel, setDataSel]     = React.useState(null);
  const [horaSel, setHoraSel]     = React.useState(null);
  const [carregando, setCarr]     = React.useState(false);
  const [salvando, setSalv]       = React.useState(false);
  const [erro, setErro]           = React.useState('');

  const DIAS_KEYS  = ['dom','seg','ter','qua','qui','sex','sab'];

  const diasDisponiveis = React.useMemo(() => {
    const dias = [];
    const exp = promo.expiracao ? new Date(promo.expiracao) : null;
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      if (promo.validade === 'hoje' && i > 0) break;
      if (exp && d > exp) break;
      dias.push(d.toISOString().split('T')[0]);
    }
    return dias;
  }, [promo]);

  React.useEffect(() => {
    getDocs(query(collection(db,'barbeiros'), where('ativo','==',true)))
      .then(snap => setBarbeiros(snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.papel!=='recepcao')));
    getDoc(doc(db,'config','barbearia')).then(snap => { if(snap.exists()) setConfig(snap.data()); });
  }, []);

  React.useEffect(() => {
    if (!barbeiro || !dataSel || !config) return;
    setCarr(true); setHoraSel(null);
    getDocs(query(collection(db,'agendamentos'), where('data','==',dataSel))).then(snap => {
      const ocupadas = snap.docs.map(d=>d.data()).filter(a=>a.barbeiroId===barbeiro.id&&['confirmado','pendente'].includes(a.status)).map(a=>a.hora);
      const diaSem   = DIAS_KEYS[new Date(dataSel+'T12:00:00').getDay()];
      const hc       = config.horarios?.[diaSem];
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
      setHorarios(slots);
      setCarr(false);
    });
  }, [barbeiro, dataSel, config]);

  async function confirmar() {
    if (!barbeiro || !dataSel || !horaSel) { setErro('Selecione barbeiro, data e horário'); return; }
    setSalv(true);
    try {
      const ag = {
        clienteCpf:          cliente.cpf,
        clienteNome:         cliente.nome,
        clienteTel:          cliente.telefone || '',
        barbeiroId:          barbeiro.id,
        barbeiroNome:        barbeiro.nome,
        servico:             promo.descricao || promo.titulo,
        valor:               0,
        duracao:             30,
        data:                dataSel,
        hora:                horaSel,
        pagamento:           'local',
        sinal:               0,
        status:              'confirmado',
        agendadoPor:         'cliente',
        promoResgatada:      promo.titulo,
        promoDescricao:      promo.descricao || '',
        // ✅ Fase 2: campos lembrete
        lembrete24hEnviado:  false,
        lembrete2hEnviado:   false,
        criadoEm:            serverTimestamp(),
      };
      await addDoc(collection(db,'agendamentos'), ag);
      await updateDoc(doc(db,'resgates_promo',`${cliente.cpf}_ativa`), {
        utilizado:   true,
        utilizadoEm: serverTimestamp(),
      });
      const msg = encodeURIComponent(
        `✂️ AGENDAMENTO VIA PROMOÇÃO\n\n` +
        `👤 ${cliente.nome}\n📞 ${cliente.telefone||'—'}\n` +
        `🔥 Promo: ${promo.titulo}\n✂️ Barbeiro: ${barbeiro.nome}\n` +
        `📅 ${formatarData(dataSel)} às ${horaSel}\n` +
        (promo.descricao ? `🎁 ${promo.descricao}` : '')
      );
      setTimeout(() => window.open(`https://wa.me/5511977643509?text=${msg}`, '_blank'), 500);
      onConcluir(ag);
    } catch(e) { setErro('Erro ao agendar: ' + e.message); console.error(e); }
    setSalv(false);
  }

  return (
    <div style={{ ...s.app, padding:'20px', paddingBottom:'110px' }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#E8C96A', fontSize:'14px', cursor:'pointer', marginBottom:'16px' }}>← Voltar</button>
      <div style={{ background:'linear-gradient(135deg,#8B0000,#F44336)', borderRadius:'14px', padding:'14px', marginBottom:'20px' }}>
        <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', fontWeight:'700', marginBottom:'4px' }}>🔥 AGENDANDO COM PROMOÇÃO</div>
        <div style={{ fontWeight:'700', fontSize:'16px', color:'#fff', marginBottom:'2px' }}>{promo.titulo}</div>
        {promo.descricao && <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)' }}>🎁 {promo.descricao}</div>}
      </div>
      <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>1. Escolha o barbeiro</div>
      {barbeiros.map(b => (
        <div key={b.id} onClick={() => { setBarbeiro(b); setDataSel(null); setHoraSel(null); }}
          style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px', background:barbeiro?.id===b.id?'#2E1A14':'#231410', borderRadius:'14px', border:barbeiro?.id===b.id?'1.5px solid #8B3A2A':'1px solid #3A2018', marginBottom:'8px', cursor:'pointer' }}>
          <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'700', color:'#F5EFE6', border:b.disponivel?'2px solid #4CAF50':'2px solid #FFC107', overflow:'hidden', flexShrink:0 }}>
            {b.foto ? <img src={b.foto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : b.nome[0]}
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
          <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', marginBottom:'10px', marginTop:'16px', textTransform:'uppercase', letterSpacing:'1px' }}>2. Escolha a data</div>
          <div style={{ overflowX:'auto', display:'flex', gap:'8px', paddingBottom:'8px', marginBottom:'16px' }}>
            {diasDisponiveis.map(data => {
              const sel = dataSel===data;
              const d   = new Date(data+'T12:00:00');
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
          <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>3. Escolha o horário</div>
          {carregando ? <div style={{ textAlign:'center', color:'#9A8880', padding:'20px' }}>Carregando...</div> :
            horarios.length===0 ? (
              <div style={{ textAlign:'center', color:'#9A8880', padding:'12px', background:'#231410', borderRadius:'10px', marginBottom:'16px' }}>Fechado neste dia</div>
            ) : (
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
            )
          }
        </>
      )}
      {erro && <div style={{ fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center' }}>⚠️ {erro}</div>}
      {barbeiro && dataSel && horaSel && (
        <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'430px', background:'#1A0F0D', borderTop:'1px solid #3A2018', padding:'12px 16px 28px', zIndex:100 }}>
          <div style={{ fontSize:'12px', color:'#9A8880', textAlign:'center', marginBottom:'8px' }}>
            {barbeiro.nome} · {formatarData(dataSel)} às {horaSel}
          </div>
          <button onClick={confirmar} disabled={salvando}
            style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:salvando?'#2E1A14':'linear-gradient(135deg,#8B0000,#F44336)', color:salvando?'#555':'#fff', fontSize:'15px', fontWeight:'700', cursor:salvando?'wait':'pointer' }}>
            {salvando ? '⏳ Confirmando...' : '🔥 Confirmar com Promoção!'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ✅ Fase 2: PRIMEIRO HORÁRIO DISPONÍVEL
// ─────────────────────────────────────────────────────────────
async function buscarPrimeiroHorario(barbeiroId, config) {
  const DIAS_KEYS = ['dom','seg','ter','qua','qui','sex','sab'];
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const dataStr = d.toISOString().split('T')[0];
    const diaSem  = DIAS_KEYS[d.getDay()];
    const hc      = config.horarios?.[diaSem];
    if (!hc?.aberto) continue;
    const snap = await getDocs(query(collection(db,'agendamentos'), where('data','==',dataStr)));
    const ocupadas = snap.docs.map(x=>x.data()).filter(a=>a.barbeiroId===barbeiroId&&['confirmado','pendente'].includes(a.status)).map(a=>a.hora);
    const [hA,mA] = hc.abertura.split(':').map(Number);
    const [hF,mF] = hc.fechamento.split(':').map(Number);
    let atual = hA*60+mA, fim = hF*60+mF;
    // Se for hoje, pula horários já passados
    if (i === 0) {
      const agora = new Date();
      const agoraMin = agora.getHours()*60 + agora.getMinutes();
      if (atual < agoraMin + 30) atual = Math.ceil((agoraMin + 30) / 30) * 30;
    }
    while (atual + 30 <= fim) {
      const hora = `${String(Math.floor(atual/60)).padStart(2,'0')}:${String(atual%60).padStart(2,'0')}`;
      if (!ocupadas.includes(hora)) return { data: dataStr, hora };
      atual += 30;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// PASSOS NORMAIS: Barbeiro / Serviço / Data / Pagamento
// ─────────────────────────────────────────────────────────────
function EscolherBarbeiro({ onEscolher, onBack, dark, promoAtiva }) {
  const s = getStyles(dark);
  const [barbeiros, setBarbeiros]   = React.useState([]);
  const [carregando, setCarregando] = React.useState(true);
  const [config, setConfig]         = React.useState(null);
  // ✅ Fase 2: primeiro horário disponível
  const [buscandoPrimeiro, setBuscando] = React.useState(false);
  const [erroPrimeiro, setErroPrimeiro] = React.useState('');

  React.useEffect(() => {
    getDocs(query(collection(db,'barbeiros'), where('ativo','==',true)))
      .then(snap => setBarbeiros(snap.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.papel!=='recepcao')))
      .catch(console.error)
      .finally(() => setCarregando(false));
    getDoc(doc(db,'config','barbearia')).then(snap => { if(snap.exists()) setConfig(snap.data()); });
  }, []);

  // ✅ Fase 2: ao clicar no botão, busca o primeiro slot disponível entre todos os barbeiros
  async function handlePrimeiroDisponivel() {
    if (!config) return;
    setBuscando(true); setErroPrimeiro('');
    try {
      for (const b of barbeiros) {
        const resultado = await buscarPrimeiroHorario(b.id, config);
        if (resultado) {
          // Retorna o barbeiro + data + hora já preenchidos para pular etapas
          onEscolher(b, resultado);
          return;
        }
      }
      setErroPrimeiro('Nenhum horário disponível nos próximos 14 dias.');
    } catch(e) { setErroPrimeiro('Erro ao buscar horário.'); }
    setBuscando(false);
  }

  return (
    <div style={{ ...s.app, padding:'20px', paddingBottom:'40px' }}>
      <BotaoVoltar onClick={onBack} />
      <StepIndicator step={0} total={4} />
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#F5EFE6', marginBottom:'6px', marginTop:'8px' }}>Escolha o barbeiro</div>
      <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'16px' }}>Selecione com quem deseja se barbear</div>

      {/* ✅ Fase 2: botão primeiro horário disponível */}
      <button onClick={handlePrimeiroDisponivel} disabled={buscandoPrimeiro || !config}
        style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:buscandoPrimeiro?'#2E1A14':'linear-gradient(135deg,#2E7D7A,#3A9E9A)', color:buscandoPrimeiro?'#555':'#fff', fontWeight:'700', fontSize:'14px', cursor:buscandoPrimeiro?'wait':'pointer', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
        {buscandoPrimeiro ? '⏳ Buscando...' : '⚡ Quero o primeiro horário disponível'}
      </button>
      {erroPrimeiro && <div style={{ fontSize:'12px', color:'#F44336', textAlign:'center', marginBottom:'12px' }}>⚠️ {erroPrimeiro}</div>}

      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
        <div style={{ flex:1, height:'1px', background:'#3A2018' }} />
        <span style={{ fontSize:'11px', color:'#555' }}>ou escolha abaixo</span>
        <div style={{ flex:1, height:'1px', background:'#3A2018' }} />
      </div>

      {promoAtiva && (
        <div style={{ background:'linear-gradient(135deg,#8B0000,#F44336)', borderRadius:'12px', padding:'12px 14px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'22px' }}>🔥</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:'700', fontSize:'13px', color:'#fff' }}>{promoAtiva.titulo}</div>
            {promoAtiva.descricao && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.8)' }}>🎁 {promoAtiva.descricao}</div>}
          </div>
          {promoAtiva.ehRelampago && (
            <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:'8px', padding:'4px 8px', fontSize:'11px', fontWeight:'700', color:'#fff', whiteSpace:'nowrap' }}>
              ⚡ {promoAtiva.vagas - (promoAtiva.resgatados||0)} vagas
            </div>
          )}
        </div>
      )}
      {carregando ? <div style={{ textAlign:'center', color:'#9A8880', padding:'40px' }}>Carregando...</div> : (
        barbeiros.map(b => (
          <Card key={b.id} onClick={() => onEscolher(b)}>
            <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
              <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'700', color:'#F5EFE6', border:b.disponivel?'2px solid #4CAF50':'2px solid #FFC107', overflow:'hidden', flexShrink:0 }}>
                {b.foto ? <img src={b.foto} alt={b.nome} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : b.nome.charAt(0)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:'700', fontSize:'16px', color:'#F5EFE6' }}>{b.nome}</div>
                <div style={{ fontSize:'12px', color:'#9A8880' }}>{b.cargo}</div>
              </div>
              <div style={{ fontSize:'11px', padding:'4px 10px', borderRadius:'20px', fontWeight:'600', background:b.disponivel?'rgba(76,175,80,0.15)':'rgba(255,193,7,0.15)', color:b.disponivel?'#4CAF50':'#FFC107' }}>
                {b.disponivel ? '● Disponível' : '● Ocupado'}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function EscolherServico({ barbeiro, onEscolher, onBack, dark }) {
  const s = getStyles(dark);
  const [servicos, setServicos]         = React.useState({ avulsos:[], combos:[] });
  const [selecionados, setSelecionados] = React.useState([]);
  const [carregando, setCarregando]     = React.useState(true);

  React.useEffect(() => {
    getDoc(doc(db,'config','servicos')).then(snap => { if(snap.exists()) setServicos(snap.data()); }).catch(console.error).finally(()=>setCarregando(false));
  }, []);

  const todosServicos = [...(servicos.avulsos?.filter(s=>s.ativo)||[]), ...(servicos.combos?.filter(s=>s.ativo)||[])];
  function toggleServico(sv) { setSelecionados(prev => prev.find(s=>s.id===sv.id) ? prev.filter(s=>s.id!==sv.id) : [...prev,sv]); }
  const totalValor   = selecionados.reduce((a,s)=>a+s.valor,0);
  const totalDuracao = selecionados.reduce((a,s)=>a+s.duracao,0);
  const nomeServicos = selecionados.map(s=>s.nome).join(' + ');

  return (
    <div style={{ ...s.app, padding:'20px', paddingBottom:'100px' }}>
      <BotaoVoltar onClick={onBack} />
      <StepIndicator step={1} total={4} />
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#F5EFE6', marginBottom:'6px', marginTop:'8px' }}>Escolha o serviço</div>
      <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'20px' }}>Barbeiro: <strong style={{ color:'#E8C96A' }}>{barbeiro.nome}</strong></div>
      {carregando ? <div style={{ textAlign:'center', color:'#9A8880', padding:'40px' }}>Carregando...</div> : (
        todosServicos.map(sv => {
          const sel = !!selecionados.find(s=>s.id===sv.id);
          return (
            <Card key={sv.id} onClick={() => toggleServico(sv)} style={{ border:sel?'1.5px solid #8B3A2A':'1px solid #3A2018', background:sel?'#2E1A14':'#231410' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:'600', fontSize:'15px', color:'#F5EFE6' }}>{sv.nome}</div>
                  <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>⏱ {sv.duracao} min</div>
                </div>
                <div style={{ textAlign:'right', display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ fontSize:'16px', fontWeight:'700', color:sel?'#E8C96A':'#F5EFE6' }}>R$ {sv.valor.toFixed(2).replace('.',',')}</div>
                  <div style={{ width:'22px', height:'22px', borderRadius:'6px', border:`2px solid ${sel?'#8B3A2A':'#3A2018'}`, background:sel?'#8B3A2A':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', color:'#F5EFE6', flexShrink:0 }}>{sel?'✓':''}</div>
                </div>
              </div>
            </Card>
          );
        })
      )}
      {selecionados.length > 0 && (
        <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'430px', background:'#1A0F0D', borderTop:'1px solid #3A2018', padding:'12px 16px 28px', zIndex:100 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
            <span style={{ fontSize:'12px', color:'#9A8880' }}>{selecionados.length} serviço(s) · {totalDuracao} min</span>
            <span style={{ fontSize:'14px', fontWeight:'700', color:'#E8C96A' }}>R$ {totalValor.toFixed(2).replace('.',',')}</span>
          </div>
          <button onClick={() => onEscolher({ servicos:selecionados, valor:totalValor, duracao:totalDuracao, nome:nomeServicos })}
            style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:'pointer' }}>
            Continuar ({selecionados.length}) →
          </button>
        </div>
      )}
    </div>
  );
}

function EscolherDataHora({ barbeiro, servico, onEscolher, onBack, dark, dataHoraPreSelecionada }) {
  const s = getStyles(dark);
  const DIAS_KEYS = ['dom','seg','ter','qua','qui','sex','sab'];
  const diasDisponiveis = React.useMemo(() => {
    const dias = [];
    for (let i=0;i<14;i++) { const d=new Date(); d.setDate(d.getDate()+i); dias.push(d.toISOString().split('T')[0]); }
    return dias;
  }, []);
  // ✅ Fase 2: pré-seleciona data/hora se vier do "primeiro disponível"
  const [dataSel, setDataSel]   = React.useState(dataHoraPreSelecionada?.data || null);
  const [horaSel, setHoraSel]   = React.useState(dataHoraPreSelecionada?.hora || null);
  const [horarios, setHorarios] = React.useState([]);
  const [config, setConfig]     = React.useState(null);
  const [carregando, setCarregando] = React.useState(false);

  React.useEffect(() => {
    getDoc(doc(db,'config','barbearia')).then(snap => { if(snap.exists()) setConfig(snap.data()); }).catch(console.error);
  }, []);

  React.useEffect(() => {
    if (!dataSel||!config) return;
    setCarregando(true);
    if (!dataHoraPreSelecionada) setHoraSel(null);
    getDocs(query(collection(db,'agendamentos'), where('data','==',dataSel))).then(snap => {
      const horasOcupadas = snap.docs.map(d=>d.data()).filter(a=>a.barbeiroId===barbeiro.id&&['confirmado','pendente'].includes(a.status)).map(a=>a.hora);
      const diaSem = DIAS_KEYS[new Date(dataSel+'T12:00:00').getDay()];
      const horConfig = config.horarios?.[diaSem];
      setHorarios(!horConfig?.aberto ? [] : gerarHorarios(horConfig.abertura, horConfig.fechamento, config.almoco, servico.duracao, horasOcupadas));
    }).catch(console.error).finally(() => setCarregando(false));
  }, [dataSel, config, barbeiro.id, servico.duracao]);

  function isDiaAberto(dataStr) {
    if (!config) return true;
    const diaSem = DIAS_KEYS[new Date(dataStr+'T12:00:00').getDay()];
    return config.horarios?.[diaSem]?.aberto ?? true;
  }

  return (
    <div style={{ ...s.app, padding:'20px', paddingBottom:'100px' }}>
      <BotaoVoltar onClick={onBack} />
      <StepIndicator step={2} total={4} />
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#F5EFE6', marginBottom:'4px', marginTop:'8px' }}>Escolha data e horário</div>
      <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'20px' }}>{barbeiro.nome} · {servico.nome} · {servico.duracao} min</div>
      {/* ✅ Fase 2: banner quando veio do primeiro disponível */}
      {dataHoraPreSelecionada && (
        <div style={{ background:'rgba(46,125,122,0.1)', border:'1px solid rgba(46,125,122,0.3)', borderRadius:'12px', padding:'10px 14px', marginBottom:'16px', fontSize:'12px', color:'#2E7D7A' }}>
          ⚡ Primeiro horário disponível pré-selecionado — confirme ou troque abaixo.
        </div>
      )}
      <div style={{ overflowX:'auto', display:'flex', gap:'8px', paddingBottom:'8px', marginBottom:'20px' }}>
        {diasDisponiveis.map(data => {
          const aberto = isDiaAberto(data), sel = dataSel===data;
          const d = new Date(data+'T12:00:00');
          return (
            <div key={data} onClick={() => aberto&&setDataSel(data)} style={{ minWidth:'56px', padding:'10px 8px', borderRadius:'12px', textAlign:'center', cursor:aberto?'pointer':'not-allowed', background:sel?'#8B3A2A':aberto?'#231410':'#1A0F0D', border:sel?'1.5px solid #E8C96A':'1px solid #3A2018', opacity:aberto?1:0.4 }}>
              <div style={{ fontSize:'10px', color:sel?'#E8C96A':'#9A8880', fontWeight:'600' }}>{DIAS_SEMANA[d.getDay()]}</div>
              <div style={{ fontSize:'18px', fontWeight:'700', color:'#F5EFE6', marginTop:'2px' }}>{d.getDate()}</div>
              <div style={{ fontSize:'10px', color:sel?'#E8C96A':'#9A8880' }}>{String(d.getMonth()+1).padStart(2,'0')}</div>
            </div>
          );
        })}
      </div>
      {dataSel && (
        <>
          <div style={{ fontSize:'13px', color:'#E8C96A', fontWeight:'600', marginBottom:'12px' }}>Horários disponíveis — {formatarData(dataSel)}</div>
          {carregando ? <div style={{ textAlign:'center', color:'#9A8880', padding:'20px' }}>Carregando...</div>
            : horarios.length===0 ? <Card><div style={{ textAlign:'center', color:'#9A8880', padding:'12px' }}>Fechado neste dia</div></Card>
            : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                {horarios.map(h => {
                  const sel = horaSel===h.hora;
                  return (
                    <div key={h.hora} onClick={() => h.disponivel&&setHoraSel(h.hora)} style={{ padding:'10px 4px', borderRadius:'10px', textAlign:'center', cursor:h.disponivel?'pointer':'not-allowed', background:sel?'#8B3A2A':h.disponivel?'#231410':'#1A0F0D', border:sel?'1.5px solid #E8C96A':'1px solid #3A2018', opacity:h.disponivel?1:0.4, fontSize:'13px', fontWeight:'600', color:sel?'#F5EFE6':h.disponivel?'#F5EFE6':'#555' }}>
                      {h.hora}
                      {!h.disponivel&&!h.bloqueado&&<div style={{ fontSize:'8px', color:'#F44336', marginTop:'2px' }}>Ocupado</div>}
                      {h.bloqueado&&<div style={{ fontSize:'8px', color:'#9A8880', marginTop:'2px' }}>Almoço</div>}
                    </div>
                  );
                })}
              </div>
            )}
        </>
      )}
      {dataSel&&horaSel&&(
        <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'430px', background:'#1A0F0D', borderTop:'1px solid #3A2018', padding:'12px 16px 28px', zIndex:100 }}>
          <div style={{ fontSize:'12px', color:'#9A8880', textAlign:'center', marginBottom:'8px' }}>{formatarData(dataSel)} às {horaSel} com {barbeiro.nome}</div>
          <button onClick={() => onEscolher({data:dataSel, hora:horaSel})} style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:'pointer' }}>
            Confirmar horário →
          </button>
        </div>
      )}
    </div>
  );
}

function Pagamento({ cliente, barbeiro, servico, dataHora, promoAtiva, onConfirmar, onBack, dark }) {
  const s = getStyles(dark);
  const [pagPref, setPagPref]   = React.useState('local');
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro]         = React.useState('');
  const [pixConfig, setPixConfig] = React.useState({ chave:'', nome:'Alisson Ferreira da Silva', banco:'Nubank', cidade:'Sao Paulo' });
  const [pixCopiado, setPixCopiado] = React.useState(false);
  const [travado, setTravado]   = React.useState(false);
  const [verificando, setVerificando] = React.useState(true);
  const [promoResgate, setPromoResgate] = React.useState(null);

  React.useEffect(() => {
    async function verificar() {
      try {
        const snapConfig = await getDoc(doc(db,'config','barbearia'));
        if (snapConfig.exists()) {
          const d = snapConfig.data();
          setPixConfig({ chave:d.pix||'11939089988', nome:d.pixNome||'Alisson Ferreira da Silva', banco:d.pixBanco||'Nubank', cidade:d.pixCidade||'Sao Paulo' });
        }
        if (dataHora.data === hoje()) {
          const snap = await getDocs(query(collection(db,'agendamentos'), where('clienteCpf','==',cliente.cpf), where('data','==',hoje()), where('status','==','cancelado_cliente')));
          if (!snap.empty) setTravado(true);
        }
        if (promoAtiva) {
          try {
            const snapR = await getDoc(doc(db,'resgates_promo',`${cliente.cpf}_ativa`));
            if (snapR.exists() && !snapR.data().utilizado) setPromoResgate(snapR.data());
          } catch(e) {}
        }
      } catch(e) { console.error(e); }
      finally { setVerificando(false); }
    }
    verificar();
  }, [cliente.cpf, dataHora.data]);

  const valorTotal = servico.valor || 0;
  const valorSinal = (valorTotal * 0.5).toFixed(2).replace('.',',');
  const valorPix   = travado ? valorTotal * 0.5 : valorTotal;
  const pixPayload = pixConfig.chave ? gerarPixPayload({ chave:pixConfig.chave, nome:pixConfig.nome, cidade:pixConfig.cidade, valor:valorPix, descricao:`Flyguer ${barbeiro.nome}` }) : '';

  function abrirWhatsApp() {
    const tel = '5511939089988';
    const msg = encodeURIComponent(`Olá! Sou ${cliente.nome}, tenho agendamento dia ${formatarData(dataHora.data)} às ${dataHora.hora} com ${barbeiro.nome}.\nServiço: ${servico.nome}\nValor: R$ ${valorTotal.toFixed(2).replace('.',',')}\n\nSegue comprovante do Pix 👇`);
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
  }

  async function handleConfirmar() {
    if (travado && pagPref==='local') { setErro('Você deve pagar o sinal via Pix para confirmar.'); return; }
    setSalvando(true); setErro('');
    try {
      const agendamento = {
        clienteCpf:          cliente.cpf,
        clienteNome:         cliente.nome,
        clienteTel:          cliente.telefone,
        barbeiroId:          barbeiro.id,
        barbeiroNome:        barbeiro.nome,
        servico:             servico.nome,
        servicoIds:          (servico.servicos||[]).map(s=>s.id).filter(Boolean),
        valor:               valorTotal,
        duracao:             servico.duracao,
        data:                dataHora.data,
        hora:                dataHora.hora,
        pagamento:           travado?'pix_sinal':pagPref,
        sinal:               travado?valorTotal*0.5:0,
        status:              'confirmado',
        agendadoPor:         'cliente',
        travaCancelamento:   travado,
        promoResgatada:      promoResgate ? promoResgate.promoTitulo : null,
        // ✅ Fase 2: campos lembrete
        lembrete24hEnviado:  false,
        lembrete2hEnviado:   false,
        criadoEm:            serverTimestamp(),
      };
      await addDoc(collection(db,'agendamentos'), agendamento);
      notificarBarbeariaNovoAgendamento(agendamento);
      onConfirmar(agendamento);
    } catch(e) { setErro('Erro ao confirmar. Tente novamente.'); console.error(e); }
    finally { setSalvando(false); }
  }

  if (verificando) return <div style={{ ...s.app, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}><div style={{ textAlign:'center', color:'#9A8880' }}>Verificando...</div></div>;

  const mostrandoPix = pagPref==='pix'||travado;

  return (
    <div style={{ ...s.app, padding:'20px', paddingBottom:'120px' }}>
      <BotaoVoltar onClick={onBack} />
      <StepIndicator step={3} total={4} />
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#F5EFE6', marginBottom:'4px', marginTop:'8px' }}>Confirmar agendamento</div>
      <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'20px' }}>Revise e escolha a forma de pagamento</div>
      {promoResgate && (
        <div style={{ background:'linear-gradient(135deg,rgba(139,0,0,0.3),rgba(244,67,54,0.2))', border:'1px solid rgba(244,67,54,0.4)', borderRadius:'12px', padding:'12px 14px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'24px' }}>🔥</span>
          <div>
            <div style={{ fontWeight:'700', fontSize:'13px', color:'#F44336' }}>Promoção ativa na sua ficha!</div>
            <div style={{ fontSize:'12px', color:'#F5EFE6', marginTop:'2px' }}>{promoResgate.promoDescricao || promoResgate.promoTitulo}</div>
            <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>Apresente na recepção ao chegar</div>
          </div>
        </div>
      )}
      <Card style={{ borderColor:'#8B3A2A' }}>
        <div style={{ fontSize:'12px', color:'#9A8880', marginBottom:'12px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'1px' }}>Resumo</div>
        {[
          { label:'Barbeiro', value:barbeiro.nome },
          { label:'Serviço',  value:servico.nome  },
          { label:'Data',     value:`${diaSemana(dataHora.data)}, ${formatarData(dataHora.data)}` },
          { label:'Horário',  value:dataHora.hora },
          { label:'Duração',  value:`${servico.duracao} min` },
          { label:'Valor',    value:`R$ ${valorTotal.toFixed(2).replace('.',',')}` },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
            <span style={{ fontSize:'13px', color:'#9A8880' }}>{item.label}</span>
            <span style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>{item.value}</span>
          </div>
        ))}
      </Card>
      {travado && (
        <div style={{ background:'rgba(244,67,54,0.1)', border:'1.5px solid rgba(244,67,54,0.4)', borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
          <div style={{ fontSize:'13px', fontWeight:'700', color:'#F44336', marginBottom:'8px' }}>🔒 Política de Agendamento Mesmo Dia</div>
          <div style={{ fontSize:'12px', color:'#F5EFE6', lineHeight:'1.6' }}>Cancelamento detectado hoje. Exige <strong>sinal de 50% via Pix</strong>.</div>
          <div style={{ marginTop:'10px', padding:'10px', background:'rgba(0,0,0,0.3)', borderRadius:'10px' }}>
            <div style={{ fontSize:'12px', color:'#9A8880' }}>Sinal obrigatório:</div>
            <div style={{ fontSize:'22px', fontWeight:'700', color:'#F44336' }}>R$ {valorSinal}</div>
          </div>
        </div>
      )}
      <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'600', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'1px' }}>Forma de pagamento</div>
      <Card onClick={() => !travado&&setPagPref('local')} style={{ border:pagPref==='local'&&!travado?'1.5px solid #8B3A2A':'1px solid #3A2018', opacity:travado?0.4:1, cursor:travado?'not-allowed':'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ fontSize:'24px' }}>💵</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:'600', fontSize:'14px', color:travado?'#555':'#F5EFE6' }}>Pagar no Local {travado&&'🔒'}</div>
            <div style={{ fontSize:'11px', color:'#9A8880' }}>{travado?'Bloqueado — cancelamento hoje':'No dia do atendimento'}</div>
          </div>
          {!travado&&<div style={{ width:'20px', height:'20px', borderRadius:'50%', border:`2px solid ${pagPref==='local'?'#8B3A2A':'#3A2018'}`, background:pagPref==='local'?'#8B3A2A':'transparent' }} />}
        </div>
      </Card>
      <Card onClick={() => setPagPref('pix')} style={{ border:mostrandoPix?'1.5px solid #2E7D7A':'1px solid #3A2018' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ fontSize:'24px' }}>💜</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:'600', fontSize:'14px', color:'#F5EFE6' }}>{travado?`Pix Sinal — R$ ${valorSinal}`:'Pagar via Pix'}</div>
            <div style={{ fontSize:'11px', color:'#9A8880' }}>{pixConfig.banco} · {travado?'Obrigatório':'Antecipado · garante sua vaga'}</div>
          </div>
          <div style={{ width:'20px', height:'20px', borderRadius:'50%', border:`2px solid ${mostrandoPix?'#2E7D7A':'#3A2018'}`, background:mostrandoPix?'#2E7D7A':'transparent' }} />
        </div>
        {mostrandoPix && pixConfig.chave && (
          <div style={{ marginTop:'14px' }}>
            <div style={{ background:'rgba(46,125,122,0.1)', borderRadius:'12px', padding:'12px', textAlign:'center', marginBottom:'12px', border:'1px solid rgba(46,125,122,0.3)' }}>
              <div style={{ fontSize:'11px', color:'#9A8880', marginBottom:'4px' }}>Valor a transferir</div>
              <div style={{ fontSize:'28px', fontWeight:'900', color:'#2E7D7A' }}>R$ {valorPix.toFixed(2).replace('.',',')}</div>
              <div style={{ fontSize:'11px', color:'#9A8880', marginTop:'2px' }}>{pixConfig.nome} · {pixConfig.banco}</div>
            </div>
            <div style={{ background:'#1A0F0D', borderRadius:'10px', padding:'12px', marginBottom:'12px' }}>
              <div style={{ fontSize:'10px', color:'#9A8880', marginBottom:'4px' }}>Chave Pix ({pixConfig.banco})</div>
              <div style={{ fontSize:'15px', fontWeight:'700', color:'#2E7D7A', letterSpacing:'1px', marginBottom:'8px', wordBreak:'break-all' }}>{pixConfig.chave}</div>
              <button onClick={() => { navigator.clipboard?.writeText(pixPayload||pixConfig.chave); setPixCopiado(true); setTimeout(()=>setPixCopiado(false),3000); }}
                style={{ padding:'10px 14px', borderRadius:'8px', border:'1px solid #2E7D7A', background:pixCopiado?'#2E7D7A':'transparent', color:pixCopiado?'#fff':'#2E7D7A', fontSize:'13px', cursor:'pointer', fontWeight:'700', width:'100%' }}>
                {pixCopiado ? '✅ Copiado!' : '📋 Copiar código Pix'}
              </button>
            </div>
            <button onClick={abrirWhatsApp} style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              <span style={{ fontSize:'18px' }}>📲</span>Enviar comprovante pelo WhatsApp
            </button>
          </div>
        )}
      </Card>
      {!travado && <div style={{ background:'rgba(46,125,122,0.08)', border:'1px solid rgba(46,125,122,0.2)', borderRadius:'10px', padding:'10px 14px', marginBottom:'12px', fontSize:'11px', color:'#2E7D7A' }}>ℹ️ O Pix antecipado é sempre opcional.</div>}
      {erro && <div style={{ fontSize:'12px', color:'#F44336', marginBottom:'12px', textAlign:'center' }}>⚠️ {erro}</div>}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'430px', background:'#1A0F0D', borderTop:'1px solid #3A2018', padding:'12px 16px 28px', zIndex:100 }}>
        <button onClick={handleConfirmar} disabled={salvando}
          style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:travado?'linear-gradient(135deg,#2E7D7A,#3A9E9A)':'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:salvando?'wait':'pointer' }}>
          {salvando ? '⏳ Confirmando...' : travado ? `✅ Confirmar e Pagar Sinal R$ ${valorSinal}` : '✅ Confirmar Agendamento'}
        </button>
      </div>
    </div>
  );
}

function Confirmado({ agendamento, onVoltar, dark }) {
  const s = getStyles(dark);

  function abrirCalendario() {
    const dataInicio = `${agendamento.data.replace(/-/g,'')}T${agendamento.hora.replace(':','')}00`;
    const durMin = agendamento.duracao || 30;
    const fim = new Date(`${agendamento.data}T${agendamento.hora}:00`);
    fim.setMinutes(fim.getMinutes() + durMin);
    const dataFim = fim.toISOString().replace(/[-:]/g,'').split('.')[0];
    const texto = encodeURIComponent(`Flyguer BarberShop — ${agendamento.servico} com ${agendamento.barbeiroNome}`);
    const local = encodeURIComponent('Shopping Cidade das Artes — Piso 2, Nº 22');
    window.open(`https://calendar.google.com/calendar/r/eventedit?text=${texto}&dates=${dataInicio}/${dataFim}&location=${local}&details=Agendado+pelo+app+Flyguer+BarberShop`, '_blank');
  }

  return (
    <div style={{ ...s.app, padding:'32px 20px 60px', textAlign:'center' }}>
      <div style={{ fontSize:'64px', marginBottom:'16px' }}>🎉</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'24px', color:'#E8C96A', marginBottom:'8px' }}>Agendado!</div>
      <div style={{ fontSize:'14px', color:'#9A8880', marginBottom:'24px' }}>Seu horário está confirmado</div>
      <div style={{ background:'#231410', borderRadius:'16px', padding:'20px', border:'1.5px solid #8B3A2A', marginBottom:'16px', textAlign:'left' }}>
        {[
          { icon:'✂️', label:'Barbeiro', value:agendamento.barbeiroNome },
          { icon:'💈', label:'Serviço',  value:agendamento.servico      },
          { icon:'📅', label:'Data',     value:`${diaSemana(agendamento.data)}, ${formatarData(agendamento.data)}` },
          { icon:'🕐', label:'Horário',  value:agendamento.hora         },
          { icon:'⏱',  label:'Duração',  value:`${agendamento.duracao||30} min` },
          { icon:'💰', label:'Valor',    value:`R$ ${(agendamento.valor||0).toFixed(2).replace('.',',')}` },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', gap:'10px', marginBottom:'8px', alignItems:'center' }}>
            <span style={{ fontSize:'16px' }}>{item.icon}</span>
            <span style={{ fontSize:'13px', color:'#9A8880', width:'70px' }}>{item.label}</span>
            <span style={{ fontSize:'13px', color:'#F5EFE6', fontWeight:'600' }}>{item.value}</span>
          </div>
        ))}
        {agendamento.promoResgatada && (
          <div style={{ marginTop:'10px', padding:'10px', background:'rgba(244,67,54,0.1)', borderRadius:'10px', display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontSize:'16px' }}>🔥</span>
            <span style={{ fontSize:'12px', color:'#F44336', fontWeight:'600' }}>Promo: {agendamento.promoResgatada}</span>
          </div>
        )}
      </div>
      <div style={{ background:'rgba(46,125,122,0.1)', border:'1px solid rgba(46,125,122,0.3)', borderRadius:'14px', padding:'14px', marginBottom:'16px', textAlign:'left' }}>
        <div style={{ fontSize:'12px', fontWeight:'700', color:'#2E7D7A', marginBottom:'6px' }}>📲 Lembretes automáticos</div>
        <div style={{ fontSize:'12px', color:'#9A8880', lineHeight:'1.6' }}>
          Você receberá um lembrete pelo <strong style={{ color:'#F5EFE6' }}>WhatsApp 2 horas antes</strong> do atendimento.<br/>
          Confirme sua presença pelo botão que será enviado.
        </div>
      </div>
      <button onClick={abrirCalendario}
        style={{ width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid rgba(66,133,244,0.4)', background:'rgba(66,133,244,0.08)', color:'#4285F4', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginBottom:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
        📅 Adicionar ao Google Calendar
      </button>
      <button onClick={onVoltar} style={{ width:'100%', padding:'14px', borderRadius:'14px', border:'none', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', color:'#F5EFE6', fontSize:'15px', fontWeight:'700', cursor:'pointer' }}>
        Voltar ao início
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function Agendamento({ cliente, onBack, dark, promoParaResgatar }) {
  const [etapa, setEtapa]             = React.useState(promoParaResgatar ? 'resgatar_promo' : 'barbeiro');
  const [barbeiro, setBarbeiro]       = React.useState(null);
  const [servico, setServico]         = React.useState(null);
  const [dataHora, setDataHora]       = React.useState(null);
  const [agendamento, setAgendamento] = React.useState(null);
  const [promoAtiva, setPromoAtiva]   = React.useState(promoParaResgatar || null);
  const [promoAgendando, setPromoAgendando] = React.useState(null);
  // ✅ Fase 2: guarda o resultado do "primeiro disponível" para pré-selecionar na tela de data/hora
  const [dataHoraPreSelecionada, setDataHoraPreSelecionada] = React.useState(null);

  React.useEffect(() => {
    if (promoParaResgatar || promoAtiva) return;
    import('firebase/firestore').then(({ doc: fDoc, getDoc }) => {
      getDoc(fDoc(db, 'config', 'promocao_ativa')).then(snap => {
        if (snap.exists()) { const p = snap.data(); if (p.ativo) setPromoAtiva(p); }
      }).catch(()=>{});
    }).catch(()=>{});
  }, []);

  if (etapa==='resgatar_promo' && promoAtiva) {
    return <TelaResgatarPromo cliente={cliente} promo={promoAtiva} dark={dark}
      onResgatado={(promo) => { setPromoAgendando(promo); setEtapa('agendar_promo'); }}
      onPular={() => setEtapa('barbeiro')} />;
  }

  if (etapa==='agendar_promo' && promoAgendando) {
    return <AgendarViaPromo cliente={cliente} promo={promoAgendando} dark={dark}
      onConcluir={(ag) => { setAgendamento(ag); setEtapa('confirmado'); }}
      onBack={() => setEtapa('resgatar_promo')} />;
  }

  if (etapa==='confirmado'&&agendamento) return <Confirmado agendamento={agendamento} onVoltar={onBack} dark={dark} />;
  if (etapa==='pagamento') return <Pagamento cliente={cliente} barbeiro={barbeiro} servico={servico} dataHora={dataHora} promoAtiva={promoAtiva} onConfirmar={ag=>{setAgendamento(ag);setEtapa('confirmado');}} onBack={()=>setEtapa('dataHora')} dark={dark} />;
  if (etapa==='dataHora') return <EscolherDataHora barbeiro={barbeiro} servico={servico} onEscolher={dh=>{setDataHora(dh);setEtapa('pagamento');}} onBack={()=>setEtapa('servico')} dark={dark} dataHoraPreSelecionada={dataHoraPreSelecionada} />;
  if (etapa==='servico') return <EscolherServico barbeiro={barbeiro} onEscolher={sv=>{setServico(sv);setEtapa('dataHora');}} onBack={()=>setEtapa('barbeiro')} dark={dark} />;

  return <EscolherBarbeiro
    onEscolher={(b, preSelecionado) => {
      setBarbeiro(b);
      if (preSelecionado) {
        // ✅ Fase 2: veio do "primeiro disponível" — pula serviço? Não, serviço ainda é necessário
        // Guarda o pré-selecionado e vai para serviço normalmente
        setDataHoraPreSelecionada(preSelecionado);
        setEtapa('servico');
      } else {
        setDataHoraPreSelecionada(null);
        setEtapa('servico');
      }
    }}
    onBack={onBack}
    dark={dark}
    promoAtiva={promoAtiva}
  />;
}
