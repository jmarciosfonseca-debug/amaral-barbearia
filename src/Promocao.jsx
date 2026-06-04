// Promocao.jsx — Flyguer BarberShop
// ✅ v3: Gerente cria promoções com vagas, prazo, tempo real

import React from 'react';
import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, onSnapshot,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { getStyles } from './getStyles';
import { criarPromocao, encerrarPromocao, promoEstaAtiva } from './promocaoEngine';

function formatarData(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('pt-BR');
}

function useContadorRegressivo(expiracaoTimestamp) {
  const [txt, setTxt] = React.useState('');
  React.useEffect(() => {
    if (!expiracaoTimestamp) return;
    function atualizar() {
      const expira = expiracaoTimestamp.toMillis
        ? expiracaoTimestamp.toMillis()
        : new Date(expiracaoTimestamp).getTime();
      const diff = Math.max(0, Math.floor((expira - Date.now()) / 1000));
      if (diff <= 0) { setTxt('EXPIRADA'); return; }
      const h = String(Math.floor(diff/3600)).padStart(2,'0');
      const m = String(Math.floor((diff%3600)/60)).padStart(2,'0');
      const s = String(diff%60).padStart(2,'0');
      setTxt(`${h}:${m}:${s}`);
    }
    atualizar();
    const id = setInterval(atualizar, 1000);
    return () => clearInterval(id);
  }, [expiracaoTimestamp]);
  return txt;
}

// ─── PAINEL GERENTE ───────────────────────────────────────────
export default function Promocao({ onBack, dark }) {
  const s = getStyles(dark);
  const [promoAtual, setPromoAtual] = React.useState(null);
  const [resgates, setResgates]     = React.useState([]);
  const [aba, setAba]               = React.useState('status'); // status | criar
  const [form, setForm]             = React.useState({
    titulo: '', descricao: '', mensagem: '',
    vagas: '10', validade: 'hoje',
    duracaoHoras: '24',
  });
  const [criando, setCriando]       = React.useState(false);
  const [encerrando, setEncerrando] = React.useState(false);
  const [msg, setMsg]               = React.useState('');
  const contador = useContadorRegressivo(promoAtual?.expiracaoTimestamp);

  // Listener tempo real da promoção
  React.useEffect(() => {
    const unsub = onSnapshot(doc(db,'config','promocao_ativa'), snap => {
      setPromoAtual(snap.exists() ? snap.data() : null);
    });
    return unsub;
  }, []);

  // Listener resgates em tempo real
  React.useEffect(() => {
    if (!promoAtual) { setResgates([]); return; }
    const unsub = onSnapshot(collection(db,'resgates_promo'), snap => {
      setResgates(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return unsub;
  }, [promoAtual?.titulo]);

  async function handleCriar() {
    if (!form.titulo.trim()) { setMsg('⚠️ Informe o título'); return; }
    if (!form.vagas || Number(form.vagas) < 1) { setMsg('⚠️ Informe o número de vagas'); return; }
    setCriando(true); setMsg('');
    try {
      await criarPromocao({
        titulo:       form.titulo.trim(),
        descricao:    form.descricao.trim(),
        mensagem:     form.mensagem.trim() || form.titulo.trim(),
        vagas:        Number(form.vagas),
        validade:     form.validade,
        duracaoHoras: Number(form.duracaoHoras),
        ehRelampago:  true,
      });
      setMsg('✅ Promoção criada e ativa!');
      setAba('status');
    } catch(e) {
      setMsg('❌ Erro ao criar: ' + e.message);
    }
    setCriando(false);
  }

  async function handleEncerrar() {
    if (!window.confirm('Encerrar a promoção agora?')) return;
    setEncerrando(true);
    try {
      await encerrarPromocao();
      setMsg('✅ Promoção encerrada');
    } catch(e) { setMsg('❌ Erro: ' + e.message); }
    setEncerrando(false);
  }

  const inp = {
    width:'100%', background:'#2E1A14', border:'1px solid #3A2018',
    borderRadius:'10px', padding:'10px 12px', color:'#F5EFE6',
    fontSize:'14px', outline:'none', boxSizing:'border-box',
    fontFamily:"'DM Sans',sans-serif",
  };

  const ativa = promoAtual && promoEstaAtiva(promoAtual);
  const vagasRestantes = promoAtual ? (promoAtual.vagas||0) - (promoAtual.resgatados||0) : 0;
  const pct = promoAtual ? Math.max(0, vagasRestantes/promoAtual.vagas*100) : 0;

  return (
    <div style={{ ...s.app, paddingBottom:'40px' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#8B0000,#C62828)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#fff', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#fff' }}>🔥 Promoções</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)' }}>Controle de promoções relâmpago</div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', borderBottom:'1px solid #3A2018' }}>
        {[{id:'status',label:'📊 Status'},{id:'criar',label:'➕ Nova Promoção'}].map(a => (
          <button key={a.id} onClick={()=>setAba(a.id)}
            style={{ flex:1, padding:'13px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #F44336':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'13px', fontWeight:aba===a.id?'700':'400', cursor:'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>
        {msg && (
          <div style={{ background: msg.startsWith('✅')?'rgba(76,175,80,0.15)':'rgba(244,67,54,0.15)', border:`1px solid ${msg.startsWith('✅')?'#4CAF50':'#F44336'}`, borderRadius:'10px', padding:'10px 14px', marginBottom:'16px', fontSize:'13px', color: msg.startsWith('✅')?'#4CAF50':'#F44336' }}>
            {msg}
          </div>
        )}

        {/* ABA STATUS */}
        {aba === 'status' && (
          <>
            {!promoAtual ? (
              <div style={{ textAlign:'center', padding:'40px' }}>
                <div style={{ fontSize:'48px', marginBottom:'12px' }}>🔕</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#E8C96A', marginBottom:'8px' }}>Nenhuma promoção ativa</div>
                <button onClick={()=>setAba('criar')} style={{ padding:'12px 24px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,#8B0000,#F44336)', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                  🔥 Criar promoção agora
                </button>
              </div>
            ) : (
              <>
                {/* Card da promoção */}
                <div style={{ background:'linear-gradient(135deg,#8B0000,#C62828)', borderRadius:'16px', padding:'20px', marginBottom:'16px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:'-20px', right:'-20px', fontSize:'100px', opacity:0.08 }}>🔥</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                    <div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>
                        {ativa ? '🟢 ATIVA' : '🔴 ENCERRADA'}
                      </div>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#fff', fontWeight:'900' }}>{promoAtual.titulo}</div>
                    </div>
                    {contador && ativa && (
                      <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'10px', padding:'6px 12px', textAlign:'center' }}>
                        <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.6)', marginBottom:'2px' }}>EXPIRA</div>
                        <div style={{ fontSize:'16px', fontWeight:'900', color:'#fff', fontFamily:'monospace' }}>{contador}</div>
                      </div>
                    )}
                  </div>
                  {promoAtual.descricao && (
                    <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.85)', marginBottom:'12px' }}>🎁 {promoAtual.descricao}</div>
                  )}
                  {/* Barra de vagas */}
                  <div style={{ marginBottom:'8px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                      <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.9)', fontWeight:'700' }}>
                        {vagasRestantes} / {promoAtual.vagas} vagas restantes
                      </div>
                      <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)' }}>{promoAtual.resgatados||0} resgatadas</div>
                    </div>
                    <div style={{ height:'8px', background:'rgba(0,0,0,0.3)', borderRadius:'4px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${100-pct}%`, background: pct>50?'#4CAF50':pct>20?'#FFC107':'#FF5252', borderRadius:'4px', transition:'width 0.5s' }} />
                    </div>
                  </div>
                </div>

                {/* Ações */}
                {ativa && (
                  <button onClick={handleEncerrar} disabled={encerrando}
                    style={{ width:'100%', padding:'13px', borderRadius:'12px', border:'1.5px solid rgba(244,67,54,0.5)', background:'rgba(244,67,54,0.1)', color:'#F44336', fontSize:'14px', fontWeight:'700', cursor:'pointer', marginBottom:'16px' }}>
                    {encerrando ? '...' : '⛔ Encerrar promoção agora'}
                  </button>
                )}

                {/* Lista de resgates */}
                <div style={{ fontSize:'12px', color:'#E8C96A', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>
                  👥 Quem resgatou ({resgates.length})
                </div>
                {resgates.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'20px', color:'#9A8880', fontSize:'13px' }}>Ninguém resgatou ainda</div>
                ) : resgates.map(r => (
                  <div key={r.id} style={{ background:'#231410', borderRadius:'12px', padding:'10px 14px', border:'1px solid #3A2018', marginBottom:'8px', display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:r.utilizado?'rgba(46,125,122,0.2)':'rgba(244,67,54,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', color:r.utilizado?'#2E7D7A':'#F44336', flexShrink:0 }}>
                      {r.clienteNome?.charAt(0)||'?'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'700', fontSize:'13px', color:'#F5EFE6' }}>{r.clienteNome}</div>
                      <div style={{ fontSize:'11px', color:'#9A8880' }}>{r.clienteTel} · {r.utilizado?'✅ Agendado':'⏳ Pendente'}</div>
                    </div>
                    {r.clienteTel && (
                      <button onClick={()=>window.open(`https://wa.me/55${r.clienteTel.replace(/\D/g,'')}`, '_blank')}
                        style={{ padding:'6px 10px', borderRadius:'8px', border:'none', background:'rgba(37,211,102,0.15)', color:'#25D366', fontSize:'11px', cursor:'pointer' }}>📲</button>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ABA CRIAR */}
        {aba === 'criar' && (
          <div>
            {[
              { label:'Título da promoção *', key:'titulo', placeholder:'Ex: Corte Grátis para os 5 primeiros!' },
              { label:'O que o cliente ganha *', key:'descricao', placeholder:'Ex: 1 corte grátis à sua escolha' },
              { label:'Mensagem no banner', key:'mensagem', placeholder:'Deixe em branco para usar o título' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:'14px' }}>
                <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>{f.label}</label>
                <input type="text" style={inp} placeholder={f.placeholder} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
              </div>
            ))}

            <div style={{ marginBottom:'14px' }}>
              <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Número de vagas *</label>
              <input type="number" min="1" max="1000" style={inp} value={form.vagas} onChange={e=>setForm(p=>({...p,vagas:e.target.value}))} />
            </div>

            <div style={{ marginBottom:'14px' }}>
              <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'8px' }}>Validade</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                {[
                  { v:'hoje',         l:'Hoje' },
                  { v:'24h',          l:'24h'  },
                  { v:'48h',          l:'48h'  },
                  { v:'personalizado',l:'Outro' },
                ].map(op => (
                  <div key={op.v} onClick={()=>setForm(p=>({...p,validade:op.v}))}
                    style={{ padding:'10px', borderRadius:'10px', textAlign:'center', cursor:'pointer', background:form.validade===op.v?'rgba(244,67,54,0.2)':'#231410', border:form.validade===op.v?'1.5px solid #F44336':'1px solid #3A2018', color:form.validade===op.v?'#F44336':'#9A8880', fontSize:'13px', fontWeight:form.validade===op.v?'700':'400' }}>
                    {op.l}
                  </div>
                ))}
              </div>
            </div>

            {form.validade === 'personalizado' && (
              <div style={{ marginBottom:'14px' }}>
                <label style={{ fontSize:'11px', color:'#9A8880', display:'block', marginBottom:'5px' }}>Duração em horas</label>
                <input type="number" min="1" style={inp} value={form.duracaoHoras} onChange={e=>setForm(p=>({...p,duracaoHoras:e.target.value}))} />
              </div>
            )}

            {/* Preview */}
            {form.titulo && (
              <div style={{ background:'linear-gradient(135deg,#8B0000,#F44336)', borderRadius:'14px', padding:'16px', marginBottom:'16px', opacity:0.85 }}>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.7)', fontWeight:'700', textTransform:'uppercase', marginBottom:'6px' }}>⚡ Preview do banner</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#fff', fontWeight:'900', marginBottom:'4px' }}>{form.titulo}</div>
                {form.descricao && <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)' }}>🎁 {form.descricao}</div>}
                <div style={{ marginTop:'8px', fontSize:'12px', color:'rgba(255,255,255,0.7)' }}>⚡ {form.vagas||'?'} vagas · {form.validade==='personalizado'?`${form.duracaoHoras}h`:form.validade}</div>
              </div>
            )}

            <button onClick={handleCriar} disabled={criando}
              style={{ width:'100%', padding:'15px', borderRadius:'14px', border:'none', background:criando?'#2E1A14':'linear-gradient(135deg,#8B0000,#F44336)', color:criando?'#555':'#fff', fontSize:'15px', fontWeight:'700', cursor:criando?'wait':'pointer' }}>
              {criando ? '⏳ Criando...' : '🔥 Ativar Promoção Agora'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
