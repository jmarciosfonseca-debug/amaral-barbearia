// PerfilCliente.jsx — Flyguer BarberShop
// ✅ Fix: assinatura busca por cpf
// ✅ Histórico com excluir cancelamentos (oculta do cliente, mantém na barbearia)
// ✅ Saldo de serviços do plano

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

function formatarData(dataStr) {
  if (!dataStr) return '';
  const [a,m,d] = dataStr.split('-');
  return `${d}/${m}/${a}`;
}

function comprimirFoto(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 300;
      let w = img.width, h = img.height;
      if (w > h) { if (w > max) { h = h * max / w; w = max; } }
      else        { if (h > max) { w = w * max / h; h = max; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function Estrelas({ nota, size = 16 }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= nota ? '#E8C96A' : '#3A2018' }}>★</span>
      ))}
    </div>
  );
}

export default function PerfilCliente({ cliente, onBack, dark, onNavegar }) {
  const s = getStyles(dark);
  const [aba, setAba]                   = React.useState('perfil');
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [avaliacoes, setAvaliacoes]     = React.useState([]);
  const [assinatura, setAssinatura]     = React.useState(null);
  const [loading, setLoading]           = React.useState(true);
  const [editando, setEditando]         = React.useState(false);
  const [salvando, setSalvando]         = React.useState(false);
  const [foto, setFoto]                 = React.useState(cliente.foto || null);
  const [nome, setNome]                 = React.useState(cliente.nome || '');
  const [telefone, setTelefone]         = React.useState(cliente.telefone || '');

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  // ✅ Fix: usar cpf como chave
  const chave = cliente.cpf || cliente.uid;

  React.useEffect(() => {
    if (!chave) return;
    let unsubA, unsubAv, unsubAs;
    (async () => {
      const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');

      // Agendamentos — apenas os NÃO excluídos pelo cliente
      const qA = query(
        collection(db, 'agendamentos'),
        where('clienteCpf', '==', chave),
        orderBy('data', 'desc'),
        orderBy('hora', 'desc'),
      );
      unsubA = onSnapshot(qA, snap => {
        // Filtra os que o cliente excluiu do histórico
        setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(a => !a.ocultadoPorCliente));
        setLoading(false);
      }, () => setLoading(false));

      // Avaliações
      const qAv = query(collection(db, 'avaliacoes'), where('clienteId', '==', chave), orderBy('criadoEm', 'desc'));
      unsubAv = onSnapshot(qAv, snap => {
        setAvaliacoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, () => {});

      // ✅ Fix: busca assinatura por cpf (não uid)
      const qAs = query(
        collection(db, 'assinaturas'),
        where('clienteId', '==', chave),
      );
      unsubAs = onSnapshot(qAs, snap => {
        const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const ativa    = todas.find(a => a.status === 'ativa');
        const pendente = todas.find(a => a.status === 'pendente_pagamento');
        setAssinatura(ativa || pendente || null);
      }, () => {});
    })();
    return () => { unsubA?.(); unsubAv?.(); unsubAs?.(); };
  }, [chave]);

  // Estatísticas
  const concluidos  = agendamentos.filter(a => a.status === 'concluido');
  const cancelados  = agendamentos.filter(a => a.status?.includes('cancelado'));
  const totalGasto  = concluidos.reduce((acc, a) => acc + (a.valorFinal || a.valor || 0), 0);
  const mediaNota   = avaliacoes.length > 0 ? (avaliacoes.reduce((a, av) => a + av.nota, 0) / avaliacoes.length).toFixed(1) : null;
  const barbeirosMap = {};
  concluidos.forEach(a => { barbeirosMap[a.barbeiroNome] = (barbeirosMap[a.barbeiroNome] || 0) + 1; });
  const barbeiroFav = Object.entries(barbeirosMap).sort((a,b) => b[1]-a[1])[0]?.[0];

  // Saldo de serviços do plano
  function calcularSaldo() {
    if (!assinatura || assinatura.status !== 'ativa') return [];
    const servicos = assinatura.servicosInclusos || [];
    const uso = assinatura.usoServicos || {};
    return servicos.map(sv => ({
      nome: sv,
      usado: uso[sv] || 0,
      limite: assinatura.limiteServicos?.[sv] || 4,
    }));
  }

  // ✅ Ocultar cancelamento do histórico do cliente (mantém no Firestore)
  async function ocultarCancelamento(ag) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'agendamentos', ag.id), {
        ocultadoPorCliente: true,
        ocultadoEm: new Date().toISOString(),
      });
    } catch(e) { console.error(e); }
  }

  async function salvarPerfil() {
    setSalvando(true);
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(db, 'clientes', chave), { nome, telefone, foto, atualizadoEm: serverTimestamp() }, { merge: true });
      setEditando(false);
    } catch(e) { console.error(e); }
    setSalvando(false);
  }

  function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    comprimirFoto(file, base64 => setFoto(base64));
  }

  const saldo = calcularSaldo();

  return (
    <div style={{ ...s.app, paddingBottom: '80px' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#1A0F0D,#2E1A14)', position: 'relative' }}>
        <div style={{ height: '80px', background: 'linear-gradient(135deg,#5C2218,#8B3A2A,#C9A84C)' }} />
        <button onClick={onBack} style={{ position:'absolute', top:'12px', left:'12px', background:'rgba(0,0,0,0.3)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>

        <div style={{ position:'relative', display:'inline-block', marginLeft:'20px', marginTop:'-36px' }}>
          <label style={{ cursor: editando ? 'pointer' : 'default' }}>
            <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'linear-gradient(135deg,#5C2218,#8B3A2A)', border:`3px solid ${dark?'#1A0F0D':'#fff'}`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', fontWeight:'700', color:'#F5EFE6' }}>
              {foto ? <img src={foto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (nome[0]||'?').toUpperCase()}
            </div>
            {editando && <input type="file" accept="image/*" onChange={handleFoto} style={{ display:'none' }} />}
            {editando && <div style={{ position:'absolute', bottom:0, right:0, background:'#C9A84C', borderRadius:'50%', width:'22px', height:'22px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>📷</div>}
          </label>
        </div>

        <div style={{ padding:'10px 20px 16px' }}>
          {editando ? (
            <div>
              <input value={nome} onChange={e=>setNome(e.target.value)} style={{ ...s.input, marginBottom:'8px', width:'100%', boxSizing:'border-box' }} placeholder="Nome completo" />
              <input value={telefone} onChange={e=>setTelefone(e.target.value)} style={{ ...s.input, width:'100%', boxSizing:'border-box' }} placeholder="Telefone" type="tel" />
              <div style={{ display:'flex', gap:'8px', marginTop:'10px' }}>
                <button onClick={salvarPerfil} disabled={salvando} style={{ flex:1, background:'linear-gradient(135deg,#5C2218,#8B3A2A)', border:'none', borderRadius:'10px', padding:'10px', color:'#F5EFE6', fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>
                  {salvando ? 'Salvando...' : '✅ Salvar'}
                </button>
                <button onClick={() => setEditando(false)} style={{ flex:1, background:dark?'#2E1A14':'#f5efe6', border:`1px solid ${border}`, borderRadius:'10px', padding:'10px', color:textSub, fontSize:'13px', cursor:'pointer' }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', fontWeight:'700', color:'#F5EFE6' }}>{nome}</div>
                <div style={{ fontSize:'12px', color:'#9A8880', marginTop:'2px' }}>📞 {telefone || 'Telefone não informado'}</div>
                {mediaNota && <div style={{ marginTop:'4px', display:'flex', alignItems:'center', gap:'4px' }}><Estrelas nota={Math.round(mediaNota)} size={12} /><span style={{ fontSize:'11px', color:'#9A8880' }}>{mediaNota}</span></div>}
              </div>
              <button onClick={() => setEditando(true)} style={{ background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:'8px', padding:'6px 12px', color:'#E8C96A', fontSize:'12px', cursor:'pointer', fontWeight:'600' }}>✏️ Editar</button>
            </div>
          )}
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', padding:'12px 16px', borderBottom:`1px solid ${border}` }}>
        {[
          { label:'Cortes', value: concluidos.length, color:'#E8C96A' },
          { label:'Total gasto', value:`R$${totalGasto.toFixed(0)}`, color:'#4CAF50' },
          { label:'Barbeiro fav.', value: barbeiroFav || '—', color:'#2E7D7A', small: true },
        ].map(item => (
          <div key={item.label} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'12px', padding:'10px', textAlign:'center' }}>
            <div style={{ fontSize: item.small ? '12px' : '18px', fontWeight:'700', color:item.color, lineHeight:'1.2' }}>{item.value}</div>
            <div style={{ fontSize:'10px', color:textSub, marginTop:'2px' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* ABAS */}
      <div style={{ display:'flex', borderBottom:`1px solid ${border}` }}>
        {[{ id:'perfil',label:'👤 Perfil' },{ id:'historico',label:'📋 Histórico' },{ id:'avaliacoes',label:'⭐ Avaliações' }].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{ flex:1, padding:'12px 8px', border:'none', background:'transparent', borderBottom:aba===a.id?'2px solid #8B3A2A':'2px solid transparent', color:aba===a.id?'#F5EFE6':'#9A8880', fontSize:'12px', fontWeight:aba===a.id?'700':'400', cursor:'pointer', whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif" }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px' }}>

        {/* ABA PERFIL */}
        {aba === 'perfil' && (
          <div>
            {/* Plano ativo com saldo */}
            {assinatura ? (
              <div style={{ background:cardBg, border:`2px solid ${assinatura.planoCor||'#C9A84C'}`, borderRadius:'16px', marginBottom:'12px', overflow:'hidden' }}>
                <div style={{ height:'3px', background:assinatura.planoCor||'#C9A84C' }} />
                <div style={{ padding:'14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                    <span style={{ fontSize:'24px' }}>{assinatura.planoIcone}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'700', fontSize:'14px', color:textMain }}>Plano {assinatura.planoNome}</div>
                      <div style={{ fontSize:'11px', color:assinatura.status==='ativa'?'#4CAF50':'#FFC107' }}>
                        {assinatura.status==='ativa'?'✅ Ativo':'⏳ Aguardando pagamento'} · R$ {Number(assinatura.preco).toFixed(2)}/mês
                      </div>
                    </div>
                    <button onClick={() => onNavegar && onNavegar('assinatura_plano')} style={{ background:'transparent', border:`1px solid ${border}`, borderRadius:'8px', padding:'4px 10px', fontSize:'11px', color:textSub, cursor:'pointer' }}>Ver plano</button>
                  </div>

                  {/* ✅ Saldo de serviços */}
                  {saldo.length > 0 && assinatura.status === 'ativa' && (
                    <div style={{ background:dark?'#1A0F0D':'#f9f5f0', borderRadius:'10px', padding:'10px', marginBottom:'8px' }}>
                      <div style={{ fontSize:'10px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>Seu saldo do mês</div>
                      {saldo.map(sv => {
                        const restante = Math.max(0, sv.limite - sv.usado);
                        const pct = Math.min(100, (sv.usado / sv.limite) * 100);
                        return (
                          <div key={sv.nome} style={{ marginBottom:'8px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                              <span style={{ fontSize:'12px', color:textMain }}>{sv.nome}</span>
                              <span style={{ fontSize:'11px', color:restante===0?'#F44336':assinatura.planoCor||'#C9A84C', fontWeight:'700' }}>
                                {restante===0?'Esgotado':restante+' restante'+(restante!==1?'s':'')}
                              </span>
                            </div>
                            <div style={{ height:'4px', background:dark?'#2E1A14':'#e5d5cc', borderRadius:'2px', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:pct+'%', background:restante===0?'#F44336':(assinatura.planoCor||'#C9A84C'), borderRadius:'2px', transition:'width 0.4s' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:textSub }}>
                    <span>Vencimento</span>
                    <span style={{ color:textMain, fontWeight:'600' }}>{assinatura.vencimento ? new Date(assinatura.vencimento).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontSize:'28px' }}>💳</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'600', fontSize:'13px', color:textMain }}>Sem plano ativo</div>
                  <div style={{ fontSize:'11px', color:textSub }}>Assine um plano e economize nos cortes</div>
                </div>
                <button onClick={() => onNavegar && onNavegar('assinatura_plano')} style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', border:'none', borderRadius:'8px', padding:'8px 12px', color:'#F5EFE6', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>Ver planos</button>
              </div>
            )}

            {/* Informações */}
            <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Informações</div>
              {[
                { label:'Nome',         value: nome },
                { label:'Telefone',     value: telefone || '—' },
                { label:'CPF',          value: cliente.cpf ? `***.${cliente.cpf.slice(3,6)}.${cliente.cpf.slice(6,9)}-**` : '—' },
                { label:'Membro desde', value: cliente.dataCadastro ? new Date(cliente.dataCadastro.seconds*1000).toLocaleDateString('pt-BR') : '—' },
                { label:'Preferência',  value: cliente.preferencia || '—' },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px', paddingBottom:'8px', borderBottom:`1px solid ${border}` }}>
                  <span style={{ fontSize:'13px', color:textSub }}>{item.label}</span>
                  <span style={{ fontSize:'13px', color:textMain, fontWeight:'600' }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              <button onClick={() => onNavegar && onNavegar('agendamento')} style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', border:'none', borderRadius:'12px', padding:'14px', color:'#F5EFE6', fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>📅 Agendar</button>
              <button onClick={() => onNavegar && onNavegar('minhas_reservas')} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'12px', padding:'14px', color:textMain, fontWeight:'600', fontSize:'13px', cursor:'pointer' }}>📋 Reservas</button>
            </div>
          </div>
        )}

        {/* ABA HISTÓRICO */}
        {aba === 'historico' && (
          <div>
            {loading && <div style={{ textAlign:'center', padding:'40px', color:textSub }}>Carregando...</div>}
            {!loading && agendamentos.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>📋</div>
                <div>Nenhum agendamento encontrado.</div>
              </div>
            )}

            {/* Aviso sobre cancelamentos */}
            {cancelados.length > 0 && (
              <div style={{ background:'rgba(255,193,7,0.08)', border:'1px solid rgba(255,193,7,0.2)', borderRadius:'10px', padding:'10px 12px', marginBottom:'12px', fontSize:'11px', color:'#FFC107' }}>
                💡 Você pode excluir cancelamentos do seu histórico. O registro permanece apenas na barbearia.
              </div>
            )}

            {agendamentos.map(ag => {
              const cancelado = ag.status?.includes('cancelado');
              return (
                <div key={ag.id} style={{ background:cardBg, border:`1px solid ${cancelado?'#3A101044':ag.status==='concluido'?'#2E7D7A44':border}`, borderRadius:'14px', padding:'14px', marginBottom:'10px', opacity:cancelado?0.8:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'700', fontSize:'14px', color:textMain }}>{ag.servico}</div>
                      <div style={{ fontSize:'11px', color:textSub }}>✂️ {ag.barbeiroNome} · {formatarData(ag.data)} às {ag.hora}</div>
                    </div>
                    <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
                      <div style={{ fontSize:'14px', fontWeight:'700', color:'#E8C96A' }}>R$ {(ag.valorFinal||ag.valor||0).toFixed(2)}</div>
                      <div style={{ fontSize:'10px', color: ag.status==='concluido'?'#4CAF50':cancelado?'#F44336':'#FFC107', fontWeight:'600' }}>
                        {ag.status==='concluido'?'✓ Concluído':cancelado?'✗ Cancelado':'⏳ Pendente'}
                      </div>
                      {/* ✅ Botão excluir apenas para cancelamentos */}
                      {cancelado && (
                        <button
                          onClick={() => ocultarCancelamento(ag)}
                          style={{ background:'rgba(244,67,54,0.1)', border:'none', borderRadius:'6px', padding:'3px 8px', fontSize:'10px', color:'#F44336', cursor:'pointer', fontWeight:'600' }}>
                          🗑️ Excluir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ABA AVALIAÇÕES */}
        {aba === 'avaliacoes' && (
          <div>
            {avaliacoes.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>⭐</div>
                <div style={{ marginBottom:'4px', fontWeight:'600', color:textMain }}>Nenhuma avaliação ainda</div>
                <div style={{ fontSize:'12px' }}>Suas avaliações aparecem aqui após os atendimentos</div>
              </div>
            ) : (
              <>
                <div style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'16px', marginBottom:'12px', textAlign:'center' }}>
                  <div style={{ fontSize:'40px', fontWeight:'900', color:'#E8C96A' }}>{mediaNota}</div>
                  <Estrelas nota={Math.round(mediaNota)} size={20} />
                  <div style={{ fontSize:'12px', color:textSub, marginTop:'4px' }}>{avaliacoes.length} avaliação{avaliacoes.length!==1?'ões':''}</div>
                </div>
                {avaliacoes.map(av => (
                  <div key={av.id} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:'14px', padding:'14px', marginBottom:'10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                      <Estrelas nota={av.nota} size={14} />
                      <span style={{ fontSize:'11px', color:textSub }}>{av.criadoEm?.toDate ? av.criadoEm.toDate().toLocaleDateString('pt-BR') : '—'}</span>
                    </div>
                    <div style={{ fontSize:'12px', color:textSub, marginBottom:'4px' }}>✂️ {av.barbeiroNome} · {av.servico}</div>
                    {av.comentario && <div style={{ fontSize:'13px', color:textMain, fontStyle:'italic' }}>"{av.comentario}"</div>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
