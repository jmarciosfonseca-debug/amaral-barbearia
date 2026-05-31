// GerenciarAssinaturas.jsx — Flyguer BarberShop
// ✅ Baixa por serviço individual
// ✅ Contador por serviço (cortes, barbas, sobrancelhas, etc)

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

export default function GerenciarAssinaturas({ onBack, dark }) {
  const s = getStyles(dark);
  const [aba, setAba]               = React.useState('pendentes');
  const [assinaturas, setAssinaturas] = React.useState([]);
  const [planos, setPlanos]         = React.useState([]);
  const [loading, setLoading]       = React.useState(true);
  const [salvando, setSalvando]     = React.useState(false);
  const [erro, setErro]             = React.useState('');
  const [sucesso, setSucesso]       = React.useState('');
  const [busca, setBusca]           = React.useState('');
  const [modalAtivar, setModalAtivar] = React.useState(null);
  const [dataPagamento, setDataPagamento] = React.useState('');
  const [modalBaixa, setModalBaixa] = React.useState(null);

  // vincular
  const [clienteNome, setClienteNome] = React.useState('');
  const [clienteTel, setClienteTel]   = React.useState('');
  const [planoSel, setPlanoSel]       = React.useState('');
  const [clienteId, setClienteId]     = React.useState('');

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  React.useEffect(() => {
    let unsubA, unsubP;
    (async () => {
      const { collection, onSnapshot, query, where, orderBy } = await import('firebase/firestore');
      const qa = query(collection(db, 'assinaturas'), orderBy('assinadoEm', 'desc'));
      unsubA = onSnapshot(qa, snap => {
        setAssinaturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
      const qp = query(collection(db, 'planos'), where('ativo', '==', true), orderBy('preco', 'asc'));
      unsubP = onSnapshot(qp, snap => setPlanos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    })();
    return () => { unsubA?.(); unsubP?.(); };
  }, []);

  const pendentes = assinaturas.filter(a => a.status === 'pendente_pagamento');
  const ativas    = assinaturas.filter(a => a.status === 'ativa');
  const filtrar   = lista => !busca ? lista : lista.filter(a =>
    a.clienteNome?.toLowerCase().includes(busca.toLowerCase()) || a.clienteTelefone?.includes(busca)
  );

  // ── Cancelamentos do cliente (visão barbearia) ──
  // Busca agendamentos incluindo os ocultados pelo cliente
  const [cancelamentosPorCliente, setCancelamentosPorCliente] = React.useState({});
  React.useEffect(() => {
    (async () => {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(query(collection(db, 'agendamentos'), where('status', '==', 'cancelado_cliente')));
      const mapa = {};
      snap.docs.forEach(d => {
        const cpf = d.data().clienteCpf;
        if (cpf) mapa[cpf] = (mapa[cpf] || 0) + 1;
      });
      setCancelamentosPorCliente(mapa);
    })();
  }, []);

  // ── Calcular uso por serviço ──
  function calcularUso(assinatura) {
    const servicos = assinatura.servicosInclusos || [];
    const uso = assinatura.usoServicos || {};
    // Cada serviço tem limite de 4 (padrão) ou definido no plano
    return servicos.map(sv => ({
      nome: sv,
      usado: uso[sv] || 0,
      limite: assinatura.limiteServicos?.[sv] || 4,
    }));
  }

  // ── Dar baixa por serviço ──
  async function darBaixaServico(assinatura, servico) {
    setSalvando(true);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const usoAtual = assinatura.usoServicos || {};
      const novoUso = { ...usoAtual, [servico]: (usoAtual[servico] || 0) + 1 };
      await updateDoc(doc(db, 'assinaturas', assinatura.id), { usoServicos: novoUso });
      setSucesso('✅ Baixa registrada: ' + servico + ' para ' + assinatura.clienteNome);
      setTimeout(() => setSucesso(''), 3000);
    } catch(e) { setErro('Erro: ' + e.message); }
    setSalvando(false);
  }

  // ── Ativar plano ──
  async function ativarPlano() {
    if (!modalAtivar || !dataPagamento) { setErro('Informe a data de pagamento.'); return; }
    setSalvando(true); setErro('');
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const venc = new Date(dataPagamento + 'T12:00:00');
      venc.setMonth(venc.getMonth() + 1);
      await updateDoc(doc(db, 'assinaturas', modalAtivar.id), {
        status: 'ativa', dataPagamento, vencimento: venc.toISOString(),
        ativadoEm: serverTimestamp(), ativadoPor: 'recepcao',
        usoServicos: {}, // resetar uso ao ativar
      });
      setModalAtivar(null); setDataPagamento('');
      setSucesso('✅ Plano ativado para ' + modalAtivar.clienteNome + '!');
      setTimeout(() => setSucesso(''), 4000);
      setAba('ativas');
    } catch(e) { setErro('Erro: ' + e.message); }
    setSalvando(false);
  }

  // ── Cancelar ──
  async function cancelar(a) {
    setSalvando(true);
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'assinaturas', a.id), { status: 'cancelada', canceladaEm: serverTimestamp() });
    } catch(e) { setErro('Erro: ' + e.message); }
    setSalvando(false);
  }

  // ── Buscar cliente ──
  async function buscarCliente() {
    if (!clienteTel.trim()) { setErro('Informe o telefone.'); return; }
    setErro('');
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(query(collection(db, 'clientes'), where('telefone', '==', clienteTel.trim())));
      if (snap.empty) { setErro('Cliente não encontrado.'); setClienteNome(''); setClienteId(''); return; }
      const d = snap.docs[0];
      setClienteNome(d.data().nome || ''); setClienteId(d.id);
    } catch(e) { setErro('Erro: ' + e.message); }
  }

  // ── Vincular ──
  async function vincular() {
    if (!clienteId || !planoSel) { setErro('Busque o cliente e selecione um plano.'); return; }
    setSalvando(true); setErro('');
    try {
      const { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } = await import('firebase/firestore');
      const qa = query(collection(db, 'assinaturas'), where('clienteId', '==', clienteId), where('status', '==', 'ativa'));
      const snap = await getDocs(qa);
      for (const d of snap.docs) await updateDoc(doc(db, 'assinaturas', d.id), { status: 'cancelada', canceladaEm: serverTimestamp() });
      const plano = planos.find(p => p.id === planoSel);
      const venc  = new Date(); venc.setMonth(venc.getMonth() + 1);
      await addDoc(collection(db, 'assinaturas'), {
        clienteId, clienteNome, clienteTelefone: clienteTel.trim(),
        planoId: plano.id, planoNome: plano.nome, planoIcone: plano.icone || '💈',
        planoCor: plano.cor || '#C9A84C', preco: plano.preco,
        servicosInclusos: plano.servicosInclusos || [],
        cortesInclusos: plano.cortesInclusos || 0,
        usoServicos: {},
        cortesUsados: 0, status: 'ativa',
        assinadoEm: serverTimestamp(), vencimento: venc.toISOString(),
        dataPagamento: new Date().toISOString().split('T')[0],
        vinculadoPor: 'recepcao', renovacaoAuto: false,
      });
      setSucesso('✅ ' + clienteNome + ' vinculado ao Plano ' + plano.nome + '!');
      setClienteNome(''); setClienteTel(''); setClienteId(''); setPlanoSel('');
      setTimeout(() => setSucesso(''), 4000);
      setAba('ativas');
    } catch(e) { setErro('Erro: ' + e.message); }
    setSalvando(false);
  }

  // ── Card de assinatura ──
  function CardAssinatura({ a, showAtivar }) {
    const usos = calcularUso(a);
    const [expandido, setExpandido] = React.useState(false);

    return (
      <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', marginBottom: '10px', overflow: 'hidden' }}>
        <div style={{ height: '3px', background: a.planoCor || '#C9A84C' }} />
        <div style={{ padding: '14px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ ...s.avatar, width: '40px', height: '40px', fontSize: '16px', flexShrink: 0 }}>
              {(a.clienteNome||'?')[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: textMain }}>{a.clienteNome}</div>
              <div style={{ fontSize: '11px', color: textSub }}>{a.clienteTelefone}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: a.planoCor || '#C9A84C', fontWeight: '700' }}>{a.planoIcone} {a.planoNome}</div>
              <div style={{ fontSize: '10px', color: textSub }}>R$ {Number(a.preco).toFixed(2)}/mês</div>
            </div>
          </div>

          {/* Badge cancelamentos — visão barbearia */}
          {cancelamentosPorCliente[a.clienteId] > 0 && (
            <div style={{ background:'rgba(244,67,54,0.1)', border:'1px solid rgba(244,67,54,0.3)', borderRadius:'8px', padding:'6px 10px', marginBottom:'8px', fontSize:'11px', color:'#F44336', display:'flex', alignItems:'center', gap:'6px' }}>
              <span>⚠️</span>
              <span><strong>{cancelamentosPorCliente[a.clienteId]}x</strong> cancelamento{cancelamentosPorCliente[a.clienteId]!==1?'s':''} no histórico</span>
            </div>
          )}

          {/* Datas */}
          {(a.dataPagamento || a.vencimento) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
              {a.dataPagamento && (
                <div style={{ background: dark?'#1A0F0D':'#f9f5f0', borderRadius:'8px', padding:'6px 10px' }}>
                  <div style={{ fontSize:'10px', color:textSub }}>Pagamento</div>
                  <div style={{ fontSize:'12px', color:textMain, fontWeight:'600' }}>
                    {new Date(a.dataPagamento+'T12:00:00').toLocaleDateString('pt-BR')}
                  </div>
                </div>
              )}
              {a.vencimento && (
                <div style={{ background: dark?'#1A0F0D':'#f9f5f0', borderRadius:'8px', padding:'6px 10px' }}>
                  <div style={{ fontSize:'10px', color:textSub }}>Vencimento</div>
                  <div style={{ fontSize:'12px', color:textMain, fontWeight:'600' }}>
                    {new Date(a.vencimento).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Uso por serviço */}
          {!showAtivar && usos.length > 0 && (
            <div style={{ background: dark?'#1A0F0D':'#f9f5f0', borderRadius:'10px', padding:'10px', marginBottom:'10px' }}>
              <div style={{ fontSize:'11px', color:textSub, fontWeight:'600', marginBottom:'8px', textTransform:'uppercase' }}>
                Uso do mês
              </div>
              {usos.map(sv => {
                const restante = Math.max(0, sv.limite - sv.usado);
                const pct = Math.min(100, (sv.usado / sv.limite) * 100);
                return (
                  <div key={sv.nome} style={{ marginBottom: '8px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                      <span style={{ fontSize:'12px', color:textMain, fontWeight:'600' }}>{sv.nome}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontSize:'11px', color:restante===0?'#F44336':'#4CAF50', fontWeight:'700' }}>
                          {restante === 0 ? '✗ Esgotado' : restante + ' restante' + (restante!==1?'s':'')}
                        </span>
                        <span style={{ fontSize:'10px', color:textSub }}>{sv.usado}/{sv.limite}</span>
                        {restante > 0 && (
                          <button
                            onClick={() => darBaixaServico(a, sv.nome)}
                            disabled={salvando}
                            style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', border:'none', borderRadius:'6px', padding:'4px 8px', fontSize:'11px', color:'#F5EFE6', cursor:'pointer', fontWeight:'700', whiteSpace:'nowrap' }}>
                            + Usar
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ height:'4px', background:dark?'#2E1A14':'#e5d5cc', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:pct+'%', background:restante===0?'#F44336':(a.planoCor||'#C9A84C'), borderRadius:'2px', transition:'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ações */}
          {showAtivar ? (
            <button onClick={() => { setModalAtivar(a); setDataPagamento(new Date().toISOString().split('T')[0]); setErro(''); }}
              style={{ width:'100%', background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', border:'none', borderRadius:'10px', padding:'10px', fontSize:'13px', color:'#fff', cursor:'pointer', fontWeight:'700' }}>
              ✅ Ativar — Confirmar data de pagamento
            </button>
          ) : (
            <button onClick={() => cancelar(a)}
              style={{ width:'100%', background:'transparent', border:'1px solid #8B3A2A', borderRadius:'8px', padding:'8px', fontSize:'12px', color:'#F44336', cursor:'pointer' }}>
              ✕ Cancelar assinatura
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...s.app, paddingBottom: '80px' }}>

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px 0', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 12px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#F5EFE6', fontWeight:'700' }}>Assinaturas</div>
        </div>
        <div style={{ display:'flex', gap:'4px' }}>
          {[
            { id:'pendentes', label:'⏳ Pendentes', badge: pendentes.length },
            { id:'ativas',    label:'✅ Ativas',    badge: ativas.length    },
            { id:'vincular',  label:'➕',            badge: 0                },
          ].map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              style={{ background:aba===a.id?'#C9A84C':'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px 8px 0 0', padding:'6px 10px', color:aba===a.id?'#1A0F0D':'#F5EFE6', fontSize:'11px', cursor:'pointer', fontWeight:aba===a.id?'700':'400', position:'relative' }}>
              {a.label}
              {a.badge > 0 && <span style={{ position:'absolute', top:'-4px', right:'-4px', background:'#F44336', color:'#fff', borderRadius:'50%', width:'16px', height:'16px', fontSize:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700' }}>{a.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        {sucesso && <div style={{ background:'rgba(76,175,80,0.15)', border:'1px solid #4CAF50', borderRadius:'12px', padding:'12px 16px', marginBottom:'14px', fontSize:'13px', color:'#4CAF50', fontWeight:'600' }}>{sucesso}</div>}
        {erro && <div style={{ background:'rgba(244,67,54,0.1)', border:'1px solid #F44336', borderRadius:'10px', padding:'10px', fontSize:'12px', color:'#F44336', marginBottom:'12px' }}>{erro}</div>}

        {(aba==='pendentes'||aba==='ativas') && (
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="🔍 Buscar por nome ou telefone..."
            style={{ ...s.input, width:'100%', boxSizing:'border-box', marginBottom:'14px' }} />
        )}

        {aba==='pendentes' && (
          <>
            {loading && <div style={{ textAlign:'center', padding:'40px', color:textSub }}>Carregando...</div>}
            {!loading && filtrar(pendentes).length===0 && (
              <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>⏳</div>
                <div>Nenhum plano aguardando ativação.</div>
              </div>
            )}
            {filtrar(pendentes).map(a => <CardAssinatura key={a.id} a={a} showAtivar={true} />)}
          </>
        )}

        {aba==='ativas' && (
          <>
            {loading && <div style={{ textAlign:'center', padding:'40px', color:textSub }}>Carregando...</div>}
            {!loading && filtrar(ativas).length===0 && (
              <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>📋</div>
                <div>Nenhuma assinatura ativa.</div>
                <button onClick={() => setAba('vincular')} style={{ marginTop:'12px', background:'#8B3A2A', border:'none', borderRadius:'10px', padding:'10px 20px', color:'#F5EFE6', fontWeight:'700', cursor:'pointer', fontSize:'13px' }}>+ Vincular cliente</button>
              </div>
            )}
            {filtrar(ativas).map(a => <CardAssinatura key={a.id} a={a} showAtivar={false} />)}
          </>
        )}

        {aba==='vincular' && (
          <div style={{ background:cardBg, border:'1px solid '+border, borderRadius:'16px', padding:'20px' }}>
            <div style={{ fontWeight:'700', fontSize:'15px', color:textMain, marginBottom:'16px' }}>➕ Vincular cliente a plano</div>
            <div style={{ marginBottom:'12px' }}>
              <label style={{ fontSize:'12px', color:textSub, fontWeight:'600', display:'block', marginBottom:'6px' }}>Telefone do cliente</label>
              <div style={{ display:'flex', gap:'8px' }}>
                <input value={clienteTel} onChange={e => setClienteTel(e.target.value)} placeholder="(11) 99999-9999" style={{ ...s.input, flex:1 }} />
                <button onClick={buscarCliente} style={{ background:'#8B3A2A', border:'none', borderRadius:'10px', padding:'8px 14px', color:'#F5EFE6', fontWeight:'600', fontSize:'13px', cursor:'pointer' }}>Buscar</button>
              </div>
            </div>
            {clienteNome && (
              <div style={{ background:'rgba(76,175,80,0.1)', border:'1px solid #4CAF50', borderRadius:'10px', padding:'10px 14px', marginBottom:'12px', fontSize:'13px', color:'#4CAF50' }}>
                ✅ Cliente: <strong>{clienteNome}</strong>
              </div>
            )}
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'12px', color:textSub, fontWeight:'600', display:'block', marginBottom:'6px' }}>Selecionar plano</label>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {planos.map(p => (
                  <div key={p.id} onClick={() => setPlanoSel(p.id)}
                    style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', background:planoSel===p.id?(dark?'#3A2018':'#fdf0dc'):(dark?'#2E1A14':'#f5efe6'), border:'1px solid '+(planoSel===p.id?(p.cor||'#C9A84C'):border), borderRadius:'10px', cursor:'pointer' }}>
                    <span style={{ fontSize:'24px' }}>{p.icone}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'700', fontSize:'13px', color:textMain }}>{p.nome}</div>
                      <div style={{ fontSize:'11px', color:textSub }}>{(p.servicosInclusos||[]).join(', ')||'Serviços inclusos'} — R$ {Number(p.preco).toFixed(2)}/mês</div>
                    </div>
                    <div style={{ width:'20px', height:'20px', borderRadius:'50%', border:'2px solid '+(planoSel===p.id?(p.cor||'#C9A84C'):border), background:planoSel===p.id?(p.cor||'#C9A84C'):'transparent' }} />
                  </div>
                ))}
              </div>
            </div>
            <button onClick={vincular} disabled={salvando||!clienteId||!planoSel}
              style={{ width:'100%', background:clienteId&&planoSel?'linear-gradient(135deg,#5C2218,#8B3A2A)':'#2E1A14', border:'none', borderRadius:'12px', padding:'14px', color:clienteId&&planoSel?'#F5EFE6':'#555', fontWeight:'700', fontSize:'14px', cursor:clienteId&&planoSel?'pointer':'not-allowed' }}>
              {salvando?'Vinculando...':'✅ Confirmar Vínculo'}
            </button>
          </div>
        )}
      </div>

      {/* MODAL ATIVAR */}
      {modalAtivar && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:dark?'#1A0F0D':'#fff', borderRadius:'24px 24px 0 0', padding:'28px 20px 40px', width:'100%', maxWidth:'430px' }}>
            <div style={{ textAlign:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'48px', marginBottom:'8px' }}>✅</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:textMain, fontWeight:'700' }}>Ativar Plano</div>
              <div style={{ fontSize:'13px', color:textSub, marginTop:'4px' }}>{modalAtivar.clienteNome} · {modalAtivar.planoNome}</div>
            </div>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'12px', color:textSub, fontWeight:'600', display:'block', marginBottom:'8px' }}>Data do pagamento *</label>
              <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)}
                style={{ ...s.input, width:'100%', boxSizing:'border-box' }} />
              <div style={{ fontSize:'11px', color:textSub, marginTop:'4px' }}>Vencimento = 1 mês após esta data.</div>
            </div>
            {erro && <div style={{ background:'rgba(244,67,54,0.1)', border:'1px solid #F44336', borderRadius:'10px', padding:'10px', fontSize:'12px', color:'#F44336', marginBottom:'12px' }}>{erro}</div>}
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => { setModalAtivar(null); setErro(''); }} style={{ flex:1, background:dark?'#2E1A14':'#f5efe6', border:'1px solid '+border, borderRadius:'12px', padding:'14px', color:textSub, cursor:'pointer' }}>Cancelar</button>
              <button onClick={ativarPlano} disabled={salvando}
                style={{ flex:2, background:'linear-gradient(135deg,#2E7D7A,#3A9E9A)', border:'none', borderRadius:'12px', padding:'14px', color:'#fff', fontWeight:'700', fontSize:'14px', cursor:'pointer' }}>
                {salvando?'Ativando...':'✅ Ativar Plano'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
