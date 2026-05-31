// ListaClientes.jsx — Flyguer BarberShop
// ✅ Gerente vê lista completa de clientes + assinaturas

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

  const cardBg  = dark ? '#231410' : '#fff';
  const border  = dark ? '#3A2018' : '#e5d5cc';
  const textMain= dark ? '#F5EFE6' : '#1A0F0D';
  const textSub = dark ? '#9A8880' : '#7A6860';

  React.useEffect(() => {
    (async () => {
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');

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

  // Enriquecer cada cliente com sua assinatura e stats
  const clientesEnriquecidos = clientes.map(c => {
    const assinAtiva    = assinaturas.find(a => a.clienteId === c.cpf && a.status === 'ativa');
    const assinPendente = assinaturas.find(a => a.clienteId === c.cpf && a.status === 'pendente_pagamento');
    const assin = assinAtiva || assinPendente || null;
    const agsCliente = agendamentos.filter(a => a.clienteCpf === c.cpf);
    const concluidos = agsCliente.filter(a => a.status === 'concluido');
    const totalGasto = concluidos.reduce((acc, a) => acc + (a.valorFinal || a.valor || 0), 0);
    return { ...c, assin, totalAgendamentos: agsCliente.length, totalConcluidos: concluidos.length, totalGasto };
  });

  const filtrados = clientesEnriquecidos.filter(c =>
    !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca) || c.cpf?.includes(busca)
  );

  // Badge status assinatura
  function BadgeAssin({ status }) {
    const cfg = {
      ativa:              { label: '✅ Plano ativo',       cor: '#4CAF50' },
      pendente_pagamento: { label: '⏳ Pgto pendente',     cor: '#FFC107' },
    };
    const c = cfg[status];
    if (!c) return null;
    return <span style={{ fontSize: '10px', color: c.cor, fontWeight: '700', background: c.cor + '22', borderRadius: '6px', padding: '2px 8px' }}>{c.label}</span>;
  }

  return (
    <div style={{ ...s.app, paddingBottom: '60px' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#5C2218,#8B3A2A)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: '#F5EFE6', cursor: 'pointer', fontSize: '14px' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '17px', fontWeight: '700', color: '#F5EFE6' }}>👥 Clientes</div>
          <div style={{ fontSize: '11px', color: 'rgba(245,239,230,0.6)' }}>{clientes.length} cadastrados</div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Busca */}
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar por nome, telefone ou CPF..."
          style={{ ...s.input, width: '100%', boxSizing: 'border-box', marginBottom: '14px' }}
        />

        {/* Stats gerais */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: 'Total clientes', value: clientes.length,                                           color: '#E8C96A' },
            { label: 'Com plano ativo', value: assinaturas.filter(a => a.status === 'ativa').length,     color: '#4CAF50' },
            { label: 'Pgto pendente',   value: assinaturas.filter(a => a.status === 'pendente_pagamento').length, color: '#FFC107' },
          ].map(item => (
            <div key={item.label} style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '10px', color: textSub, marginTop: '2px' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', color: textSub }}>⏳ Carregando...</div>}

        {!loading && filtrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: textSub }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
            <div>Nenhum cliente encontrado.</div>
          </div>
        )}

        {/* Lista de clientes */}
        {filtrados.map(c => {
          const aberto = expandido === c.id;
          return (
            <div key={c.id} style={{ background: cardBg, border: '1px solid ' + (c.assin ? (c.assin.planoCor || '#C9A84C') + '66' : border), borderRadius: '14px', marginBottom: '10px', overflow: 'hidden' }}>
              {/* Linha topo colorida se tem plano */}
              {c.assin && <div style={{ height: '3px', background: c.assin.planoCor || '#C9A84C' }} />}

              {/* Card principal */}
              <div onClick={() => setExpandido(aberto ? null : c.id)}
                style={{ padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ ...s.avatar, width: '44px', height: '44px', fontSize: '18px', overflow: 'hidden', flexShrink: 0 }}>
                  {c.foto ? <img src={c.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.nome||'?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: textMain }}>{c.nome}</div>
                  <div style={{ fontSize: '11px', color: textSub, marginTop: '2px' }}>📞 {c.telefone || '—'}</div>
                  {c.assin && <BadgeAssin status={c.assin.status} />}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', color: '#E8C96A', fontWeight: '700' }}>R$ {c.totalGasto.toFixed(0)}</div>
                  <div style={{ fontSize: '10px', color: textSub }}>{c.totalConcluidos} cortes</div>
                  <div style={{ fontSize: '12px', color: textSub, marginTop: '4px' }}>{aberto ? '▲' : '▼'}</div>
                </div>
              </div>

              {/* Detalhes expandidos */}
              {aberto && (
                <div style={{ borderTop: '1px solid ' + border, padding: '14px', background: dark ? '#1A0F0D' : '#f9f5f0' }}>

                  {/* Assinatura */}
                  {c.assin ? (
                    <div style={{ background: cardBg, border: '1px solid ' + (c.assin.planoCor || '#C9A84C') + '66', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{c.assin.planoIcone}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: textMain }}>Plano {c.assin.planoNome}</div>
                          <BadgeAssin status={c.assin.status} />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: c.assin.planoCor || '#C9A84C' }}>
                          R$ {Number(c.assin.preco).toFixed(2)}/mês
                        </div>
                      </div>

                      {c.assin.status === 'pendente_pagamento' && (
                        <div style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: '8px', padding: '8px 10px', marginBottom: '8px', fontSize: '11px', color: '#FFC107' }}>
                          ⚠️ Aguardando confirmação de pagamento na barbearia.
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {[
                          { label: 'Data pgto', value: c.assin.dataPagamento ? formatarData(c.assin.dataPagamento) : '—' },
                          { label: 'Vencimento', value: c.assin.vencimento ? new Date(c.assin.vencimento).toLocaleDateString('pt-BR') : '—' },
                          { label: 'Solicitado em', value: c.assin.assinadoEm?.toDate ? c.assin.assinadoEm.toDate().toLocaleDateString('pt-BR') : '—' },
                          { label: 'Serviços', value: (c.assin.servicosInclusos || []).join(', ') || '—' },
                        ].map(item => (
                          <div key={item.label} style={{ background: dark ? '#231410' : '#fff', borderRadius: '8px', padding: '8px' }}>
                            <div style={{ fontSize: '10px', color: textSub }}>{item.label}</div>
                            <div style={{ fontSize: '11px', color: textMain, fontWeight: '600', marginTop: '2px' }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: textSub, marginBottom: '12px', textAlign: 'center', padding: '8px' }}>
                      Sem plano ativo
                    </div>
                  )}

                  {/* Info do cliente */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {[
                      { label: 'CPF', value: c.cpf ? `***.${c.cpf.slice(3,6)}.***.${c.cpf.slice(-2)}` : '—' },
                      { label: 'Preferência', value: c.preferencia || '—' },
                      { label: 'Membro desde', value: c.dataCadastro?.toDate ? c.dataCadastro.toDate().toLocaleDateString('pt-BR') : '—' },
                      { label: 'Agendamentos', value: c.totalAgendamentos + ' total / ' + c.totalConcluidos + ' concluídos' },
                    ].map(item => (
                      <div key={item.label} style={{ background: cardBg, borderRadius: '8px', padding: '8px', border: '1px solid ' + border }}>
                        <div style={{ fontSize: '10px', color: textSub }}>{item.label}</div>
                        <div style={{ fontSize: '11px', color: textMain, fontWeight: '600', marginTop: '2px' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
