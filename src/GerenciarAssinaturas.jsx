// GerenciarAssinaturas.jsx — Flyguer BarberShop
// Passo 12 — Recepção: vincula cliente a plano + dá baixa manual em cortes

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

export default function GerenciarAssinaturas({ onBack, dark }) {
  const s = getStyles(dark);

  const [aba, setAba]                   = React.useState('assinaturas'); // 'assinaturas' | 'vincular'
  const [assinaturas, setAssinaturas]   = React.useState([]);
  const [planos, setPlanos]             = React.useState([]);
  const [loading, setLoading]           = React.useState(true);
  const [salvando, setSalvando]         = React.useState(false);
  const [erro, setErro]                 = React.useState('');
  const [sucesso, setSucesso]           = React.useState('');
  const [busca, setBusca]               = React.useState('');

  // form vincular
  const [clienteNome, setClienteNome]   = React.useState('');
  const [clienteTel, setClienteTel]     = React.useState('');
  const [planoSel, setPlanoSel]         = React.useState('');
  const [clienteId, setClienteId]       = React.useState('');

  // modal baixa manual
  const [modalBaixa, setModalBaixa]     = React.useState(null);

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  // ── Carregar dados ──
  React.useEffect(() => {
    let unsubA, unsubP;
    (async () => {
      const { collection, onSnapshot, query, where, orderBy } = await import('firebase/firestore');

      // assinaturas ativas
      const qa = query(collection(db, 'assinaturas'), where('status', '==', 'ativa'), orderBy('assinadoEm', 'desc'));
      unsubA = onSnapshot(qa, snap => {
        setAssinaturas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });

      // planos
      const qp = query(collection(db, 'planos'), where('ativo', '==', true), orderBy('preco', 'asc'));
      unsubP = onSnapshot(qp, snap => {
        setPlanos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    })();
    return () => { unsubA && unsubA(); unsubP && unsubP(); };
  }, []);

  // ── Buscar cliente pelo telefone no Firestore ──
  async function buscarCliente() {
    if (!clienteTel.trim()) { setErro('Informe o telefone do cliente.'); return; }
    setErro('');
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'clientes'), where('telefone', '==', clienteTel.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setErro('Cliente não encontrado. Verifique o telefone.');
        setClienteNome('');
        setClienteId('');
      } else {
        const d = snap.docs[0];
        setClienteNome(d.data().nome || '');
        setClienteId(d.id);
        setErro('');
      }
    } catch (e) { setErro('Erro ao buscar: ' + e.message); }
  }

  // ── Vincular cliente ao plano ──
  async function vincular() {
    if (!clienteId)  { setErro('Busque o cliente pelo telefone primeiro.'); return; }
    if (!planoSel)   { setErro('Selecione um plano.'); return; }
    setSalvando(true);
    setErro('');
    try {
      const { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } = await import('firebase/firestore');

      // cancelar assinatura anterior
      const qa = query(collection(db, 'assinaturas'), where('clienteId', '==', clienteId), where('status', '==', 'ativa'));
      const snap = await getDocs(qa);
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'assinaturas', d.id), { status: 'cancelada', canceladaEm: serverTimestamp() });
      }

      const plano = planos.find(p => p.id === planoSel);
      const venc  = new Date(); venc.setMonth(venc.getMonth() + 1);

      await addDoc(collection(db, 'assinaturas'), {
        clienteId,
        clienteNome:     clienteNome,
        clienteTelefone: clienteTel.trim(),
        planoId:         plano.id,
        planoNome:       plano.nome,
        planoIcone:      plano.icone || '💈',
        planoCor:        plano.cor   || '#C9A84C',
        preco:           plano.preco,
        cortesInclusos:  plano.cortesInclusos,
        cortesUsados:    0,
        status:          'ativa',
        assinadoEm:      serverTimestamp(),
        vencimento:      venc.toISOString(),
        vinculadoPor:    'recepcao',
        renovacaoAuto:   false,
      });

      setSucesso(`✅ ${clienteNome} vinculado ao Plano ${plano.nome}!`);
      setClienteNome(''); setClienteTel(''); setClienteId(''); setPlanoSel('');
      setTimeout(() => setSucesso(''), 4000);
      setAba('assinaturas');
    } catch (e) { setErro('Erro ao vincular: ' + e.message); }
    setSalvando(false);
  }

  // ── Dar baixa manual (1 corte) ──
  async function darBaixa(assinatura) {
    if ((assinatura.cortesUsados || 0) >= assinatura.cortesInclusos) {
      setErro('Cliente não possui cortes disponíveis este mês.'); return;
    }
    setSalvando(true);
    try {
      const { doc, updateDoc, increment } = await import('firebase/firestore');
      await updateDoc(doc(db, 'assinaturas', assinatura.id), {
        cortesUsados: increment(1),
      });
      setModalBaixa(null);
      setSucesso(`✅ Corte registrado para ${assinatura.clienteNome}!`);
      setTimeout(() => setSucesso(''), 3000);
    } catch (e) { setErro('Erro: ' + e.message); }
    setSalvando(false);
  }

  // ── Cancelar assinatura ──
  async function cancelar(assinatura) {
    setSalvando(true);
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'assinaturas', assinatura.id), {
        status: 'cancelada',
        canceladaEm: serverTimestamp(),
      });
    } catch (e) { setErro('Erro: ' + e.message); }
    setSalvando(false);
  }

  const assinaturasFiltradas = assinaturas.filter(a =>
    !busca || a.clienteNome?.toLowerCase().includes(busca.toLowerCase()) || a.clienteTelefone?.includes(busca)
  );

  return (
    <div style={{ ...s.app, paddingBottom: '80px' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#5C2218,#8B3A2A)', padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#F5EFE6', cursor: 'pointer', fontSize: '14px' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: '#F5EFE6', fontWeight: '700' }}>Assinaturas</div>
          <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>Gerenciar planos dos clientes</div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: '6px', paddingBottom: '0' }}>
          {[{ id: 'assinaturas', label: '📋 Lista' }, { id: 'vincular', label: '➕ Vincular' }].map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              style={{ background: aba === a.id ? '#C9A84C' : 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px 8px 0 0', padding: '6px 12px', color: aba === a.id ? '#1A0F0D' : '#F5EFE6', fontSize: '12px', cursor: 'pointer', fontWeight: aba === a.id ? '700' : '400' }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px' }}>

        {/* Sucesso global */}
        {sucesso && (
          <div style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', fontSize: '13px', color: '#4CAF50', fontWeight: '600' }}>{sucesso}</div>
        )}

        {/* ── ABA: LISTA ── */}
        {aba === 'assinaturas' && (
          <>
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="🔍 Buscar por nome ou telefone..."
              style={{ ...s.input, width: '100%', boxSizing: 'border-box', marginBottom: '14px' }} />

            <div style={{ fontSize: '11px', color: textSub, marginBottom: '10px' }}>{assinaturasFiltradas.length} assinatura{assinaturasFiltradas.length !== 1 ? 's' : ''} ativa{assinaturasFiltradas.length !== 1 ? 's' : ''}</div>

            {loading && <div style={{ textAlign: 'center', padding: '40px', color: textSub }}>Carregando...</div>}

            {!loading && assinaturasFiltradas.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: textSub }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                <div>Nenhuma assinatura ativa encontrada.</div>
                <button onClick={() => setAba('vincular')} style={{ marginTop: '12px', background: '#8B3A2A', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#F5EFE6', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>+ Vincular cliente</button>
              </div>
            )}

            {assinaturasFiltradas.map(a => {
              const restantes = Math.max(0, a.cortesInclusos - (a.cortesUsados || 0));
              const pct = Math.min(100, ((a.cortesUsados || 0) / a.cortesInclusos) * 100);
              return (
                <div key={a.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', marginBottom: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '3px', background: a.planoCor || '#C9A84C' }} />
                  <div style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ ...s.avatar, width: '40px', height: '40px', fontSize: '16px', flexShrink: 0 }}>{(a.clienteNome || '?')[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: textMain }}>{a.clienteNome}</div>
                        <div style={{ fontSize: '11px', color: textSub }}>{a.clienteTelefone}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: a.planoCor || '#C9A84C', fontWeight: '700' }}>{a.planoIcone} {a.planoNome}</div>
                        <div style={{ fontSize: '10px', color: textSub }}>R$ {Number(a.preco).toFixed(2)}/mês</div>
                      </div>
                    </div>

                    {/* Barra de cortes */}
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: textSub, marginBottom: '4px' }}>
                        <span>Cortes usados</span>
                        <span style={{ fontWeight: '700', color: textMain }}>{a.cortesUsados || 0} / {a.cortesInclusos}</span>
                      </div>
                      <div style={{ height: '6px', background: dark ? '#2E1A14' : '#f5efe6', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: restantes === 0 ? '#F44336' : (a.planoCor || '#C9A84C'), borderRadius: '3px' }} />
                      </div>
                      <div style={{ fontSize: '10px', color: restantes === 0 ? '#F44336' : '#4CAF50', marginTop: '3px' }}>
                        {restantes === 0 ? '⚠️ Sem cortes' : `✂️ ${restantes} restante${restantes !== 1 ? 's' : ''}`}
                      </div>
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setModalBaixa(a); setErro(''); }}
                        disabled={restantes === 0}
                        style={{ flex: 1, background: restantes === 0 ? '#2E1A14' : 'linear-gradient(135deg,#5C2218,#8B3A2A)', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', color: restantes === 0 ? '#555' : '#F5EFE6', cursor: restantes === 0 ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                        ✂️ Dar Baixa
                      </button>
                      <button onClick={() => cancelar(a)} disabled={salvando}
                        style={{ background: dark ? '#2E1A14' : '#f5efe6', border: '1px solid #8B3A2A', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#F44336', cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── ABA: VINCULAR ── */}
        {aba === 'vincular' && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontWeight: '700', fontSize: '15px', color: textMain, marginBottom: '16px' }}>➕ Vincular cliente a plano</div>

            {/* Busca por telefone */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Telefone do cliente</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={clienteTel} onChange={e => setClienteTel(e.target.value)}
                  placeholder="(11) 99999-9999"
                  style={{ ...s.input, flex: 1 }} />
                <button onClick={buscarCliente}
                  style={{ background: '#8B3A2A', border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#F5EFE6', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                  Buscar
                </button>
              </div>
            </div>

            {/* Nome encontrado */}
            {clienteNome && (
              <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid #4CAF50', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#4CAF50' }}>
                ✅ Cliente encontrado: <strong>{clienteNome}</strong>
              </div>
            )}

            {/* Seleção de plano */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: textSub, fontWeight: '600', display: 'block', marginBottom: '6px' }}>Selecionar plano</label>
              {planos.length === 0 ? (
                <div style={{ fontSize: '12px', color: textSub, padding: '10px', background: dark ? '#2E1A14' : '#f5efe6', borderRadius: '10px' }}>Nenhum plano ativo cadastrado.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {planos.map(p => (
                    <div key={p.id} onClick={() => setPlanoSel(p.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: planoSel === p.id ? (dark ? '#3A2018' : '#fdf0dc') : (dark ? '#2E1A14' : '#f5efe6'), border: `1px solid ${planoSel === p.id ? (p.cor || '#C9A84C') : border}`, borderRadius: '10px', cursor: 'pointer' }}>
                      <span style={{ fontSize: '24px' }}>{p.icone}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: textMain }}>{p.nome}</div>
                        <div style={{ fontSize: '11px', color: textSub }}>{p.cortesInclusos}x cortes — R$ {Number(p.preco).toFixed(2)}/mês</div>
                      </div>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${planoSel === p.id ? (p.cor || '#C9A84C') : border}`, background: planoSel === p.id ? (p.cor || '#C9A84C') : 'transparent', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {erro && (
              <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #F44336', borderRadius: '10px', padding: '10px', fontSize: '12px', color: '#F44336', marginBottom: '12px' }}>{erro}</div>
            )}

            <button onClick={vincular} disabled={salvando || !clienteId || !planoSel}
              style={{ width: '100%', background: clienteId && planoSel ? 'linear-gradient(135deg,#5C2218,#8B3A2A)' : '#2E1A14', border: 'none', borderRadius: '12px', padding: '14px', color: clienteId && planoSel ? '#F5EFE6' : '#555', fontWeight: '700', fontSize: '14px', cursor: clienteId && planoSel ? 'pointer' : 'not-allowed' }}>
              {salvando ? 'Vinculando...' : '✅ Confirmar Vínculo'}
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL BAIXA MANUAL ── */}
      {modalBaixa && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: dark ? '#1A0F0D' : '#fff', borderRadius: '20px', padding: '28px 24px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✂️</div>
            <div style={{ fontWeight: '700', fontSize: '16px', color: textMain, marginBottom: '4px' }}>Registrar corte</div>
            <div style={{ fontSize: '13px', color: textSub, marginBottom: '4px' }}>{modalBaixa.clienteNome}</div>
            <div style={{ fontSize: '12px', color: modalBaixa.planoCor || '#C9A84C', marginBottom: '16px' }}>{modalBaixa.planoIcone} Plano {modalBaixa.planoNome}</div>

            <div style={{ background: dark ? '#231410' : '#f5efe6', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: textSub }}>Cortes disponíveis</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: textMain }}>{Math.max(0, modalBaixa.cortesInclusos - (modalBaixa.cortesUsados || 0))}</div>
              <div style={{ fontSize: '11px', color: textSub }}>de {modalBaixa.cortesInclusos} inclusos no plano</div>
            </div>

            <div style={{ fontSize: '12px', color: textSub, marginBottom: '16px' }}>
              Confirma o registro de <strong>1 corte</strong> para este cliente?
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalBaixa(null)}
                style={{ flex: 1, background: dark ? '#2E1A14' : '#f5efe6', border: `1px solid ${border}`, borderRadius: '10px', padding: '12px', fontSize: '13px', color: textMain, cursor: 'pointer', fontWeight: '600' }}>
                Cancelar
              </button>
              <button onClick={() => darBaixa(modalBaixa)} disabled={salvando}
                style={{ flex: 1, background: 'linear-gradient(135deg,#5C2218,#8B3A2A)', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '13px', color: '#F5EFE6', cursor: 'pointer', fontWeight: '700' }}>
                {salvando ? 'Registrando...' : '✅ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
