// AssinaturaPlano.jsx — Flyguer BarberShop
// Passo 12 — Cliente visualiza e assina plano mensal

import React from 'react';
import { db } from './firebase';
import { getStyles } from './getStyles';

export default function AssinaturaPlano({ cliente, onBack, dark }) {
  const s = getStyles(dark);
  const [planos, setPlanos]         = React.useState([]);
  const [assinatura, setAssinatura] = React.useState(null); // assinatura ativa do cliente
  const [loading, setLoading]       = React.useState(true);
  const [confirmando, setConfirmando] = React.useState(null); // plano selecionado p/ confirmar
  const [salvando, setSalvando]     = React.useState(false);
  const [sucesso, setSucesso]       = React.useState(false);
  const [erro, setErro]             = React.useState('');

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  // ── Carregar planos ativos + assinatura do cliente ──
  React.useEffect(() => {
    let unsubPlanos, unsubAssin;
    (async () => {
      const { collection, onSnapshot, query, where, orderBy } = await import('firebase/firestore');

      // planos ativos
      const qp = query(collection(db, 'planos'), where('ativo', '==', true), orderBy('preco', 'asc'));
      unsubPlanos = onSnapshot(qp, snap => {
        setPlanos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });

      // assinatura ativa do cliente
      if (cliente?.uid) {
        const qa = query(
          collection(db, 'assinaturas'),
          where('clienteId', '==', cliente.uid),
          where('status', '==', 'ativa')
        );
        unsubAssin = onSnapshot(qa, snap => {
          if (!snap.empty) setAssinatura({ id: snap.docs[0].id, ...snap.docs[0].data() });
          else setAssinatura(null);
        });
      }
    })();
    return () => { unsubPlanos && unsubPlanos(); unsubAssin && unsubAssin(); };
  }, [cliente]);

  // ── Assinar plano ──
  async function assinar() {
    if (!confirmando) return;
    setSalvando(true);
    setErro('');
    try {
      const { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } = await import('firebase/firestore');

      // cancelar assinatura anterior se existir
      if (assinatura) {
        await updateDoc(doc(db, 'assinaturas', assinatura.id), {
          status: 'cancelada',
          canceladaEm: serverTimestamp(),
        });
      }

      const agora  = new Date();
      const vencimento = new Date(agora);
      vencimento.setMonth(vencimento.getMonth() + 1);

      await addDoc(collection(db, 'assinaturas'), {
        clienteId:       cliente.uid,
        clienteNome:     cliente.nome,
        clienteTelefone: cliente.telefone || '',
        planoId:         confirmando.id,
        planoNome:       confirmando.nome,
        planoIcone:      confirmando.icone || '💈',
        planoCor:        confirmando.cor   || '#C9A84C',
        preco:           confirmando.preco,
        cortesInclusos:  confirmando.cortesInclusos,
        cortesUsados:    0,
        status:          'ativa',
        assinadoEm:      serverTimestamp(),
        vencimento:      vencimento.toISOString(),
        renovacaoAuto:   false,
      });

      setConfirmando(null);
      setSucesso(true);
      setTimeout(() => setSucesso(false), 4000);
    } catch (e) { setErro('Erro ao assinar: ' + e.message); }
    setSalvando(false);
  }

  // ── Cancelar assinatura ──
  async function cancelarAssinatura() {
    if (!assinatura) return;
    setSalvando(true);
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'assinaturas', assinatura.id), {
        status: 'cancelada',
        canceladaEm: serverTimestamp(),
      });
    } catch (e) { setErro('Erro ao cancelar: ' + e.message); }
    setSalvando(false);
  }

  const cortesRestantes = assinatura
    ? Math.max(0, (assinatura.cortesInclusos || 0) - (assinatura.cortesUsados || 0))
    : 0;

  return (
    <div style={{ ...s.app, paddingBottom: '80px' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#1A0F0D,#2E7D7A)', padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#F5EFE6', cursor: 'pointer', fontSize: '14px' }}>←</button>
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: '#F5EFE6', fontWeight: '700' }}>Planos Mensais</div>
          <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>Assine e economize nos seus cortes</div>
        </div>
      </div>

      <div style={{ padding: '20px' }}>

        {/* SUCESSO */}
        {sucesso && (
          <div style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4CAF50', borderRadius: '14px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <div style={{ fontWeight: '700', color: '#4CAF50', fontSize: '14px' }}>Plano assinado com sucesso!</div>
            <div style={{ fontSize: '12px', color: textSub, marginTop: '4px' }}>Seus cortes já estão disponíveis. Bom estilo!</div>
          </div>
        )}

        {/* ASSINATURA ATIVA */}
        {assinatura && (
          <div style={{ background: cardBg, border: `2px solid ${assinatura.planoCor || '#C9A84C'}`, borderRadius: '16px', marginBottom: '20px', overflow: 'hidden' }}>
            <div style={{ height: '4px', background: assinatura.planoCor || '#C9A84C' }} />
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '28px' }}>{assinatura.planoIcone}</span>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: textMain }}>Plano {assinatura.planoNome} — Ativo</div>
                  <div style={{ fontSize: '11px', color: '#4CAF50' }}>✅ Assinatura vigente</div>
                </div>
                <div style={{ marginLeft: 'auto', background: 'rgba(76,175,80,0.15)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', color: '#4CAF50', fontWeight: '600' }}>ATIVO</div>
              </div>

              {/* Barra de cortes */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: textSub, marginBottom: '6px' }}>
                  <span>Cortes usados este mês</span>
                  <span style={{ fontWeight: '700', color: textMain }}>{assinatura.cortesUsados || 0} / {assinatura.cortesInclusos}</span>
                </div>
                <div style={{ height: '8px', background: dark ? '#2E1A14' : '#f5efe6', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, ((assinatura.cortesUsados || 0) / assinatura.cortesInclusos) * 100)}%`, background: cortesRestantes === 0 ? '#F44336' : (assinatura.planoCor || '#C9A84C'), borderRadius: '4px', transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: '11px', color: cortesRestantes === 0 ? '#F44336' : '#4CAF50', marginTop: '4px', fontWeight: '600' }}>
                  {cortesRestantes === 0 ? '⚠️ Sem cortes disponíveis este mês' : `✂️ ${cortesRestantes} corte${cortesRestantes !== 1 ? 's' : ''} restante${cortesRestantes !== 1 ? 's' : ''}`}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: textSub, marginBottom: '12px' }}>
                <span>Vencimento</span>
                <span style={{ color: textMain, fontWeight: '600' }}>{assinatura.vencimento ? new Date(assinatura.vencimento).toLocaleDateString('pt-BR') : '—'}</span>
              </div>

              <button onClick={cancelarAssinatura} disabled={salvando}
                style={{ width: '100%', background: 'transparent', border: '1px solid #8B3A2A', borderRadius: '10px', padding: '10px', fontSize: '12px', color: '#F44336', cursor: 'pointer', fontWeight: '600' }}>
                {salvando ? 'Cancelando...' : '✕ Cancelar Assinatura'}
              </button>
            </div>
          </div>
        )}

        {/* LISTA DE PLANOS */}
        <div style={{ fontSize: '11px', color: '#E8C96A', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
          {assinatura ? 'Trocar de plano' : 'Escolha seu plano'}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: textSub }}>Carregando planos...</div>}

        {!loading && planos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: textSub }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💈</div>
            <div>Nenhum plano disponível no momento.</div>
          </div>
        )}

        {planos.map(plano => {
          const ativo = assinatura?.planoId === plano.id;
          return (
            <div key={plano.id} style={{ background: cardBg, border: `${ativo ? '2px' : '1px'} solid ${ativo ? (plano.cor || '#C9A84C') : border}`, borderRadius: '16px', marginBottom: '12px', overflow: 'hidden' }}>
              <div style={{ height: '4px', background: plano.cor || '#C9A84C' }} />
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '32px' }}>{plano.icone || '💈'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '16px', color: textMain }}>{plano.nome}</span>
                      {ativo && <span style={{ fontSize: '10px', background: 'rgba(76,175,80,0.2)', color: '#4CAF50', borderRadius: '6px', padding: '2px 8px', fontWeight: '700' }}>SEU PLANO</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: textSub, marginTop: '2px' }}>{plano.descricao}</div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: textSub }}>por mês</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: plano.cor || '#C9A84C' }}>R$ {Number(plano.preco).toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: textSub }}>cortes</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: textMain }}>{plano.cortesInclusos}x</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: textSub }}>por corte</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#4CAF50' }}>R$ {(plano.preco / plano.cortesInclusos).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
                {!ativo && (
                  <button onClick={() => { setConfirmando(plano); setErro(''); }}
                    style={{ marginTop: '14px', width: '100%', background: `linear-gradient(135deg, ${plano.cor || '#C9A84C'}cc, ${plano.cor || '#C9A84C'})`, border: 'none', borderRadius: '10px', padding: '12px', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                    {assinatura ? '🔄 Trocar para este plano' : '✅ Assinar este plano'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL CONFIRMAR ASSINATURA ── */}
      {confirmando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: dark ? '#1A0F0D' : '#fff', borderRadius: '24px 24px 0 0', padding: '28px 20px 40px', width: '100%', maxWidth: '430px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>{confirmando.icone}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '20px', color: textMain, fontWeight: '700' }}>Plano {confirmando.nome}</div>
              <div style={{ fontSize: '13px', color: textSub, marginTop: '4px' }}>{confirmando.descricao}</div>
            </div>

            <div style={{ background: dark ? '#231410' : '#f5efe6', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: textSub }}>Mensalidade</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: confirmando.cor || '#C9A84C' }}>R$ {Number(confirmando.preco).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: textSub }}>Cortes inclusos</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: textMain }}>{confirmando.cortesInclusos}x por mês</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: textSub }}>Custo por corte</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#4CAF50' }}>R$ {(confirmando.preco / confirmando.cortesInclusos).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: textSub, textAlign: 'center', marginBottom: '16px' }}>
              ⚠️ O pagamento será combinado diretamente com a barbearia.
            </div>

            {erro && (
              <div style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid #F44336', borderRadius: '10px', padding: '10px', fontSize: '12px', color: '#F44336', marginBottom: '12px', textAlign: 'center' }}>{erro}</div>
            )}

            <button onClick={assinar} disabled={salvando}
              style={{ width: '100%', background: 'linear-gradient(135deg,#5C2218,#8B3A2A)', border: 'none', borderRadius: '12px', padding: '14px', color: '#F5EFE6', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginBottom: '10px' }}>
              {salvando ? 'Confirmando...' : `✅ Confirmar — R$ ${Number(confirmando.preco).toFixed(2)}/mês`}
            </button>
            <button onClick={() => { setConfirmando(null); setErro(''); }}
              style={{ width: '100%', background: 'transparent', border: `1px solid ${border}`, borderRadius: '12px', padding: '12px', color: textSub, fontSize: '13px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
