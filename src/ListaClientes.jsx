// ListaClientes.jsx — Flyguer BarberShop
// ✅ Gerente vê lista completa de clientes + assinaturas
// ✅ Fase 3: Gerente pode bloquear/desbloquear e excluir clientes

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

function formatarData(dataStr) {
  if (!dataStr) return '—';
  try { return new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-BR'); } catch { return dataStr; }
}

export default function ListaClientes({ onBack, dark }) {
  const s = getStyles(dark);
  const [clientes, setClientes]         = React.useState([]);
  const [assinaturas, setAssinaturas]   = React.useState([]);
  const [agendamentos, setAgendamentos] = React.useState([]);
  const [loading, setLoading]           = React.useState(true);
  const [busca, setBusca]               = React.useState('');
  const [expandido, setExpandido]       = React.useState(null);
  const [confirmacao, setConfirmacao]   = React.useState(null); // { tipo: 'bloquear'|'excluir', cliente }
  const [salvando, setSalvando]         = React.useState(false);
  const [toast, setToast]               = React.useState('');

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  React.useEffect(() => {
    (async () => {
      const { collection, getDocs, query } = await import('firebase/firestore');
      const [snapC, snapA, snapAg] = await Promise.all([
        getDocs(query(collection(db, 'clientes'))),
        getDocs(query(collection(db, 'assinaturas'))),
        getDocs(query(collection(db, 'agendamentos'))),
      ]);
      setClientes(snapC.docs.map(d => ({ id: d.id, cpf: d.id, ...d.data() })));
      setAssinaturas(snapA.docs.map(d => ({ id: d.id, ...d.data() })));
      setAgendamentos(snapAg.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []);

  const clientesEnriquecidos = clientes.map(c => {
    const assinAtiva    = assinaturas.find(a => a.clienteId === c.cpf && a.status === 'ativa');
    const assinPendente = assinaturas.find(a => a.clienteId === c.cpf && a.status === 'pendente_pagamento');
    const assin = assinAtiva || assinPendente || null;
    const agsCliente = agendamentos.filter(a => a.clienteCpf === c.cpf);
    const concluidos = agsCliente.filter(a => a.status === 'concluido');
    const cancelados = agsCliente.filter(a => a.status?.includes('cancelado'));
    const totalGasto = concluidos.reduce((acc, a) => acc + (a.valorFinal || a.valor || 0), 0);
    return { ...c, assin, totalAgendamentos: agsCliente.length, totalConcluidos: concluidos.length, totalCancelados: cancelados.length, totalGasto };
  });

  const filtrados = clientesEnriquecidos.filter(c =>
    !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca) || c.cpf?.includes(busca)
  );

  // ✅ Fase 3: Bloquear/desbloquear cliente
  async function bloquearCliente(cliente) {
    setSalvando(true);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const novoStatus = !cliente.bloqueado;
      await updateDoc(doc(db, 'clientes', cliente.id), { bloqueado: novoStatus });
      setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, bloqueado: novoStatus } : c));
      showToast(novoStatus ? `🔒 ${cliente.nome} bloqueado.` : `✅ ${cliente.nome} desbloqueado.`);
    } catch(e) { showToast('Erro: ' + e.message); }
    setSalvando(false);
    setConfirmacao(null);
  }

  // ✅ Fase 3: Excluir cliente (soft delete)
  async function excluirCliente(cliente) {
    setSalvando(true);
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'clientes', cliente.id), { excluido: true, excluidoEm: serverTimestamp() });
      setClientes(prev => prev.filter(c => c.id !== cliente.id));
      showToast(`🗑 ${cliente.nome} removido.`);
    } catch(e) { showToast('Erro: ' + e.message); }
    setSalvando(false);
    setConfirmacao(null);
  }

  function BadgeAssin({ status }) {
    const cfg = {
      ativa:              { label: '✅ Plano ativo',    cor: '#4CAF50' },
      pendente_pagamento: { label: '⏳ Pgto pendente',  cor: '#FFC107' },
    };
    const c = cfg[status];
    if (!c) return null;
    return <span style={{ fontSize:'10px', color:c.cor, fontWeight:'700', background:c.cor+'22', borderRadius:'6px', padding:'2px 8px' }}>{c.label}</span>;
  }

  return (
    <div style={{ ...s.app, paddingBottom:'60px' }}>

      <div style={{ background:'linear-gradient(135deg,#5C2218,#8B3A2A)', padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={onBack} style={{ background:'rgba(0,0,0,0.2)', border:'none', borderRadius:'8px', padding:'6px 10px', color:'#F5EFE6', cursor:'pointer', fontSize:'14px' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:'700', color:'#F5EFE6' }}>👥 Clientes</div>
          <div style={{ fontSize:'11px', color:'rgba(245,239,230,0.6)' }}>{clientes.length} cadastrados</div>
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar por nome, telefone ou CPF..."
          style={{ ...s.input, width:'100%', boxSizing:'border-box', marginBottom:'14px' }} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'16px' }}>
          {[
            { label:'Total',       value:clientes.length,                                                  color:'#E8C96A' },
            { label:'Com plano',   value:assinaturas.filter(a=>a.status==='ativa').length,                 color:'#4CAF50' },
            { label:'Bloqueados',  value:clientes.filter(c=>c.bloqueado).length,                           color:'#F44336' },
          ].map(item => (
            <div key={item.label} style={{ background:cardBg, border:'1px solid '+border, borderRadius:'12px', padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:'18px', fontWeight:'700', color:item.color }}>{item.value}</div>
              <div style={{ fontSize:'10px', color:textSub, marginTop:'2px' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign:'center', padding:'40px', color:textSub }}>⏳ Carregando...</div>}

        {!loading && filtrados.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px', color:textSub }}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>👥</div>
            <div>Nenhum cliente encontrado.</div>
          </div>
        )}

        {filtrados.map(c => {
          const aberto = expandido === c.id;
          return (
            <div key={c.id} style={{ background:cardBg, border:`1px solid ${c.bloqueado?'rgba(244,67,54,0.4)':c.assin?(c.assin.planoCor||'#C9A84C')+'66':border}`, borderRadius:'14px', marginBottom:'10px', overflow:'hidden', opacity:c.bloqueado?0.7:1 }}>
              {c.assin && <div style={{ height:'3px', background:c.assin.planoCor||'#C9A84C' }} />}
              {c.bloqueado && <div style={{ height:'3px', background:'#F44336' }} />}

              <div onClick={() => setExpandido(aberto ? null : c.id)}
                style={{ padding:'14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ ...s.avatar, width:'44px', height:'44px', fontSize:'18px', overflow:'hidden', flexShrink:0, border:c.bloqueado?'2px solid #F44336':'none' }}>
                  {c.foto ? <img src={c.foto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (c.nome||'?')[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                    <div style={{ fontWeight:'700', fontSize:'14px', color:textMain }}>{c.nome}</div>
                    {c.bloqueado && <span style={{ fontSize:'10px', color:'#F44336', background:'rgba(244,67,54,0.15)', borderRadius:'6px', padding:'2px 6px' }}>🔒 Bloqueado</span>}
                  </div>
                  <div style={{ fontSize:'11px', color:textSub, marginTop:'2px' }}>📞 {c.telefone||'—'}</div>
                  {c.assin && <BadgeAssin status={c.assin.status} />}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:'13px', color:'#E8C96A', fontWeight:'700' }}>R$ {c.totalGasto.toFixed(0)}</div>
                  <div style={{ fontSize:'10px', color:textSub }}>{c.totalConcluidos} cortes</div>
                  <div style={{ fontSize:'12px', color:textSub, marginTop:'4px' }}>{aberto?'▲':'▼'}</div>
                </div>
              </div>

              {aberto && (
                <div style={{ borderTop:`1px solid ${border}`, padding:'14px', background:dark?'#1A0F0D':'#f9f5f0' }}>

                  {c.totalCancelados > 2 && (
                    <div style={{ background:'rgba(244,67,54,0.1)', border:'1px solid rgba(244,67,54,0.3)', borderRadius:'8px', padding:'8px 10px', marginBottom:'10px', fontSize:'11px', color:'#F44336' }}>
                      ⚠️ {c.totalCancelados} cancelamentos no histórico
                    </div>
                  )}

                  {c.assin ? (
                    <div style={{ background:cardBg, border:`1px solid ${(c.assin.planoCor||'#C9A84C')}66`, borderRadius:'12px', padding:'12px', marginBottom:'12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                        <span style={{ fontSize:'20px' }}>{c.assin.planoIcone}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:'700', fontSize:'13px', color:textMain }}>Plano {c.assin.planoNome}</div>
                          <BadgeAssin status={c.assin.status} />
                        </div>
                        <div style={{ fontSize:'13px', fontWeight:'700', color:c.assin.planoCor||'#C9A84C' }}>
                          R$ {Number(c.assin.preco).toFixed(2)}/mês
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                        {[
                          { label:'Pagamento', value:c.assin.dataPagamento?formatarData(c.assin.dataPagamento):'—' },
                          { label:'Vencimento', value:c.assin.vencimento?new Date(c.assin.vencimento).toLocaleDateString('pt-BR'):'—' },
                        ].map(item => (
                          <div key={item.label} style={{ background:dark?'#231410':'#fff', borderRadius:'8px', padding:'8px' }}>
                            <div style={{ fontSize:'10px', color:textSub }}>{item.label}</div>
                            <div style={{ fontSize:'11px', color:textMain, fontWeight:'600', marginTop:'2px' }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize:'12px', color:textSub, marginBottom:'12px', textAlign:'center', padding:'8px' }}>Sem plano ativo</div>
                  )}

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'12px' }}>
                    {[
                      { label:'CPF', value:c.cpf?`***.${c.cpf.slice(3,6)}.***.${c.cpf.slice(-2)}`:'—' },
                      { label:'Agendamentos', value:`${c.totalConcluidos} concluídos` },
                    ].map(item => (
                      <div key={item.label} style={{ background:cardBg, borderRadius:'8px', padding:'8px', border:`1px solid ${border}` }}>
                        <div style={{ fontSize:'10px', color:textSub }}>{item.label}</div>
                        <div style={{ fontSize:'11px', color:textMain, fontWeight:'600', marginTop:'2px' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* ✅ Fase 3: Ações do gerente */}
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button onClick={() => setConfirmacao({ tipo: c.bloqueado?'desbloquear':'bloquear', cliente: c })}
                      style={{ flex:1, padding:'10px', borderRadius:'10px', border:`1px solid ${c.bloqueado?'rgba(76,175,80,0.4)':'rgba(244,67,54,0.4)'}`, background:c.bloqueado?'rgba(76,175,80,0.1)':'rgba(244,67,54,0.1)', color:c.bloqueado?'#4CAF50':'#F44336', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                      {c.bloqueado ? '🔓 Desbloquear' : '🔒 Bloquear'}
                    </button>
                    <button onClick={() => setConfirmacao({ tipo:'excluir', cliente: c })}
                      style={{ padding:'10px 14px', borderRadius:'10px', border:'1px solid rgba(244,67,54,0.3)', background:'rgba(244,67,54,0.08)', color:'#F44336', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                      🗑
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ✅ Fase 3: Modal de confirmação */}
      {confirmacao && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:dark?'#1A0F0D':'#fff', borderRadius:'20px', padding:'28px 24px', width:'100%', maxWidth:'340px', textAlign:'center', border:`1px solid ${border}` }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>
              {confirmacao.tipo==='excluir'?'🗑️':confirmacao.tipo==='bloquear'?'🔒':'🔓'}
            </div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'17px', color:textMain, marginBottom:'8px' }}>
              {confirmacao.tipo==='excluir'?'Excluir cliente?':confirmacao.tipo==='bloquear'?'Bloquear cliente?':'Desbloquear cliente?'}
            </div>
            <div style={{ fontSize:'14px', color:'#E8C96A', fontWeight:'700', marginBottom:'6px' }}>{confirmacao.cliente.nome}</div>
            <div style={{ fontSize:'12px', color:textSub, marginBottom:'20px' }}>
              {confirmacao.tipo==='excluir'
                ? 'O cliente será removido da lista. Agendamentos anteriores são mantidos.'
                : confirmacao.tipo==='bloquear'
                ? 'O cliente não conseguirá fazer novos agendamentos.'
                : 'O cliente voltará a poder fazer agendamentos normalmente.'}
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setConfirmacao(null)} style={{ flex:1, padding:'12px', borderRadius:'12px', border:`1px solid ${border}`, background:dark?'#231410':'#f5efe6', color:textSub, cursor:'pointer', fontWeight:'600' }}>Cancelar</button>
              <button onClick={() => confirmacao.tipo==='excluir'?excluirCliente(confirmacao.cliente):bloquearCliente(confirmacao.cliente)} disabled={salvando}
                style={{ flex:1, padding:'12px', borderRadius:'12px', border:'none', background:confirmacao.tipo==='desbloquear'?'linear-gradient(135deg,#2E7D7A,#3A9E9A)':'linear-gradient(135deg,#8B0000,#F44336)', color:'#fff', fontWeight:'700', cursor:'pointer' }}>
                {salvando?'...':confirmacao.tipo==='excluir'?'Excluir':confirmacao.tipo==='bloquear'?'Bloquear':'Desbloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)', background:'#1A0F0D', border:'1px solid #3A2018', color:'#F5EFE6', padding:'12px 24px', borderRadius:'14px', fontSize:'13px', fontWeight:'700', zIndex:9999, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
